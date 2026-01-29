/**
 * SQL Executor
 * Executes validated AST against data tables
 */

import { tokenize } from './tokenizer.js';
import { parse } from './parser.js';
import { validate } from './validator.js';
import { schema } from '../data/schema.js';

export class Executor {
  constructor(ast, data, validator, schema) {
    this.ast = ast;
    this.data = data;
    this.validator = validator;
    this.schema = schema;
  }

  execute() {
    // Route to appropriate execution method based on statement type
    if (this.ast.type === 'Query') {
      return this.executeQuery();
    } else if (this.ast.type === 'CreateTable') {
      return this.executeCreateTable();
    } else if (this.ast.type === 'AlterTable') {
      return this.executeAlterTable();
    } else if (this.ast.type === 'DropTable') {
      return this.executeDropTable();
    } else if (this.ast.type === 'Insert') {
      return this.executeInsert();
    } else if (this.ast.type === 'Update') {
      return this.executeUpdate();
    } else if (this.ast.type === 'Delete') {
      return this.executeDelete();
    } else {
      throw new Error(`Unknown statement type: ${this.ast.type}`);
    }
  }

  executeQuery() {
    // Step 1: Build initial rowset from FROM table
    let rowset = this.buildFromRowset();

    // Step 2: Apply JOIN if present
    if (this.ast.join) {
      rowset = this.applyJoin(rowset);
    }

    // Step 3: Apply WHERE filter
    if (this.ast.where) {
      rowset = this.applyWhere(rowset);
    }

    // Step 4: Check if query has aggregates
    const hasAggregates = this.ast.select.items.some(
      item => item.type === 'AggregateFunction'
    );

    // Step 5: Apply GROUP BY if present, or create single group for aggregates without GROUP BY
    let groupedData = null;
    if (this.ast.groupBy) {
      groupedData = this.applyGroupBy(rowset);
    } else if (hasAggregates) {
      // Aggregates without GROUP BY - treat entire rowset as one group
      groupedData = new Map();
      groupedData.set('_all', {
        rows: rowset,
        firstRow: rowset[0] || {},
      });
    }

    // Step 6: Apply SELECT projection
    const { columns, rows } = groupedData 
      ? this.applySelectWithGroupBy(groupedData)
      : this.applySelect(rowset);

    // Step 7: Apply ORDER BY
    let orderedRows = rows;
    if (this.ast.orderBy) {
      orderedRows = this.applyOrderBy(rows, columns, rowset);
    }

    // Step 8: Apply LIMIT
    let finalRows = orderedRows;
    if (this.ast.limit) {
      finalRows = orderedRows.slice(0, this.ast.limit.value);
    }

    return {
      columns,
      rows: finalRows,
      meta: {
        rowCount: finalRows.length,
        warnings: [],
        steps: [],
      },
    };
  }

  buildFromRowset() {
    const tableName = this.ast.from.name;
    const tableData = this.data[tableName] || [];
    
    return tableData.map(row => ({
      [tableName]: { ...row },
    }));
  }

  applyJoin(leftRowset) {
    const rightTableName = this.ast.join.table;
    const rightTableData = this.data[rightTableName] || [];
    const joinCondition = this.ast.join.on;

    const result = [];

    for (const leftRow of leftRowset) {
      for (const rightRow of rightTableData) {
        // Create merged combined row
        const combinedRow = {
          ...leftRow,
          [rightTableName]: { ...rightRow },
        };

        // Evaluate join condition
        const leftValue = this.evalOperand(joinCondition.left, combinedRow);
        const rightValue = this.evalOperand(joinCondition.right, combinedRow);
        const operator = joinCondition.operator || '=';

        if (this.compareValues(leftValue, rightValue, operator)) {
          result.push(combinedRow);
        }
      }
    }

    return result;
  }

  applyWhere(rowset) {
    return rowset.filter(row => {
      // All comparisons must be true (AND logic)
      for (const comparison of this.ast.where.and) {
        const leftValue = this.evalOperand(comparison.left, row);
        const rightValue = this.evalOperand(comparison.right, row);
        const operator = comparison.operator || '=';

        if (!this.compareValues(leftValue, rightValue, operator)) {
          return false;
        }
      }
      return true;
    });
  }

