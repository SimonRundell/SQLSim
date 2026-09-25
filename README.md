# SQL SELECT + JOIN Simulator (MVP)

A client-side SQL query simulator built with React and Vite for learning SQL SELECT queries with JOINs. No backend required - runs entirely in your browser!

## Features

- ✅ **SELECT** queries with column selection or `*`
- ✅ **DISTINCT** for deduping result rows
- ✅ **FROM** single table
- ✅ **INNER JOIN** with ON conditions, chainable across multiple tables in one query
- ✅ **WHERE** clauses with `AND`, `OR`, `NOT`, `IN`, `BETWEEN`, and parentheses for grouping
- ✅ **Subqueries**: `IN (SELECT ...)`, scalar `= (SELECT ...)`, `EXISTS (SELECT ...)`, and derived tables in `FROM`
- ✅ **GROUP BY** for data aggregation, with **HAVING** to filter groups
- ✅ **Aggregate Functions**: COUNT(), SUM(), AVG(), MIN(), MAX()
- ✅ **ORDER BY** with ASC/DESC
- ✅ **LIMIT** for result set size
- ✅ **Schema & Data**: CREATE TABLE, ALTER TABLE ADD COLUMN, DROP TABLE, INSERT, UPDATE, DELETE
- ✅ **Constraints**: PRIMARY KEY, AUTO_INCREMENT, NULL / NOT NULL
- ✅ **Types**: INT/DECIMAL/FLOAT/NUMERIC → number, VARCHAR/CHAR/TEXT → string, BOOLEAN
- ✅ Real-time error feedback with helpful messages
- ✅ Interactive UI with source tables, query editor, and results panel

## Supported SQL Subset

### Basic Syntax Rules

- **Strings**: Must use single quotes: `'like this'`
- **Identifiers**: Bare words (no quotes): `students`, `surname`
- **Keywords**: Case-insensitive (SELECT, select, Select all work)
- **Column References**: Can be qualified (`students.surname`) or unqualified (`surname`)
- **Comments**: `-- like this, to end of line` or `/* like this, over one or more lines */`

```sql
-- Find students in tutor group 1
SELECT forename, surname
FROM students
WHERE tutor_group_id = 1 /* this comment can span
multiple lines */
```

### Supported SQL Features

```sql
SELECT [DISTINCT] <columns or * or COUNT(*)>
FROM <table> | (<subquery>) AS <alias>
[INNER JOIN <table> ON <column> = <column>]...
[WHERE <condition>]
[GROUP BY <column> [, <column> ...]]
[HAVING <condition>]
[ORDER BY <column> [ASC|DESC]]
[LIMIT <number>]
```

