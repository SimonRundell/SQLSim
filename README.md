# SQL SELECT + JOIN Simulator (MVP)

A client-side SQL query simulator built with React and Vite for learning SQL SELECT queries with JOINs. No backend required - runs entirely in your browser!

## Features

- ✅ **SELECT** queries with column selection or `*`
- ✅ **FROM** single table
- ✅ **INNER JOIN** with ON conditions
- ✅ **WHERE** clauses with AND-chained equality comparisons
- ✅ **GROUP BY** for data aggregation
- ✅ **COUNT()** aggregate function
- ✅ **ORDER BY** with ASC/DESC
- ✅ **LIMIT** for result set size
- ✅ Real-time error feedback with helpful messages
- ✅ Interactive UI with source tables, query editor, and results panel

## Supported SQL Subset

### Basic Syntax Rules

- **Strings**: Must use single quotes: `'like this'`
- **Identifiers**: Bare words (no quotes): `students`, `surname`
- **Keywords**: Case-insensitive (SELECT, select, Select all work)
- **Column References**: Can be qualified (`students.surname`) or unqualified (`surname`)

### Supported SQL Features

```sql
SELECT <columns or * or COUNT(*)>
FROM <table>
[INNER JOIN <table> ON <column> = <column>]
[WHERE <condition> AND <condition> ...]
[GROUP BY <column> [, <column> ...]]
[ORDER BY <column> [ASC|DESC]]
[LIMIT <number>]
```

### Aggregate Functions

- **COUNT(*)**: Count all rows in a group
- **COUNT(column)**: Count non-null values in a column

### Operators

- **WHERE clause**: Only `=` (equality) supported
- **Comparison types**: `column = value`, `column = column`
- **Logic**: Only `AND` (no OR, NOT, or parentheses in MVP)

### Sample Tables

The simulator includes three teaching tables:

1. **students** (student_id, forename, surname, tutor_group_id)
2. **tutor_groups** (tutor_group_id, tutor_name, room)
3. **attendance** (student_id, session_date, present)

## Example Queries

### 1. Simple SELECT
```sql
SELECT * FROM students
```

### 2. SELECT with WHERE
```sql
SELECT forename, surname FROM students WHERE surname = 'Smith'
```

### 3. INNER JOIN
```sql
SELECT students.forename, students.surname, tutor_groups.tutor_name
FROM students
INNER JOIN tutor_groups ON students.tutor_group_id = tutor_groups.tutor_group_id
```

### 4. Complex Query with All Features
```sql
SELECT students.forename, students.surname, tutor_groups.tutor_name
FROM students
INNER JOIN tutor_groups ON students.tutor_group_id = tutor_groups.tutor_group_id
WHERE tutor_groups.room = 'B12'
ORDER BY students.surname ASC
LIMIT 20
```

### 5. Multiple WHERE conditions
```sql
SELECT * FROM students
WHERE tutor_group_id = 1 AND surname = 'Smith'
```

### 6. COUNT all rows
```sql
SELECT COUNT(*) FROM students
```

### 7. GROUP BY with COUNT
```sql
SELECT tutor_group_id, COUNT(*) 
FROM students 
GROUP BY tutor_group_id
```

### 8. GROUP BY with JOIN
```sql
SELECT tutor_groups.tutor_name, tutor_groups.room, COUNT(*) 
FROM students
INNER JOIN tutor_groups ON students.tutor_group_id = tutor_groups.tutor_group_id
GROUP BY tutor_groups.tutor_name, tutor_groups.room
ORDER BY COUNT(*) DESC
```

### 9. GROUP BY with WHERE
```sql
SELECT surname, COUNT(*) 
FROM students 
WHERE tutor_group_id = 1
GROUP BY surname
```

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Then open your browser to the URL shown (typically http://localhost:5173)

### Build

```bash
npm run build
```

## Error Handling

The simulator provides clear, student-friendly error messages:

- **SYNTAX_ERROR**: Malformed query structure
- **UNKNOWN_TABLE**: Table doesn't exist
- **UNKNOWN_COLUMN**: Column not found in any accessible table
- **AMBIGUOUS_COLUMN**: Column exists in multiple tables (needs qualification)
- **UNSUPPORTED_FEATURE**: Feature not yet implemented (e.g., LEFT JOIN, SUM, AVG)

## Architecture

```
src/
  ├── engine/          # SQL execution engine
  │   ├── tokenizer.js # Lexical analysis
  │   ├── parser.js    # Syntax analysis & AST
  │   ├── validator.js # Semantic validation
  │   ├── executor.js  # Query execution
  │   └── errors.js    # Error definitions
  ├── data/            # Data layer
  │   ├── schema.js    # Table schemas
  │   └── sampleData.js # Teaching datasets
  └── components/      # React UI
      ├── TablesPanel.jsx
      ├── QueryEditor.jsx
      └── ResultsPanel.jsx
```

## Future Enhancements

- LEFT JOIN, RIGHT JOIN, FULL OUTER JOIN
- Multiple JOINs
- OR, NOT, parentheses in WHERE
- LIKE, IN, BETWEEN operators
- Additional aggregates (SUM, AVG, MIN, MAX)
- HAVING clause
- DISTINCT
- Table and column aliases
- CREATE TEMP TABLE
- Subqueries
- Visual query explanation/execution plan

## Testing

Try these test cases to verify functionality:

1. ✅ `SELECT * FROM students`
2. ✅ `SELECT surname FROM students WHERE surname = 'Smith'`
3. ✅ JOIN query (see example #3 above)
4. ✅ Ambiguous column: `SELECT tutor_group_id FROM students INNER JOIN tutor_groups ON students.tutor_group_id = tutor_groups.tutor_group_id` (should error)
5. ✅ Unknown column: `SELECT foo FROM students` (should error)
6. ✅ COUNT aggregate: `SELECT COUNT(*) FROM students` (should work)
7. ✅ GROUP BY: `SELECT tutor_group_id, COUNT(*) FROM students GROUP BY tutor_group_id` (should work)
8. ✅ GROUP BY validation: `SELECT forename, COUNT(*) FROM students GROUP BY tutor_group_id` (should error - forename not in GROUP BY)

## License

Educational project for learning SQL concepts.