  applyGroupBy(rowset) {
    // Group rows by GROUP BY columns
    const groups = new Map();

    for (const row of rowset) {
      // Build group key from GROUP BY columns
      const keyParts = this.ast.groupBy.columns.map(colRef => {
        const tableName = colRef.table || colRef.resolvedTable;
        return String(row[tableName][colRef.column]);
      });
      const groupKey = keyParts.join('|');

      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          rows: [],
          firstRow: row, // Keep first row for column values
        });
      }

      groups.get(groupKey).rows.push(row);
    }

    return groups;
  }

  applySelectWithGroupBy(groupedData) {
    // Build columns and rows from grouped data
    const columns = [];
    const rows = [];

    // Determine column names and what to compute
    for (const item of this.ast.select.items) {
      if (item.type === 'ColumnRef') {
        // Check if there's an alias
        if (item.alias) {
          columns.push(item.alias);
        } else {
          const tableName = item.table || item.resolvedTable;
          if (this.validator.tablesInScope.length > 1 && !item.table) {
            columns.push(`${tableName}.${item.column}`);
          } else if (item.table) {
            columns.push(`${item.table}.${item.column}`);
          } else {
            columns.push(item.column);
          }
        }
      } else if (item.type === 'AggregateFunction') {
        // Check if there's an alias
        if (item.alias) {
          columns.push(item.alias);
        } else {
          // Build aggregate column name
          if (item.argument.type === 'Star') {
            columns.push(`${item.function}(*)`);
          } else {
            const argCol = item.argument.column;
            columns.push(`${item.function}(${argCol})`);
          }
        }
      }
    }

    // Build rows from each group
    for (const [groupKey, groupData] of groupedData) {
      const row = [];

      for (const item of this.ast.select.items) {
        if (item.type === 'ColumnRef') {
          // Get column value from first row in group
          const tableName = item.table || item.resolvedTable;
          row.push(groupData.firstRow[tableName][item.column]);
        } else if (item.type === 'AggregateFunction') {
          // Compute aggregate
          const value = this.computeAggregate(item, groupData.rows);
          row.push(value);
        }
      }

      rows.push(row);
    }

    return { columns, rows };
  }

  computeAggregate(aggFunc, rows) {
    const funcName = aggFunc.function;
    
    if (funcName === 'COUNT') {
      if (aggFunc.argument.type === 'Star') {
        // COUNT(*) - count all rows
        return rows.length;
      } else {
        // COUNT(column) - count non-null values
        const colRef = aggFunc.argument;
        const tableName = colRef.table || colRef.resolvedTable;
        let count = 0;
        for (const row of rows) {
          const value = row[tableName][colRef.column];
          if (value !== null && value !== undefined) {
            count++;
          }
        }
        return count;
      }
    }
    
    // For SUM, AVG, MIN, MAX - need to extract values from the column
    const colRef = aggFunc.argument;
    const tableName = colRef.table || colRef.resolvedTable;
    const values = [];
    
    for (const row of rows) {
      const value = row[tableName][colRef.column];
      if (value !== null && value !== undefined && typeof value === 'number') {
        values.push(value);
      }
    }
    
    if (values.length === 0) {
      return null; // No valid values
    }
    
    switch (funcName) {
      case 'SUM':
        return values.reduce((sum, val) => sum + val, 0);
      
      case 'AVG':
        const sum = values.reduce((s, val) => s + val, 0);
        return Math.round((sum / values.length) * 100) / 100; // Round to 2 decimal places
      
      case 'MIN':
        return Math.min(...values);
      
      case 'MAX':
        return Math.max(...values);
      
      default:
        return 0;
    }
  }

  applySelect(rowset) {
    if (this.ast.select.star) {
      // SELECT *
      const starColumns = this.validator.getStarColumns();
      const columns = starColumns.map(c => c.displayName);
      
      const rows = rowset.map(combinedRow => {
        return starColumns.map(c => combinedRow[c.table][c.column]);
      });

      return { columns, rows };
    } else {
      // SELECT specific columns
      const columns = [];
      const columnRefs = this.ast.select.items;

      // Build display names for columns
      for (const colRef of columnRefs) {
        // Check if there's an alias
        if (colRef.alias) {
          columns.push(colRef.alias);
        } else {
          const tableName = colRef.table || colRef.resolvedTable;
          if (this.validator.tablesInScope.length > 1 && !colRef.table) {
            // For unqualified columns in multi-table query, show table.column if helpful
            columns.push(`${tableName}.${colRef.column}`);
          } else if (colRef.table) {
            columns.push(`${colRef.table}.${colRef.column}`);
          } else {
            columns.push(colRef.column);
          }
        }
      }

      const rows = rowset.map(combinedRow => {
        return columnRefs.map(colRef => {
          const tableName = colRef.table || colRef.resolvedTable;
          return combinedRow[tableName][colRef.column];
        });
      });

      return { columns, rows };
    }
  }

  applyOrderBy(rows, columns, originalRowset) {
    const orderCol = this.ast.orderBy.column;
    const direction = this.ast.orderBy.direction;
    const tableName = orderCol.table || orderCol.resolvedTable;

    // Find the column index in the output
    const colName = orderCol.table 
      ? `${orderCol.table}.${orderCol.column}`
      : orderCol.column;
    
    let colIndex = columns.findIndex(c => c === colName);
    
    // If not found, try alternative formats
    if (colIndex === -1) {
      colIndex = columns.findIndex(c => 
        c === orderCol.column || 
        c === `${tableName}.${orderCol.column}`
      );
    }

    if (colIndex === -1) {
      // This shouldn't happen after validation, but handle gracefully
      return rows;
    }

    const sorted = [...rows].sort((a, b) => {
      const aVal = a[colIndex];
      const bVal = b[colIndex];

      let comparison = 0;
      if (aVal < bVal) comparison = -1;
      else if (aVal > bVal) comparison = 1;

      return direction === 'DESC' ? -comparison : comparison;
    });

    return sorted;
  }

  evalOperand(operand, combinedRow) {
    if (operand.type === 'Literal') {
      return operand.value;
    }

    if (operand.type === 'ColumnRef') {
      const tableName = operand.table || operand.resolvedTable;
      return combinedRow[tableName][operand.column];
    }

    return null;
  }

  compareValues(left, right, operator = '=') {
    // Handle null/undefined
    if (left === null || left === undefined || right === null || right === undefined) {
      return false;
    }

    // Handle LIKE operator
    if (operator === 'LIKE') {
      const pattern = String(right);
      const value = String(left);
      
      // Convert SQL LIKE pattern to regex
      // % matches any sequence of characters
      // Escape special regex characters except %
      const regexPattern = pattern
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')  // Escape regex special chars
        .replace(/%/g, '.*');  // Replace % with .*
      
      const regex = new RegExp(`^${regexPattern}$`, 'i'); // Case-insensitive
      return regex.test(value);
    }

    // Type coercion: if both are numbers or can be numbers, compare as numbers
    const leftNum = Number(left);
    const rightNum = Number(right);
    const useNumeric = !isNaN(leftNum) && !isNaN(rightNum);

    const leftVal = useNumeric ? leftNum : String(left);
    const rightVal = useNumeric ? rightNum : String(right);

    // Apply comparison operator
    switch (operator) {
      case '=':
        return leftVal === rightVal;
      case '!=':
      case '<>':
        return leftVal !== rightVal;
      case '<':
        return leftVal < rightVal;
      case '<=':
        return leftVal <= rightVal;
      case '>':
        return leftVal > rightVal;
      case '>=':
        return leftVal >= rightVal;
      default:
        return false;
    }
  }

  executeCreateTable() {
    const { tableName, columns } = this.ast;
    
    // Check if table already exists
    if (this.schema[tableName] || this.data[tableName]) {
      throw new Error(`Table '${tableName}' already exists`);
    }
    
    // Add to schema
    this.schema[tableName] = {
      columns: columns,
      isUserCreated: true,
    };
    
    // Add empty data array
    this.data[tableName] = [];
    
    return {
      columns: ['Result'],
      rows: [[`Table '${tableName}' created successfully with ${columns.length} column(s)`]],
      meta: {
        rowCount: 0,
        warnings: [],
        modified: true,
      },
    };
  }

  executeAlterTable() {
    const { tableName, columnName, columnType } = this.ast;
    
    // Check if table exists
    if (!this.schema[tableName]) {
      throw new Error(`Table '${tableName}' does not exist`);
    }
    
    // Check if it's a protected table
    const protectedTables = ['students', 'tutor_groups', 'grades'];
    if (protectedTables.includes(tableName)) {
      throw new Error(`Cannot alter protected table '${tableName}'`);
    }
    
    // Check if column already exists
    if (this.schema[tableName].columns.some(col => col.name === columnName)) {
      throw new Error(`Column '${columnName}' already exists in table '${tableName}'`);
    }
    
    // Add column to schema
    this.schema[tableName].columns.push({ name: columnName, type: columnType });
    
    // Add column to existing data rows with null values
    if (this.data[tableName]) {
      for (const row of this.data[tableName]) {
        row[columnName] = null;
      }
    }
    
    return {
      columns: ['Result'],
      rows: [[`Column '${columnName}' added to table '${tableName}'`]],
      meta: {
        rowCount: 0,
        warnings: [],
        modified: true,
      },
    };
  }

  executeDropTable() {
    const { tableName } = this.ast;
    
    // Check if table exists
    if (!this.schema[tableName]) {
      throw new Error(`Table '${tableName}' does not exist`);
    }
    
    // Check if it's a protected table
    const protectedTables = ['students', 'tutor_groups', 'grades'];
    if (protectedTables.includes(tableName)) {
      throw new Error(`Cannot drop protected table '${tableName}'`);
    }
    
    // Remove from schema
    delete this.schema[tableName];
    
    // Remove data
    delete this.data[tableName];
    
    return {
      columns: ['Result'],
      rows: [[`Table '${tableName}' dropped successfully`]],
      meta: {
        rowCount: 0,
        warnings: [],
        modified: true,
      },
    };
  }

  executeInsert() {
    const { tableName, columns, values } = this.ast;
    
    // Check if table exists
    if (!this.schema[tableName]) {
      throw new Error(`Table '${tableName}' does not exist`);
    }
    
    // Check if it's a protected table
    const protectedTables = ['students', 'tutor_groups', 'grades'];
    if (protectedTables.includes(tableName)) {
      throw new Error(`Cannot insert into protected table '${tableName}'`);
    }
    
    // Validate columns exist
    const tableColumns = this.schema[tableName].columns.map(col => col.name);
    for (const col of columns) {
      if (!tableColumns.includes(col)) {
        throw new Error(`Column '${col}' does not exist in table '${tableName}'`);
      }
    }
    
    // Validate value count matches column count
    if (columns.length !== values.length) {
      throw new Error(`Column count (${columns.length}) does not match value count (${values.length})`);
    }
    
    // Build the new row
    const newRow = {};
    for (let i = 0; i < columns.length; i++) {
      newRow[columns[i]] = values[i].value;
    }
    
    // Add null for any missing columns
    for (const col of tableColumns) {
      if (!(col in newRow)) {
        newRow[col] = null;
      }
    }
    
    // Insert the row
    this.data[tableName].push(newRow);
    
    return {
      columns: ['Result'],
      rows: [[`1 row inserted into '${tableName}'`]],
      meta: {
        rowCount: 1,
        warnings: [],
        modified: true,
      },
    };
  }

  executeUpdate() {
    const { tableName, assignments, where } = this.ast;
    
    // Check if table exists
    if (!this.schema[tableName]) {
      throw new Error(`Table '${tableName}' does not exist`);
    }
    
    // Check if it's a protected table
    const protectedTables = ['students', 'tutor_groups', 'grades'];
    if (protectedTables.includes(tableName)) {
      throw new Error(`Cannot update protected table '${tableName}'`);
    }
    
    // Validate columns exist
    const tableColumns = this.schema[tableName].columns.map(col => col.name);
    for (const assignment of assignments) {
      if (!tableColumns.includes(assignment.column)) {
        throw new Error(`Column '${assignment.column}' does not exist in table '${tableName}'`);
      }
    }
    
    // Get rows to update
    let rowsToUpdate = this.data[tableName] || [];
    
    // Apply WHERE filter if present
    if (where) {
      rowsToUpdate = rowsToUpdate.filter(row => {
        // Convert row to combined format for evaluation
        const combinedRow = { [tableName]: row };
        
        for (const comparison of where.and) {
          const leftValue = this.evalOperandForModification(comparison.left, combinedRow, tableName);
          const rightValue = this.evalOperandForModification(comparison.right, combinedRow, tableName);
          const operator = comparison.operator || '=';
          
          if (!this.compareValues(leftValue, rightValue, operator)) {
            return false;
          }
        }
        return true;
      });
    }
    
    // Update the rows
    let updateCount = 0;
    for (const row of rowsToUpdate) {
      for (const assignment of assignments) {
        row[assignment.column] = assignment.value.value;
      }
      updateCount++;
    }
    
    return {
      columns: ['Result'],
      rows: [[`${updateCount} row(s) updated in '${tableName}'`]],
      meta: {
        rowCount: updateCount,
        warnings: [],
        modified: true,
      },
    };
  }

  executeDelete() {
    const { tableName, where } = this.ast;
    
    // Check if table exists
    if (!this.schema[tableName]) {
      throw new Error(`Table '${tableName}' does not exist`);
    }
    
    // Check if it's a protected table
    const protectedTables = ['students', 'tutor_groups', 'grades'];
    if (protectedTables.includes(tableName)) {
      throw new Error(`Cannot delete from protected table '${tableName}'`);
    }
    
    const tableData = this.data[tableName] || [];
    
    if (!where) {
      // Delete all rows
      const deleteCount = tableData.length;
      this.data[tableName] = [];
      return {
        columns: ['Result'],
        rows: [[`${deleteCount} row(s) deleted from '${tableName}'`]],
        meta: {
          rowCount: deleteCount,
          warnings: [],
          modified: true,
        },
      };
    }
    
    // Apply WHERE filter to find rows to keep
    const rowsToKeep = [];
    let deleteCount = 0;
    
    for (const row of tableData) {
      // Convert row to combined format for evaluation
      const combinedRow = { [tableName]: row };
      
      let shouldDelete = true;
      for (const comparison of where.and) {
        const leftValue = this.evalOperandForModification(comparison.left, combinedRow, tableName);
        const rightValue = this.evalOperandForModification(comparison.right, combinedRow, tableName);
        const operator = comparison.operator || '=';
        
        if (!this.compareValues(leftValue, rightValue, operator)) {
          shouldDelete = false;
          break;
        }
      }
      
      if (shouldDelete) {
        deleteCount++;
      } else {
        rowsToKeep.push(row);
      }
    }
    
    this.data[tableName] = rowsToKeep;
    
    return {
      columns: ['Result'],
      rows: [[`${deleteCount} row(s) deleted from '${tableName}'`]],
      meta: {
        rowCount: deleteCount,
        warnings: [],
        modified: true,
      },
    };
  }

  evalOperandForModification(operand, combinedRow, tableName) {
    if (operand.type === 'Literal') {
      return operand.value;
    }

    if (operand.type === 'ColumnRef') {
      const table = operand.table || tableName;
      return combinedRow[table][operand.column];
    }

    return null;
  }
}

/**
 * Main entry point for query execution
 */
export function executeQuery({ queryText, tables, schema: schemaObj }) {
  try {
    // Tokenize
    const tokens = tokenize(queryText);

    // Parse
    const ast = parse(tokens);

    // For DDL and DML statements, we don't validate with the old validator
    const needsValidation = ast.type === 'Query';
    
    // Validate only for SELECT queries
    const validator = needsValidation ? validate(ast, schemaObj || schema) : null;

    // Execute
    const executor = new Executor(ast, tables, validator, schemaObj || schema);
    return executor.execute();
  } catch (error) {
    // Re-throw SQL errors as-is
    if (error.name === 'SqlError') {
      throw error;
    }
    // Wrap other errors
    throw error;
  }
}
