/**
 * Schema Definition
 * Defines the structure of all available tables
 */

export const schema = {
  students: {
    columns: [
      { name: 'student_id', type: 'number' },
      { name: 'forename', type: 'string' },
      { name: 'surname', type: 'string' },
      { name: 'tutor_group_id', type: 'number' },
    ],
    primaryKey: 'student_id',
  },
  tutor_groups: {
    columns: [
      { name: 'tutor_group_id', type: 'number' },
      { name: 'tutor_name', type: 'string' },
      { name: 'room', type: 'string' },
    ],
    primaryKey: 'tutor_group_id',
  },
  attendance: {
    columns: [
      { name: 'student_id', type: 'number' },
      { name: 'session_date', type: 'string' },
      { name: 'present', type: 'string' },
    ],
  },
  grades: {
    columns: [
      { name: 'student_id', type: 'number' },
      { name: 'module', type: 'string' },
      { name: 'paper', type: 'number' },
      { name: 'score', type: 'number' },
    ],
  },
};

/**
 * Get all column names for a table
 */
export function getTableColumns(tableName) {
  const tableSchema = schema[tableName];
  if (!tableSchema) return null;
  return tableSchema.columns.map(col => col.name);
}

/**
 * Check if a column exists in a table
 */
export function hasColumn(tableName, columnName) {
  const columns = getTableColumns(tableName);
  return columns ? columns.includes(columnName) : false;
}

/**
 * Check if a table exists in the schema
 */
export function hasTable(tableName) {
  return tableName in schema;
}
