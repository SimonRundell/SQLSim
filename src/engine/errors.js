/**
 * SQL Error Classes
 * Structured errors for the SQL engine with codes, messages, and positions
 */

export class SqlError extends Error {
  constructor(code, message, position = null) {
    super(message);
    this.name = 'SqlError';
    this.code = code;
    this.position = position;
  }
}

export const ErrorCodes = {
  SYNTAX_ERROR: 'SYNTAX_ERROR',
  UNKNOWN_TABLE: 'UNKNOWN_TABLE',
  UNKNOWN_COLUMN: 'UNKNOWN_COLUMN',
  AMBIGUOUS_COLUMN: 'AMBIGUOUS_COLUMN',
  UNSUPPORTED_FEATURE: 'UNSUPPORTED_FEATURE',
  INVALID_LITERAL: 'INVALID_LITERAL',
  INVALID_QUERY: 'INVALID_QUERY',
};

export function createSyntaxError(message, position = null) {
  return new SqlError(
    ErrorCodes.SYNTAX_ERROR,
    `Syntax error: ${message}. Tip: check spelling, punctuation (commas, parentheses), and that you are only using supported features.`,
    position
  );
}

export function createUnknownTableError(tableName, position = null) {
  return new SqlError(
    ErrorCodes.UNKNOWN_TABLE,
    `Unknown table: ${tableName}. Tip: check the table name in the tables panel or create the table first.`,
    position
  );
}

export function createUnknownColumnError(columnName, tableName = null, position = null) {
  const tableInfo = tableName ? ` in table ${tableName}` : '';
  return new SqlError(
    ErrorCodes.UNKNOWN_COLUMN,
    `Unknown column: ${columnName}${tableInfo}. Tip: check spelling and use table.column if multiple tables are in the query.`,
    position
  );
}

export function createAmbiguousColumnError(columnName, tables, position = null) {
  return new SqlError(
    ErrorCodes.AMBIGUOUS_COLUMN,
    `Column '${columnName}' is ambiguous (found in: ${tables.join(', ')}). Tip: write it as table.column to show which one you mean.`,
    position
  );
}

export function createUnsupportedFeatureError(feature, position = null) {
  return new SqlError(
    ErrorCodes.UNSUPPORTED_FEATURE,
    `Unsupported feature: ${feature}. Tip: this simulator supports SELECT, FROM, INNER JOIN, WHERE (AND only), ORDER BY, LIMIT, DISTINCT, basic aggregates, and simple DDL/DML. Remove '${feature}' or replace it with a supported construct.`,
    position
  );
}
