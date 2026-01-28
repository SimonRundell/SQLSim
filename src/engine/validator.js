/**
 * SQL Validator
 * Validates the AST against the schema before execution
 */

import { hasTable, hasColumn, getTableColumns } from '../data/schema.js';
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
    this.tablesInScope = [];
  }

  validate() {
    // Validate FROM table
    if (!hasTable(this.ast.from.name)) {
      throw createUnknownTableError(this.ast.from.name);
    }
    this.tablesInScope.push(this.ast.from.name);

    // Validate JOIN table if present
    if (this.ast.join) {
      if (!hasTable(this.ast.join.table)) {
        throw createUnknownTableError(this.ast.join.table);
      }
      this.tablesInScope.push(this.ast.join.table);

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
      // Qualified column reference: table.column
      if (!this.tablesInScope.includes(columnRef.table)) {
        throw createUnknownTableError(columnRef.table, columnRef.position);
      }
      if (!hasColumn(columnRef.table, columnRef.column)) {
        throw createUnknownColumnError(
          columnRef.column,
          columnRef.table,
          columnRef.position
        );
      }
    } else {
      // Unqualified column reference: must exist in exactly one table
      const matchingTables = this.tablesInScope.filter(table =>
        hasColumn(table, columnRef.column)
      );

      if (matchingTables.length === 0) {
        throw createUnknownColumnError(columnRef.column, null, columnRef.position);
      }

      if (matchingTables.length > 1) {
        throw createAmbiguousColumnError(
          columnRef.column,
          matchingTables,
          columnRef.position
        );
      }

      // Store the resolved table for later use
      columnRef.resolvedTable = matchingTables[0];
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
    
    for (const tableName of this.tablesInScope) {
      const tableColumns = getTableColumns(tableName);
      for (const col of tableColumns) {
        columns.push({
          table: tableName,
          column: col,
          displayName: this.tablesInScope.length > 1 ? `${tableName}.${col}` : col,
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
