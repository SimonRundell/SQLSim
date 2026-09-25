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
    // A derived table (subquery in FROM) has no entry in `schema` - its
    // columns are whatever its own SELECT list projects. Keyed by the same
    // value used as `entry.name` above, so hasColumn/getTableColumns can
    // resolve either kind of table transparently.
    this.derivedTableColumns = {};
  }

  hasTable(tableName) {
    return tableName in this.schema || tableName in this.derivedTableColumns;
  }

  hasColumn(tableName, columnName) {
    if (tableName in this.derivedTableColumns) {
      return this.derivedTableColumns[tableName].includes(columnName);
    }
    const tableSchema = this.schema[tableName];
    if (!tableSchema) return false;
    return tableSchema.columns.some(col => col.name === columnName);
  }

  getTableColumns(tableName) {
    if (tableName in this.derivedTableColumns) {
      return this.derivedTableColumns[tableName];
    }
    const tableSchema = this.schema[tableName];
    if (!tableSchema) return [];
    return tableSchema.columns.map(col => col.name);
  }

  addTableToScope(name, alias, position = null, derivedColumns = null) {
    const key = alias || name;
    if (this.tablesInScope.includes(key)) {
      throw createSyntaxError(
        `Duplicate table alias or name '${key}' in query`,
        position
      );
    }
    // A derived table has no name of its own to key its columns by, so its
    // alias (== key) doubles as its lookup name.
    const entryName = derivedColumns ? key : name;
    this.tableEntries.push({ name: entryName, alias, key });
    this.tablesInScope.push(key);
    if (derivedColumns) {
      this.derivedTableColumns[entryName] = derivedColumns;
    }
  }

  resolveTableName(key) {
    const entry = this.tableEntries.find(e => e.key === key);
    return entry ? entry.name : null;
  }

  validate() {
    // Validate FROM table (a base table, or a derived table / subquery)
    if (this.ast.from.type === 'DerivedTable') {
      const derivedColumns = this.validateDerivedTable(this.ast.from);
      this.addTableToScope(this.ast.from.alias, null, this.ast.from.position, derivedColumns);
    } else {
      if (!this.hasTable(this.ast.from.name)) {
        throw createUnknownTableError(this.ast.from.name);
      }
      this.addTableToScope(this.ast.from.name, this.ast.from.alias);
    }

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
      this.validateWhereExpr(this.ast.where.expr);
    }

    // Validate ORDER BY
    if (this.ast.orderBy) {
      this.validateColumnRef(this.ast.orderBy.column);
    }
  }

  /**
   * Recursively validates every column reference within a WHERE expression tree
   * (And/Or/Not/Comparison/In/InSubquery/Between/Exists/BooleanLiteral nodes).
   */
  validateWhereExpr(node) {
    switch (node.type) {
      case 'And':
      case 'Or':
        this.validateWhereExpr(node.left);
        this.validateWhereExpr(node.right);
        break;
      case 'Not':
        this.validateWhereExpr(node.expr);
        break;
      case 'Comparison':
        if (node.left.type === 'ColumnRef') this.validateColumnRef(node.left);
        if (node.right.type === 'ColumnRef') this.validateColumnRef(node.right);
        if (node.right.type === 'Subquery') this.validateScalarSubquery(node.right);
        break;
      case 'In':
        if (node.operand.type === 'ColumnRef') this.validateColumnRef(node.operand);
        break;
      case 'InSubquery':
        if (node.operand.type === 'ColumnRef') this.validateColumnRef(node.operand);
        this.validateScalarSubquery(node.subquery);
        break;
      case 'Between':
        if (node.operand.type === 'ColumnRef') this.validateColumnRef(node.operand);
        if (node.low.type === 'ColumnRef') this.validateColumnRef(node.low);
        if (node.high.type === 'ColumnRef') this.validateColumnRef(node.high);
        break;
      case 'Exists':
        this.validateSubquery(node.subquery);
        break;
      case 'BooleanLiteral':
        break;
    }
  }

  /**
   * Validates a subquery (used by IN/scalar comparisons/EXISTS, and by
   * FROM-clause derived tables) as an independent, uncorrelated query: it
   * only sees the base schema, never this query's tablesInScope. The
   * resulting Validator is stashed on the node so the Executor can reuse it
   * without re-validating. Delegates to the module-level function so
   * UPDATE/DELETE WHERE clauses - which never go through the Validator for
   * their own column scope - can still validate embedded subqueries the
   * same way (see validateWhereSubqueries).
   */
  validateSubquery(subqueryNode) {
    return validateSubqueryNode(subqueryNode, this.schema);
  }

  /**
   * Validates a subquery that must produce a single column, for use with
   * IN or as a scalar comparison operand.
   */
  validateScalarSubquery(subqueryNode) {
    validateScalarSubqueryNode(subqueryNode, this.schema);
  }

  /**
   * Validates a FROM-clause derived table's inner query, and derives the
   * column names it exposes to the outer query. Unlike display column
   * names (which may show "table.column" for readability), an exposed
   * derived-table column is always just its bare name or alias, since that
   * is the only thing an outer column_ref grammar can reference.
   */
  validateDerivedTable(derivedTableNode) {
    const innerValidator = this.validateSubquery(derivedTableNode);
    const select = derivedTableNode.query.select;

    if (!select.star) {
      for (const item of select.items) {
        if (item.type === 'AggregateFunction' && !item.alias) {
          throw createSyntaxError(
            `Give this ${item.function}(...) an alias with AS so it can be referenced outside the subquery, e.g. ${item.function}(...) AS total`,
            item.position
          );
        }
      }
    }

    const columnNames = getDerivedTableColumnNames(select, innerValidator);
    const seen = new Set();
    for (const name of columnNames) {
      if (seen.has(name)) {
        throw createSyntaxError(
          `Column '${name}' appears more than once in this subquery's result - give one of them an alias with AS`,
          derivedTableNode.position
        );
      }
      seen.add(name);
    }

    return columnNames;
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

/**
 * Validates a subquery node ({ type: 'Subquery', query } or a DerivedTable
 * node, both of which carry a `query`) as an independent, uncorrelated
 * query against the base schema, and stashes the resulting Validator on the
 * node so the Executor can run it without re-validating.
 */
export function validateSubqueryNode(subqueryNode, schema) {
  const innerValidator = new Validator(subqueryNode.query, schema);
  innerValidator.validate();
  subqueryNode.validator = innerValidator;
  return innerValidator;
}

/**
 * Validates a subquery that must produce a single column, for use with IN
 * or as a scalar comparison operand.
 */
export function validateScalarSubqueryNode(subqueryNode, schema) {
  const innerValidator = validateSubqueryNode(subqueryNode, schema);
  const select = subqueryNode.query.select;
  const columnCount = select.star
    ? innerValidator.getStarColumns().length
    : select.items.length;

  if (columnCount !== 1) {
    throw createSyntaxError(
      `Subquery must return exactly one column (found ${columnCount})`,
      subqueryNode.query.position
    );
  }
}

/**
 * Validates any subqueries reachable from a WHERE expression tree, without
 * needing an outer Validator. UPDATE and DELETE statements never go through
 * Validator.validate() (their own column scope is resolved ad hoc against a
 * single table), so this is how their WHERE clauses still get any embedded
 * subqueries validated - and given a Validator to execute with - just like
 * a SELECT query's WHERE clause does via validateWhereExpr.
 */
export function validateWhereSubqueries(node, schema) {
  if (!node) return;

  switch (node.type) {
    case 'And':
    case 'Or':
      validateWhereSubqueries(node.left, schema);
      validateWhereSubqueries(node.right, schema);
      break;
    case 'Not':
      validateWhereSubqueries(node.expr, schema);
      break;
    case 'Comparison':
      if (node.right.type === 'Subquery') validateScalarSubqueryNode(node.right, schema);
      break;
    case 'InSubquery':
      validateScalarSubqueryNode(node.subquery, schema);
      break;
    case 'Exists':
      validateSubqueryNode(node.subquery, schema);
      break;
    default:
      break;
  }
}

/**
 * The display name for each item in a SELECT list, in order - used to build
 * the output column headers (e.g. "table.column" when it aids readability
 * across a multi-table query). Shared between the Validator (to describe a
 * derived table's own display) and the Executor (to build query output).
 */
export function getSelectColumnNames(select, validator) {
  if (select.star) {
    return validator.getStarColumns().map(c => c.displayName);
  }

  return select.items.map(item => {
    if (item.alias) return item.alias;

    if (item.type === 'AggregateFunction') {
      return item.argument.type === 'Star'
        ? `${item.function}(*)`
        : `${item.function}(${item.argument.column})`;
    }

    // ColumnRef
    const tableName = item.table || item.resolvedTable;
    if (validator.tablesInScope.length > 1 && !item.table) {
      return `${tableName}.${item.column}`;
    }
    if (item.table) {
      return `${item.table}.${item.column}`;
    }
    return item.column;
  });
}

/**
 * The column names a derived table (subquery in FROM) exposes to the outer
 * query. Unlike getSelectColumnNames, table qualification is always dropped
 * - "s.forename" becomes "forename" - because a derived table's columns are
 * referenced as plain identifiers (alias.column), the same as any other
 * table's columns; there is no "table.column"-shaped identifier available.
 * Every AggregateFunction item must already carry an alias (enforced by
 * validateDerivedTable) since there'd otherwise be no valid name for it.
 */
export function getDerivedTableColumnNames(select, validator) {
  if (select.star) {
    return validator.getStarColumns().map(c => c.column);
  }

  return select.items.map(item => {
    if (item.alias) return item.alias;
    if (item.type === 'AggregateFunction') return null; // caught earlier by validateDerivedTable
    return item.column;
  });
}