A `<condition>` can combine comparisons with `AND`, `OR`, `NOT` and parentheses, and can use `IN (...)`, `BETWEEN ... AND ...`, `EXISTS (...)`, or a subquery in place of a value - see [Operators](#operators) and [Subqueries](#14-subqueries) below. A `<condition>` in `HAVING` can additionally use an aggregate function (e.g. `COUNT(*) > 5`), since it filters groups after `GROUP BY` rather than rows before it - see [HAVING](#15-having) below.

### DDL and DML

```sql
CREATE TABLE <name> (
  column_name column_type [PRIMARY KEY] [AUTO_INCREMENT] [NULL|NOT NULL],
  ...
)

ALTER TABLE <name> ADD [COLUMN] column_name column_type [PRIMARY KEY] [AUTO_INCREMENT] [NULL|NOT NULL]

DROP TABLE <name>

INSERT INTO <table> (col1, col2, ...) VALUES (val1, val2, ...)
UPDATE <table> SET col1 = val1 [, col2 = val2 ...] [WHERE condition]
DELETE FROM <table> [WHERE condition]
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
- **Range and membership**: `BETWEEN low AND high`, `IN (val1, val2, ...)` (also `NOT BETWEEN` / `NOT IN`)
- **Logic**: `AND`, `OR`, `NOT`, with parentheses `( )` for grouping (unparenthesized, `AND` binds tighter than `OR`, and `NOT` binds tightest)

### Sample Tables

The simulator includes three teaching tables:

1. **students** (student_id, forename, surname, tutor_group_id)
2. **tutor_groups** (tutor_group_id, tutor_name, room)
3. **grades** (student_id, module, paper, score)

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

Chain further `INNER JOIN` clauses to bring in more tables - a later join's `ON` can
reference any table already joined, not just the one immediately before it:

```sql
SELECT s.forename, t.tutor_name, g.module, g.score
FROM students s
INNER JOIN tutor_groups t ON s.tutor_group_id = t.tutor_group_id
INNER JOIN grades g ON s.student_id = g.student_id
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

### 13. OR, NOT, IN, BETWEEN and parentheses

```sql
-- Students in tutor group 1 OR tutor group 3
SELECT forename, surname, tutor_group_id FROM students
WHERE tutor_group_id = 1 OR tutor_group_id = 3

-- Same result, using IN
SELECT forename, surname, tutor_group_id FROM students
WHERE tutor_group_id IN (1, 3)

-- Everyone except tutor group 1
SELECT forename, surname, tutor_group_id FROM students
WHERE NOT tutor_group_id = 1

-- Same result, using NOT IN
SELECT forename, surname, tutor_group_id FROM students
WHERE tutor_group_id NOT IN (1)

-- Scores in the Merit band (inclusive of both ends)
SELECT students.forename, students.surname, grades.score
FROM students
INNER JOIN grades ON students.student_id = grades.student_id
WHERE grades.score BETWEEN 70 AND 89

-- AND binds tighter than OR, so this reads as
-- (tutor_group_id = 1 AND surname = 'Smith') OR surname = 'Brown'
SELECT forename, surname, tutor_group_id FROM students
WHERE tutor_group_id = 1 AND surname = 'Smith' OR surname = 'Brown'

-- Use parentheses to force OR to be evaluated first:
-- (surname = 'Smith' OR surname = 'Brown') AND tutor_group_id = 2
SELECT forename, surname, tutor_group_id FROM students
WHERE (surname = 'Smith' OR surname = 'Brown') AND tutor_group_id = 2

-- NOT can negate a whole parenthesized group
SELECT forename, surname, tutor_group_id FROM students
WHERE NOT (tutor_group_id = 1 OR tutor_group_id = 3)
```

### 14. Subqueries

Subqueries are always **uncorrelated**: the inner query is self-contained and can't reference the outer query's tables or columns.

```sql
-- IN (subquery): students who have at least one grade of 95 or above
SELECT forename, surname FROM students
WHERE student_id IN (SELECT student_id FROM grades WHERE score >= 95)

-- NOT IN (subquery): students with no grade below 70
SELECT forename, surname FROM students
WHERE student_id NOT IN (SELECT student_id FROM grades WHERE score < 70)

-- Scalar subquery: a subquery used as a single comparison value.
-- It must return exactly one row and one column - if it might return
-- more than one row, use IN instead.
SELECT forename, surname FROM students
WHERE tutor_group_id = (SELECT tutor_group_id FROM tutor_groups WHERE room = 'B12')

-- EXISTS / NOT EXISTS: true if the subquery returns any row at all
-- (what it selects doesn't matter, only whether a row comes back)
SELECT forename FROM students
WHERE EXISTS (SELECT student_id FROM grades WHERE score >= 95)

-- Derived table: a subquery used as a FROM-clause table. It must have an
-- alias, and any aggregate in its SELECT list must have one too, since
-- that's the only name the outer query can refer to it by.
SELECT t.tutor_group_id, t.avg_score
FROM (
  SELECT students.tutor_group_id, AVG(grades.score) AS avg_score
  FROM students
  INNER JOIN grades ON students.student_id = grades.student_id
  GROUP BY students.tutor_group_id
) t
ORDER BY t.avg_score DESC

-- A derived table can still be INNER JOINed to a real table
SELECT t.tutor_group_id, g.tutor_name
FROM (SELECT DISTINCT tutor_group_id FROM students) t
INNER JOIN tutor_groups g ON t.tutor_group_id = g.tutor_group_id
```

**Not supported:** correlated subqueries (a subquery referencing the outer query's tables), a derived table as a JOIN target, subqueries in the SELECT list, and a literal in a subquery's SELECT list (e.g. `SELECT 1 FROM ...` - project a real column instead, e.g. `SELECT student_id FROM ...`, since only what `EXISTS` cares about is whether a row comes back).

### 15. HAVING

`WHERE` filters individual rows *before* grouping; `HAVING` filters groups *after* grouping, and is the only place aggregate functions can appear in a condition (they don't make sense in `WHERE`, since grouping hasn't happened yet).

```sql
-- Tutor groups with more than 3 students
SELECT tutor_group_id, COUNT(*) FROM students
GROUP BY tutor_group_id
HAVING COUNT(*) > 3

-- Modules with an average score of 80 or above
SELECT module, AVG(score) FROM grades
GROUP BY module
HAVING AVG(score) >= 80

-- WHERE, GROUP BY and HAVING all together: only count scores of 70+,
-- then keep modules where that count is more than 5
SELECT module, COUNT(*) FROM grades
WHERE score >= 70
GROUP BY module
HAVING COUNT(*) > 5

-- HAVING can AND/OR/NOT multiple conditions together, same as WHERE
SELECT module, COUNT(*), AVG(score) FROM grades
GROUP BY module
HAVING COUNT(*) > 5 AND AVG(score) >= 75

-- A HAVING condition can also reference a plain GROUP BY column directly,
-- not just an aggregate
SELECT tutor_group_id, COUNT(*) FROM students
GROUP BY tutor_group_id
HAVING tutor_group_id != 2
```

**Rule:** a column used in `HAVING` (outside of an aggregate function) must be one of the `GROUP BY` columns - the same rule that already applies to plain columns in the `SELECT` list of a grouped query.

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
- **UNSUPPORTED_FEATURE**: Feature not yet implemented (e.g., LEFT JOIN, CASE)

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
- CASE expressions
- CREATE TEMP TABLE
- Correlated subqueries
- Visual query explanation/execution plan

## Testing

Automated suite (Node):

```bash
npm test
```

Key automated checks include DISTINCT, BOOLEAN/NULL handling, NOT NULL and PRIMARY KEY enforcement, AUTO_INCREMENT progression, and type validation.

Quick manual smoke tests:

1. ✅ `SELECT DISTINCT tutor_group_id FROM students` (should return 3 rows)
2. ✅ `SELECT * FROM students WHERE FALSE` (should return 0 rows)
3. ✅ `CREATE TABLE t (id INT PRIMARY KEY AUTO_INCREMENT, ok BOOLEAN NOT NULL); INSERT INTO t (ok) VALUES (TRUE); SELECT * FROM t;` (id should start at 1, ok true)
4. ✅ `INSERT INTO students (...)` (should fail – protected table)
5. ✅ `SELECT COUNT(*) FROM students` (should return 10)

## License

Educational project for learning SQL concepts.

