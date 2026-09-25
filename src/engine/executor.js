/**
 * SQL Executor
 * Executes validated AST against data tables
 */

import { tokenize } from './tokenizer.js';
import { parse } from './parser.js';
import { validate, validateWhereSubqueries, getSelectColumnNames, getDerivedTableColumnNames } from './validator.js';
import { schema } from '../data/schema.js';

export class Executor {
  constructor(ast, data, validator, schema) {
    this.ast = ast;
    this.data = data;
    this.validator = validator;
    this.schema = schema;
  }

  resolveColumnDefinitions(tableName) {
    const tableSchema = this.schema[tableName] || { columns: [] };
    return (tableSchema.columns || []).map(col => ({
      name: col.name,
      type: col.type || 'string',
      size: col.size ?? null,
      autoIncrement: Boolean(col.autoIncrement),
      isPrimaryKey: Boolean(col.isPrimaryKey) || tableSchema.primaryKey === col.name,
      notNull: Boolean(col.notNull) || Boolean(col.autoIncrement) || tableSchema.primaryKey === col.name,
    }));
  }

  getPrimaryKey(tableSchema, columnDefs) {
    return tableSchema.primaryKey || (columnDefs || []).find(col => col.isPrimaryKey)?.name || null;
  }

  getLiteralValue(literal) {
    if (!literal || literal.type !== 'Literal') return null;
    return literal.value;
  }

  isTypeCompatible(value, expectedType) {
    if (value === null || value === undefined) return true;
    if (!expectedType) return true;

    switch (expectedType) {
      case 'number':
        return typeof value === 'number' && Number.isFinite(value);
      case 'string':
        return typeof value === 'string';
      case 'boolean':
        return typeof value === 'boolean';
      default:
        return true;
    }
  }

