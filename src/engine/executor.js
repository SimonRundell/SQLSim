/**
 * SQL Executor
 * Executes validated AST against data tables
 */

import { tokenize } from './tokenizer.js';
import { parse } from './parser.js';
import { validate } from './validator.js';
import { schema } from '../data/schema.js';

export class Executor {
  constructor(ast, data, validator) {
    this.ast = ast;
    this.data = data;
    this.validator = validator;
  }

  execute() {
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

    // Step 4: Apply SELECT projection
    const { columns, rows } = this.applySelect(rowset);

    // Step 5: Apply ORDER BY
    let orderedRows = rows;
    if (this.ast.orderBy) {
      orderedRows = this.applyOrderBy(rows, columns, rowset);
    }

    // Step 6: Apply LIMIT
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

        if (this.compareValues(leftValue, rightValue)) {
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

        if (!this.compareValues(leftValue, rightValue)) {
          return false;
        }
      }
      return true;
    });
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

  compareValues(left, right) {
    // Handle null/undefined
    if (left === null || left === undefined || right === null || right === undefined) {
      return false;
    }

    // Type coercion: if both are numbers or can be numbers, compare as numbers
    // Otherwise compare as strings
    const leftNum = Number(left);
    const rightNum = Number(right);

    if (!isNaN(leftNum) && !isNaN(rightNum)) {
      return leftNum === rightNum;
    }

    // String comparison
    return String(left) === String(right);
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

    // Validate
    const validator = validate(ast, schemaObj || schema);

    // Execute
    const executor = new Executor(ast, tables, validator);
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
