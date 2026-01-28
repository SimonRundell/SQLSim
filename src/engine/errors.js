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
  return new SqlError(ErrorCodes.SYNTAX_ERROR, message, position);
}

export function createUnknownTableError(tableName, position = null) {
  return new SqlError(
    ErrorCodes.UNKNOWN_TABLE,
    `Unknown table: ${tableName}`,
    position
  );
}

export function createUnknownColumnError(columnName, tableName = null, position = null) {
  const tableInfo = tableName ? ` in table ${tableName}` : '';
  return new SqlError(
    ErrorCodes.UNKNOWN_COLUMN,
    `Unknown column: ${columnName}${tableInfo}`,
    position
  );
}

export function createAmbiguousColumnError(columnName, tables, position = null) {
  return new SqlError(
    ErrorCodes.AMBIGUOUS_COLUMN,
    `Column '${columnName}' is ambiguous - found in tables: ${tables.join(', ')}. Please qualify with table name.`,
    position
  );
}

export function createUnsupportedFeatureError(feature, position = null) {
  return new SqlError(
    ErrorCodes.UNSUPPORTED_FEATURE,
    `Unsupported feature: ${feature}. This MVP supports only SELECT, FROM, INNER JOIN, WHERE (with AND), ORDER BY, and LIMIT.`,
    position
  );
}