  getNextAutoIncrementValue(tableName, columnName) {
    const tableData = this.data[tableName] || [];
    const tableSchema = this.schema[tableName] || {};

    if (!tableSchema.autoIncrementCounters) {
      tableSchema.autoIncrementCounters = {};
      this.schema[tableName] = tableSchema;
    }

    const currentMax = tableData.reduce((max, row) => {
      const val = Number(row[columnName]);
      return Number.isFinite(val) && val > max ? val : max;
    }, 0);

    const nextVal = Math.max(tableSchema.autoIncrementCounters[columnName] || 0, currentMax) + 1;
    tableSchema.autoIncrementCounters[columnName] = nextVal;
    return nextVal;
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

    // Step 2: Apply each JOIN in turn
    for (const join of this.ast.joins) {
      rowset = this.applyJoin(rowset, join);
    }

    // Step 3: Apply WHERE filter
    if (this.ast.where) {
      rowset = this.applyWhere(rowset);
    }

    // Step 4: Check if query has aggregates
    const hasAggregates = this.ast.select.items.some(
      item => item.type === 'AggregateFunction'
    );

    // Step 5: Apply GROUP BY if present, or create a single group for
    // aggregates - or a HAVING clause - without GROUP BY
    let groupedData = null;
    if (this.ast.groupBy) {
      groupedData = this.applyGroupBy(rowset);
    } else if (hasAggregates || this.ast.having) {
      // Aggregates without GROUP BY - treat entire rowset as one group
      groupedData = new Map();
      groupedData.set('_all', {
        rows: rowset,
        firstRow: rowset[0] || {},
      });
    }

    // Step 5.5: Apply HAVING filter to the groups
    if (this.ast.having) {
      groupedData = this.applyHaving(groupedData);
    }

    // Step 6: Apply SELECT projection
    const selection = groupedData 
      ? this.applySelectWithGroupBy(groupedData)
      : this.applySelect(rowset);

    let { columns, rows } = selection;

    // Step 6.5: Apply DISTINCT if requested
    if (this.ast.select.distinct) {
      rows = this.applyDistinct(rows);
    }

    // Step 7: Apply ORDER BY
    let orderedRows = rows;
    if (this.ast.orderBy) {
      orderedRows = this.applyOrderBy(rows, columns);
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
    if (this.ast.from.type === 'DerivedTable') {
      return this.buildDerivedTableRowset(this.ast.from);
    }

    const tableName = this.ast.from.name;
    const key = this.ast.from.alias || tableName;
    const tableData = this.data[tableName] || [];

    return tableData.map(row => ({
      [key]: { ...row },
    }));
  }

  /**
   * Executes a FROM-clause derived table's inner query and reshapes its
   * result rows into the same { [key]: { column: value } } namespaced shape
   * that a base table's rowset uses, so the rest of the pipeline (JOIN,
   * WHERE, SELECT) doesn't need to know the difference.
   */
  buildDerivedTableRowset(derivedTableNode) {
    const key = derivedTableNode.alias;
    const result = this.runSubquery(derivedTableNode);
    const columnNames = getDerivedTableColumnNames(derivedTableNode.query.select, derivedTableNode.validator);

    return result.rows.map(resultRow => {
      const rowObj = {};
      columnNames.forEach((name, idx) => {
        rowObj[name] = resultRow[idx];
      });
      return { [key]: rowObj };
    });
  }

  /**
   * Executes a subquery (used by IN/scalar comparisons/EXISTS, and by
   * FROM-clause derived tables) and caches the result. Subqueries here are
   * always uncorrelated, so the result never depends on the outer row and
   * is safe to compute once per query execution rather than per row.
   */
  runSubquery(subqueryNode) {
    if (!this.subqueryCache) {
      this.subqueryCache = new Map();
    }
    if (this.subqueryCache.has(subqueryNode)) {
      return this.subqueryCache.get(subqueryNode);
    }

    // Every subquery reached from a SELECT (via the Validator) or from an
    // UPDATE/DELETE WHERE clause (via validateWhereSubqueries) is validated
    // up front. This is a defensive fallback for any other path.
    if (!subqueryNode.validator) {
      subqueryNode.validator = validate(subqueryNode.query, this.schema);
    }

    const subExecutor = new Executor(subqueryNode.query, this.data, subqueryNode.validator, this.schema);
    const result = subExecutor.executeQuery();
    this.subqueryCache.set(subqueryNode, result);
    return result;
  }

  /**
   * Evaluates a subquery used as a scalar operand (e.g. WHERE x = (SELECT ...)).
   * The Validator already guarantees it projects exactly one column; if it
   * comes back with more than one row at runtime, that's a genuine error -
   * the same way real SQL rejects "subquery returns more than 1 row".
   */
  evalScalarSubquery(subqueryNode) {
    const result = this.runSubquery(subqueryNode);
    if (result.rows.length > 1) {
      throw new Error(
        `Subquery used in a comparison returned ${result.rows.length} rows; it must return at most 1 row. Tip: add a WHERE condition to the subquery, or use IN instead.`
      );
    }
    return result.rows.length === 0 ? null : result.rows[0][0];
  }

  /**
   * Applies one JOIN clause against the rowset accumulated so far. Called
   * once per join in ast.joins, in order - so a later join's ON clause can
   * reference any table already folded into leftRowset, not just the one
   * from the immediately preceding join.
   */
  applyJoin(leftRowset, join) {
    const rightTableName = join.table;
    const rightKey = join.alias || rightTableName;
    const rightTableData = this.data[rightTableName] || [];
    const joinCondition = join.on;

    const result = [];

    for (const leftRow of leftRowset) {
      for (const rightRow of rightTableData) {
        // Create merged combined row, namespaced by alias (or table name)
        const combinedRow = {
          ...leftRow,
          [rightKey]: { ...rightRow },
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
    return rowset.filter(row => this.evalWhereExpr(this.ast.where.expr, row));
  }

  /**
   * Recursively evaluates a WHERE/HAVING expression tree (And/Or/Not/
   * Comparison/In/InSubquery/Between/Exists/BooleanLiteral). `evalOperandFn`
   * resolves a leaf operand (ColumnRef/Literal/AggregateFunction) to its
   * value - the only thing that differs between WHERE (a per-row operand),
   * HAVING (a per-group operand, aggregate-aware), and UPDATE/DELETE (an
   * operand resolved against the statement's own table).
   */
  evalExprTree(node, evalOperandFn) {
    switch (node.type) {
      case 'And':
        return this.evalExprTree(node.left, evalOperandFn) && this.evalExprTree(node.right, evalOperandFn);
      case 'Or':
        return this.evalExprTree(node.left, evalOperandFn) || this.evalExprTree(node.right, evalOperandFn);
      case 'Not':
        return !this.evalExprTree(node.expr, evalOperandFn);
      case 'BooleanLiteral':
        return node.value;
      case 'Comparison': {
        const leftValue = evalOperandFn(node.left);
        const rightValue = node.right.type === 'Subquery'
          ? this.evalScalarSubquery(node.right)
          : evalOperandFn(node.right);
        return this.compareValues(leftValue, rightValue, node.operator || '=');
      }
      case 'In': {
        const value = evalOperandFn(node.operand);
        const isMember = node.values.some(literal => this.compareValues(value, literal.value, '='));
        return node.negate ? !isMember : isMember;
      }
      case 'InSubquery': {
        const value = evalOperandFn(node.operand);
        const subqueryResult = this.runSubquery(node.subquery);
        const isMember = subqueryResult.rows.some(row => this.compareValues(value, row[0], '='));
        return node.negate ? !isMember : isMember;
      }
      case 'Exists': {
        const subqueryResult = this.runSubquery(node.subquery);
        return subqueryResult.rows.length > 0;
      }
      case 'Between': {
        const value = evalOperandFn(node.operand);
        const low = evalOperandFn(node.low);
        const high = evalOperandFn(node.high);
        const inRange = this.compareValues(value, low, '>=') && this.compareValues(value, high, '<=');
        return node.negate ? !inRange : inRange;
      }
      default:
        return false;
    }
  }

  evalWhereExpr(node, combinedRow) {
    return this.evalExprTree(node, operand => this.evalOperand(operand, combinedRow));
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
    const columns = getSelectColumnNames(this.ast.select, this.validator);
    const rows = [];

    // Build rows from each group
    for (const groupData of groupedData.values()) {
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
      
      case 'AVG': {
        const sum = values.reduce((s, val) => s + val, 0);
        return Math.round((sum / values.length) * 100) / 100; // Round to 2 decimal places
      }
      
      case 'MIN':
        return Math.min(...values);
      
      case 'MAX':
        return Math.max(...values);
      
      default:
        return 0;
    }
  }

  applySelect(rowset) {
    const columns = getSelectColumnNames(this.ast.select, this.validator);

    if (this.ast.select.star) {
      const starColumns = this.validator.getStarColumns();
      const rows = rowset.map(combinedRow => {
        return starColumns.map(c => combinedRow[c.table][c.column]);
      });
      return { columns, rows };
    }

    const columnRefs = this.ast.select.items;
    const rows = rowset.map(combinedRow => {
      return columnRefs.map(colRef => {
        const tableName = colRef.table || colRef.resolvedTable;
        return combinedRow[tableName][colRef.column];
      });
    });

    return { columns, rows };
  }

  applyDistinct(rows) {
    const seen = new Set();
    const unique = [];

    for (const row of rows) {
      const key = JSON.stringify(row);
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(row);
      }
    }

    return unique;
  }

  applyOrderBy(rows, columns) {
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
    const { tableName, columns, primaryKey } = this.ast;
    
    // Check if table already exists
    if (this.schema[tableName] || this.data[tableName]) {
      throw new Error(`Table '${tableName}' already exists`);
    }

    const normalizedColumns = columns.map(col => ({
      name: col.name,
      type: col.type,
      size: col.size ?? null,
      notNull: Boolean(col.notNull) || Boolean(col.isPrimaryKey) || Boolean(col.autoIncrement),
      autoIncrement: Boolean(col.autoIncrement),
      isPrimaryKey: Boolean(col.isPrimaryKey),
    }));

    // Validate unique column names
    const nameSet = new Set();
    for (const col of normalizedColumns) {
      if (nameSet.has(col.name)) {
        throw new Error(`Duplicate column '${col.name}' in table definition`);
      }
      nameSet.add(col.name);
    }

    const effectivePrimaryKey = primaryKey || normalizedColumns.find(c => c.isPrimaryKey)?.name || null;

    // Add to schema
    this.schema[tableName] = {
      columns: normalizedColumns,
      isUserCreated: true,
      primaryKey: effectivePrimaryKey,
      autoIncrementCounters: {},
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
    const { tableName, column } = this.ast;
    
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
    if (this.schema[tableName].columns.some(col => col.name === column.name)) {
      throw new Error(`Column '${column.name}' already exists in table '${tableName}'`);
    }

    const tableData = this.data[tableName] || [];
    if (tableData.length > 0 && (column.notNull || column.isPrimaryKey || column.autoIncrement)) {
      throw new Error('Cannot add NOT NULL, PRIMARY KEY, or AUTO_INCREMENT column to a non-empty table');
    }

    const normalizedColumn = {
      name: column.name,
      type: column.type,
      size: column.size ?? null,
      notNull: Boolean(column.notNull) || Boolean(column.isPrimaryKey) || Boolean(column.autoIncrement),
      autoIncrement: Boolean(column.autoIncrement),
      isPrimaryKey: Boolean(column.isPrimaryKey),
    };

    // Add column to schema
    this.schema[tableName].columns.push(normalizedColumn);

    // Update primary key if provided
    if (normalizedColumn.isPrimaryKey) {
      if (this.schema[tableName].primaryKey) {
        throw new Error(`Table '${tableName}' already has a primary key '${this.schema[tableName].primaryKey}'`);
      }
      this.schema[tableName].primaryKey = normalizedColumn.name;
    }

    // Add column to existing data rows with null values
    for (const row of tableData) {
      row[normalizedColumn.name] = normalizedColumn.autoIncrement
        ? this.getNextAutoIncrementValue(tableName, normalizedColumn.name)
        : null;
    }

    return {
      columns: ['Result'],
      rows: [[`Column '${normalizedColumn.name}' added to table '${tableName}'`]],
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

    const columnDefs = this.resolveColumnDefinitions(tableName);
    const tableSchema = this.schema[tableName];
    const primaryKey = this.getPrimaryKey(tableSchema, columnDefs);

    // Validate columns exist
    const tableColumns = columnDefs.map(col => col.name);
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
      const colName = columns[i];
      const colDef = columnDefs.find(c => c.name === colName);
      const literalValue = this.getLiteralValue(values[i]);

      if ((colDef.notNull || colDef.isPrimaryKey) && (literalValue === null || literalValue === undefined)) {
        throw new Error(`Column '${colName}' cannot be NULL`);
      }

      if (!this.isTypeCompatible(literalValue, colDef.type)) {
        throw new Error(`Value for column '${colName}' must be of type ${colDef.type}`);
      }

      newRow[colName] = literalValue;
    }

    // Add null or auto-increment values for missing columns
    for (const colDef of columnDefs) {
      if (!(colDef.name in newRow)) {
        if (colDef.autoIncrement) {
          newRow[colDef.name] = this.getNextAutoIncrementValue(tableName, colDef.name);
        } else {
          newRow[colDef.name] = null;
        }
      }

      if ((colDef.notNull || colDef.isPrimaryKey) && (newRow[colDef.name] === null || newRow[colDef.name] === undefined)) {
        throw new Error(`Column '${colDef.name}' cannot be NULL`);
      }

      if (!this.isTypeCompatible(newRow[colDef.name], colDef.type)) {
        throw new Error(`Value for column '${colDef.name}' must be of type ${colDef.type}`);
      }

      if (colDef.autoIncrement) {
        const numericValue = Number(newRow[colDef.name]);
        if (Number.isFinite(numericValue)) {
          const current = tableSchema.autoIncrementCounters?.[colDef.name] || 0;
          if (!tableSchema.autoIncrementCounters) tableSchema.autoIncrementCounters = {};
          tableSchema.autoIncrementCounters[colDef.name] = Math.max(current, numericValue);
        }
      }
    }

    // Enforce primary key
    if (primaryKey) {
      const pkValue = newRow[primaryKey];
      if (pkValue === null || pkValue === undefined) {
        throw new Error(`Primary key '${primaryKey}' cannot be NULL`);
      }

      const conflict = (this.data[tableName] || []).some(row => row[primaryKey] === pkValue);
      if (conflict) {
        throw new Error(`Duplicate primary key value '${pkValue}' for '${primaryKey}'`);
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
    
    const columnDefs = this.resolveColumnDefinitions(tableName);
    const tableSchema = this.schema[tableName];
    const primaryKey = this.getPrimaryKey(tableSchema, columnDefs);

    // Validate columns exist
    const tableColumns = columnDefs.map(col => col.name);
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
        return this.evalWhereExprForModification(where.expr, combinedRow, tableName);
      });
    }
    
    // Update the rows
    let updateCount = 0;
    for (const row of rowsToUpdate) {
      for (const assignment of assignments) {
        const colDef = columnDefs.find(c => c.name === assignment.column);
        const newValue = this.getLiteralValue(assignment.value);

        if ((colDef.notNull || colDef.isPrimaryKey) && (newValue === null || newValue === undefined)) {
          throw new Error(`Column '${assignment.column}' cannot be NULL`);
        }

        if (!this.isTypeCompatible(newValue, colDef.type)) {
          throw new Error(`Value for column '${assignment.column}' must be of type ${colDef.type}`);
        }

        if (primaryKey && assignment.column === primaryKey) {
          const conflict = this.data[tableName].some(existing => existing !== row && existing[primaryKey] === newValue);
          if (conflict) {
            throw new Error(`Duplicate primary key value '${newValue}' for '${primaryKey}'`);
          }
        }

        row[assignment.column] = newValue;

        if (colDef.autoIncrement) {
          const numericValue = Number(newValue);
          if (Number.isFinite(numericValue)) {
            const current = tableSchema.autoIncrementCounters?.[colDef.name] || 0;
            if (!tableSchema.autoIncrementCounters) tableSchema.autoIncrementCounters = {};
            tableSchema.autoIncrementCounters[colDef.name] = Math.max(current, numericValue);
          }
        }
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
      const shouldDelete = this.evalWhereExprForModification(where.expr, combinedRow, tableName);

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

  /**
   * Same as evalWhereExpr, but for UPDATE/DELETE WHERE clauses, which are not
   * scope-resolved by the Validator (only SELECT queries are) - unqualified
   * columns default to the statement's own table via evalOperandForModification.
   */
  evalWhereExprForModification(node, combinedRow, tableName) {
    return this.evalExprTree(node, operand => this.evalOperandForModification(operand, combinedRow, tableName));
  }

  /**
   * Filters a Map of groups (as produced by applyGroupBy, or the single
   * synthetic group used for an aggregate query without GROUP BY) down to
   * those matching the HAVING expression.
   */
  applyHaving(groupedData) {
    const filtered = new Map();
    for (const [key, groupData] of groupedData) {
      if (this.evalHavingExpr(this.ast.having.expr, groupData)) {
        filtered.set(key, groupData);
      }
    }
    return filtered;
  }

  evalHavingExpr(node, groupData) {
    return this.evalExprTree(node, operand => this.evalHavingOperand(operand, groupData));
  }

  /**
   * Resolves a HAVING operand against a group: an aggregate function is
   * computed over the group's rows (the same way computeAggregate does for
   * a SELECT item), a plain column reads the group's first row (valid only
   * because the Validator already confirmed it's a GROUP BY column, so
   * every row in the group shares that value), and a literal is itself.
   */
  evalHavingOperand(operand, groupData) {
    if (operand.type === 'Literal') {
      return operand.value;
    }
    if (operand.type === 'AggregateFunction') {
      return this.computeAggregate(operand, groupData.rows);
    }
    if (operand.type === 'ColumnRef') {
      const tableName = operand.table || operand.resolvedTable;
      return groupData.firstRow[tableName][operand.column];
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

    // UPDATE/DELETE never go through the Validator for their own column
    // scope, but any subqueries embedded in their WHERE clause still need
    // validating (and a Validator stashed on them) before they can run.
    if ((ast.type === 'Update' || ast.type === 'Delete') && ast.where) {
      validateWhereSubqueries(ast.where.expr, schemaObj || schema);
    }

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
