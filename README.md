# SQL SELECT + JOIN Simulator (MVP)

A client-side SQL query simulator built with React and Vite for learning SQL SELECT queries with JOINs. No backend required - runs entirely in your browser!

## Features

- ✅ **SELECT** queries with column selection or `*`
- ✅ **FROM** single table
- ✅ **INNER JOIN** with ON conditions
- ✅ **WHERE** clauses with AND-chained equality comparisons
- ✅ **GROUP BY** for data aggregation
- ✅ **Aggregate Functions**: COUNT(), SUM(), AVG(), MIN(), MAX()
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
- **SUM(column)**: Calculate sum of numeric values
- **AVG(column)**: Calculate average of numeric values
- **MIN(column)**: Find minimum value
- **MAX(column)**: Find maximum value

Note: All aggregate functions except COUNT(*) require a column name and work only with numeric data.

### Operators

- **Comparison operators**: `=`, `!=`, `<>`, `<`, `<=`, `>`, `>=`
- **Pattern matching**: `LIKE` with `%` wildcard (e.g., `name LIKE 'S%'` for names starting with S)
- **Logic**: Only `AND` (no OR, NOT, or parentheses)

### Sample Tables

The simulator includes four teaching tables:

1. **students** (student_id, forename, surname, tutor_group_id)
2. **tutor_groups** (tutor_group_id, tutor_name, room)
3. **attendance** (student_id, session_date, present)
4. **grades** (student_id, module, paper, score)

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

### 10. Aggregate Functions
```sql
-- Average score across all grades
SELECT AVG(score) FROM grades

-- Module performance statistics
SELECT module, COUNT(*), AVG(score), MIN(score), MAX(score)
FROM grades
GROUP BY module
ORDER BY AVG(score) DESC

-- Student performance summary
SELECT students.forename, students.surname, AVG(grades.score), MAX(grades.score)
FROM students
INNER JOIN grades ON students.student_id = grades.student_id
GROUP BY students.forename, students.surname
ORDER BY AVG(grades.score) DESC
```

### 11. Comparison Operators
```sql
-- High scores (>= 90)
SELECT students.forename, students.surname, grades.score
FROM students
INNER JOIN grades ON students.student_id = grades.student_id
WHERE grades.score >= 90

-- Grade boundaries - Distinction level
SELECT students.forename, students.surname, COUNT(*) AS distinctions
FROM students
INNER JOIN grades ON students.student_id = grades.student_id
WHERE grades.score >= 70
GROUP BY students.forename, students.surname
```

### 12. LIKE Pattern Matching
```sql
-- Students whose surname starts with 'S'
SELECT forename, surname FROM students WHERE surname LIKE 'S%'

-- Modules containing 'Data'
SELECT module, AVG(score)
FROM grades
WHERE module LIKE '%Data%'
GROUP BY module

-- Students with 'son' in their surname
SELECT forename, surname FROM students WHERE surname LIKE '%son%'
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
- **UNSUPPORTED_FEATURE**: Feature not yet implemented (e.g., LEFT JOIN, subqueries)

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

