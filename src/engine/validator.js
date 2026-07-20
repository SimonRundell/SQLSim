/**
 * SQL Validator
 * Validates the AST against the schema before execution
 */

import {
  createUnknownTableError,
  createUnknownColumnError,
  createAmbiguousColumnError,
  createSyntaxError,
} from './errors.js';

export class Validator {
  constructor(ast, schema) {
    this.ast = ast;
    this.schema = schema;
    // Each entry is { name: actualTableName, alias, key: alias||name }
    // `key` is the qualifier used to reference the table elsewhere in the
    // query (e.g. in table.column, or as the row's namespace at execution
    // time) - it's the alias when one is given, otherwise the table name.
    this.tableEntries = [];
    this.tablesInScope = [];
  }

  hasTable(tableName) {
    return tableName in this.schema;
  }

  hasColumn(tableName, columnName) {
    const tableSchema = this.schema[tableName];
    if (!tableSchema) return false;
    return tableSchema.columns.some(col => col.name === columnName);
  }

  getTableColumns(tableName) {
    const tableSchema = this.schema[tableName];
    if (!tableSchema) return [];
    return tableSchema.columns.map(col => col.name);
  }

  addTableToScope(name, alias, position = null) {
    const key = alias || name;
    if (this.tablesInScope.includes(key)) {
      throw createSyntaxError(
        `Duplicate table alias or name '${key}' in query`,
        position
      );
    }
    this.tableEntries.push({ name, alias, key });
    this.tablesInScope.push(key);
  }

  resolveTableName(key) {
    const entry = this.tableEntries.find(e => e.key === key);
    return entry ? entry.name : null;
  }

  validate() {
    // Validate FROM table
    if (!this.hasTable(this.ast.from.name)) {
      throw createUnknownTableError(this.ast.from.name);
    }
    this.addTableToScope(this.ast.from.name, this.ast.from.alias);

    // Validate JOIN table if present
    if (this.ast.join) {
      if (!this.hasTable(this.ast.join.table)) {
        throw createUnknownTableError(this.ast.join.table);
      }
      this.addTableToScope(this.ast.join.table, this.ast.join.alias);

      // Validate JOIN ON columns
      this.validateColumnRef(this.ast.join.on.left);
      this.validateColumnRef(this.ast.join.on.right);
    }

    // Validate SELECT list
    if (!this.ast.select.star) {
      for (const item of this.ast.select.items) {
        this.validateSelectItem(item);
      }
    }

    // Validate GROUP BY
    if (this.ast.groupBy) {
      for (const column of this.ast.groupBy.columns) {
        this.validateColumnRef(column);
      }

      // When GROUP BY is used, validate SELECT list items
      if (!this.ast.select.star) {
        this.validateSelectWithGroupBy();
      }
    }

    // Validate WHERE clause
    if (this.ast.where) {
      for (const comparison of this.ast.where.and) {
        if (comparison.left.type === 'ColumnRef') {
          this.validateColumnRef(comparison.left);
        }
        if (comparison.right.type === 'ColumnRef') {
          this.validateColumnRef(comparison.right);
        }
      }
    }

    // Validate ORDER BY
    if (this.ast.orderBy) {
      this.validateColumnRef(this.ast.orderBy.column);
    }
  }

  validateColumnRef(columnRef) {
    if (columnRef.table) {
      // Qualified column reference: qualifier.column, where qualifier is
      // either a table alias or the bare table name
      if (!this.tablesInScope.includes(columnRef.table)) {
        throw createUnknownTableError(columnRef.table, columnRef.position);
      }
      const actualTable = this.resolveTableName(columnRef.table);
      if (!this.hasColumn(actualTable, columnRef.column)) {
        throw createUnknownColumnError(
          columnRef.column,
          columnRef.table,
          columnRef.position
        );
      }
    } else {
      // Unqualified column reference: must exist in exactly one table
      const matchingKeys = this.tableEntries
        .filter(entry => this.hasColumn(entry.name, columnRef.column))
        .map(entry => entry.key);

      if (matchingKeys.length === 0) {
        throw createUnknownColumnError(columnRef.column, null, columnRef.position);
      }

      if (matchingKeys.length > 1) {
        throw createAmbiguousColumnError(
          columnRef.column,
          matchingKeys,
          columnRef.position
        );
      }

      // Store the resolved qualifier (alias or table name) for later use
      columnRef.resolvedTable = matchingKeys[0];
    }
  }

  validateSelectItem(item) {
    if (item.type === 'AggregateFunction') {
      // Validate aggregate function argument
      if (item.argument.type === 'ColumnRef') {
        this.validateColumnRef(item.argument);
      }
      // Star (*) in COUNT(*) doesn't need validation
    } else if (item.type === 'ColumnRef') {
      this.validateColumnRef(item);
    }
  }

  validateSelectWithGroupBy() {
    // When GROUP BY is present, SELECT items must be either:
    // 1. A column in the GROUP BY clause
    // 2. An aggregate function
    
    const groupByColumns = this.ast.groupBy.columns.map(col => {
      const table = col.table || col.resolvedTable;
      return `${table}.${col.column}`;
    });

    for (const item of this.ast.select.items) {
      if (item.type === 'ColumnRef') {
        const table = item.table || item.resolvedTable;
        const fullColName = `${table}.${item.column}`;
        
        if (!groupByColumns.includes(fullColName)) {
          throw createSyntaxError(
            `Column '${item.column}' must appear in GROUP BY clause or be used in an aggregate function`,
            item.position
          );
        }
      }
      // Aggregate functions are allowed
    }
  }

  /**
   * Get all columns that should be in the output for SELECT *
   */
  getStarColumns() {
    const columns = [];

    for (const entry of this.tableEntries) {
      const tableColumns = this.getTableColumns(entry.name);
      for (const col of tableColumns) {
        columns.push({
          table: entry.key,
          column: col,
          displayName: this.tableEntries.length > 1 ? `${entry.key}.${col}` : col,
        });
      }
    }

    return columns;
  }
}

export function validate(ast, schema) {
  const validator = new Validator(ast, schema);
  validator.validate();
  return validator;
}
