# 🎓 Student Guide: SQLSim

This guide walks through SQL from first principles up to the full set of features SQLSim
supports, in the order you should learn them. It's also the basis for the interactive
**📚 Guide** panel inside the app, where every example can be loaded straight into the query
editor with one click.

## Contents

1. [Getting Started](#1-getting-started)
2. [The Sample Data](#2-the-sample-data)
3. [Your First Query](#3-your-first-query)
4. [Filtering Rows with WHERE](#4-filtering-rows-with-where)
5. [Comparison Operators](#5-comparison-operators)
6. [Pattern Matching with LIKE](#6-pattern-matching-with-like)
7. [Combining Conditions: AND, OR, NOT](#7-combining-conditions-and-or-not)
8. [IN, BETWEEN and Parentheses](#8-in-between-and-parentheses)
9. [Sorting, Limiting and De-duplicating](#9-sorting-limiting-and-de-duplicating)
10. [Aliases](#10-aliases)
11. [Joining Tables](#11-joining-tables)
12. [Aggregate Functions](#12-aggregate-functions)
13. [GROUP BY](#13-group-by)
14. [HAVING](#14-having)
15. [Subqueries](#15-subqueries)
16. [Changing Data: CREATE, INSERT, UPDATE, DELETE](#16-changing-data-create-insert-update-delete)
17. [Reading Error Messages](#17-reading-error-messages)
18. [What's Not Supported](#18-whats-not-supported)

---

## 1. Getting Started

SQLSim runs entirely in your browser. You'll see three areas:

1. **Left panel** - the source tables and their data
2. **Centre** - the SQL query editor, with **▶ Run Query**, **✕ Clear** and **↺ Reset** buttons
3. **Below the editor** - your results, or a clear error message if something went wrong

Type a query, click **▶ Run Query**, and read the results. **✕ Clear** empties the editor.
**↺ Reset** puts everything back to how it started, including any tables you created.

SQL itself is a language for asking questions of data held in tables. You write what you
want (`SELECT the names of students in tutor group 1`), not the steps to get it - the engine
works out how.

## 2. The Sample Data

Three tables are preloaded:

### 📚 students
| Column | Meaning |
|---|---|
| `student_id` | Unique number for each student |
| `forename` | First name |
| `surname` | Last name |
| `tutor_group_id` | Which tutor group they belong to |

### 👥 tutor_groups
| Column | Meaning |
|---|---|
| `tutor_group_id` | Unique number for each tutor group |
| `tutor_name` | The tutor's name |
| `room` | Where the group meets |

### 📊 grades
| Column | Meaning |
|---|---|
| `student_id` | Which student this grade belongs to |
| `module` | Module name |
| `paper` | Paper number (1, 2 or 3) |
| `score` | Score out of 100 |

`students.tutor_group_id` and `grades.student_id` each point back to another table's unique
identifier - that's what makes a JOIN possible later (see [section 11](#11-joining-tables)).

## 3. Your First Query

```sql
SELECT * FROM students
```

`SELECT *` means "give me every column". `FROM students` means "from the students table".
Run it and you'll get all 10 rows, every column.

Usually you don't want every column, just the ones you care about:

```sql
SELECT forename, surname FROM students
```

You can add comments to a query - they're ignored when it runs, so use them to leave notes
for yourself or explain what a query does. `--` comments out everything to the end of that
line; `/* ... */` comments out everything between the two markers, even across several lines:

```sql
-- Find students in tutor group 1
SELECT forename, surname
FROM students
WHERE tutor_group_id = 1 /* this comment can span
multiple lines */
```

**Try it:** select just `tutor_name` and `room` from `tutor_groups`.

## 4. Filtering Rows with WHERE

`WHERE` keeps only the rows matching a condition:

```sql
SELECT forename, surname FROM students WHERE surname = 'Smith'
```

Strings always use **single** quotes (`'Smith'`, not `"Smith"`). Column names are bare words,
no quotes at all.

**Try it:** find every student in tutor group `2`.

## 5. Comparison Operators

| Operator | Meaning |
|---|---|
| `=` | Equal to |
| `!=` or `<>` | Not equal to |
| `<` | Less than |
| `<=` | Less than or equal to |
| `>` | Greater than |
| `>=` | Greater than or equal to |

```sql
SELECT * FROM grades WHERE score >= 90
```

**Try it:** find every grade record with a `score` below `50`.

## 6. Pattern Matching with LIKE

`LIKE` matches text patterns, where `%` stands for "any sequence of characters (including
none)":

```sql
SELECT forename, surname FROM students WHERE surname LIKE 'S%'   -- starts with S
SELECT forename, surname FROM students WHERE surname LIKE '%son' -- ends with son
SELECT forename, surname FROM students WHERE surname LIKE '%o%'  -- contains o anywhere
```

**Try it:** find every module in `grades` containing the word `Data`.

## 7. Combining Conditions: AND, OR, NOT

```sql
-- Both must be true
SELECT * FROM students WHERE tutor_group_id = 1 AND surname = 'Smith'

-- Either can be true
SELECT * FROM students WHERE surname = 'Smith' OR surname = 'Brown'

-- Negates the condition that follows
SELECT * FROM students WHERE NOT tutor_group_id = 1
```

**Try it:** find students whose surname is `Smith` OR whose `tutor_group_id` is `3`.

## 8. IN, BETWEEN and Parentheses

`IN` checks against a list of values in one go, `BETWEEN` checks an inclusive range, and
parentheses `( )` control the order conditions are worked out in - both `IN` and `BETWEEN`
can be negated with `NOT`:

```sql
SELECT * FROM students WHERE tutor_group_id IN (1, 3)

SELECT * FROM grades WHERE score BETWEEN 70 AND 89

SELECT * FROM students WHERE tutor_group_id NOT IN (1)
```

Without parentheses, `AND` is always worked out before `OR`, and `NOT` before that:

```sql
-- Reads as (surname = 'Smith' AND tutor_group_id = 1) OR surname = 'Brown'
WHERE surname = 'Smith' AND tutor_group_id = 1 OR surname = 'Brown'

-- Parentheses change that: OR happens first, then the whole result is ANDed
WHERE (surname = 'Smith' OR surname = 'Brown') AND tutor_group_id = 2
```

**Try it:** find every grade `BETWEEN 70 AND 100`.

## 9. Sorting, Limiting and De-duplicating

```sql
SELECT forename, surname FROM students ORDER BY surname ASC   -- A-Z (DESC for Z-A)

SELECT forename, surname FROM students ORDER BY surname ASC LIMIT 5

SELECT DISTINCT tutor_group_id FROM students  -- unique values only
```

**Try it:** list every student ordered by `surname`, then `LIMIT` it to the first 3.

## 10. Aliases

`AS` renames a column or table in the output - `AS` is optional, you can just put the alias
straight after:

```sql
SELECT forename AS FirstName, surname AS LastName FROM students

SELECT forename first_name, surname last_name FROM students   -- same thing, no AS
```

Table aliases make joins far less to type (see the next section) - once a table has an
alias, use the alias everywhere in that query, not the original name.

## 11. Joining Tables

A JOIN combines rows from two tables using a shared value: a **foreign key** (FK) in one
table that points to a **primary key** (PK) in another.

```
   students                              tutor_groups
┌──────────────────┐                  ┌──────────────────┐
│ student_id        │                  │ tutor_group_id PK│
│ forename           │                  │ tutor_name        │
│ surname             │        ┌───────▶│ room               │
│ tutor_group_id  FK │────────┘         └──────────────────┘
└──────────────────┘
```

Every student's `tutor_group_id` (FK) matches exactly one row's `tutor_group_id` (PK) in
`tutor_groups`. `INNER JOIN ... ON` tells SQL which two columns to match up:

```sql
SELECT students.forename, students.surname, tutor_groups.tutor_name
FROM students
INNER JOIN tutor_groups ON students.tutor_group_id = tutor_groups.tutor_group_id
```

When a column name exists in both tables (like `tutor_group_id` here), you must qualify it
with the table name - otherwise SQL can't tell which one you mean (an `AMBIGUOUS_COLUMN`
error). With aliases, the same query reads:

```sql
SELECT s.forename, s.surname, t.tutor_name
FROM students s
INNER JOIN tutor_groups t ON s.tutor_group_id = t.tutor_group_id
```

**Try it:** join `students` to `grades` (on `student_id`), and select `forename`, `module`
and `score`.

## 12. Aggregate Functions

Aggregate functions summarise many rows into one value:

| Function | Meaning |
|---|---|
| `COUNT(*)` | Count all rows |
| `COUNT(column)` | Count non-null values |
| `SUM(column)` | Total of numeric values |
| `AVG(column)` | Average of numeric values |
| `MIN(column)` / `MAX(column)` | Smallest / largest value |

```sql
SELECT COUNT(*) FROM students
SELECT AVG(score) FROM grades
```

**Try it:** find the `MAX(score)` in `grades`.

## 13. GROUP BY

`GROUP BY` splits rows into groups (one per distinct value) before an aggregate runs, so
you get one summary row per group instead of one for the whole table:

```sql
SELECT tutor_group_id, COUNT(*) FROM students GROUP BY tutor_group_id

SELECT module, AVG(score) FROM grades GROUP BY module ORDER BY AVG(score) DESC
```

**Rule:** once you `GROUP BY`, every column in the `SELECT` list must either be a `GROUP BY`
column or be wrapped in an aggregate function - SQL can't show a plain column's value for a
group that spans several different rows.

**Try it:** count how many grade records exist for each `module`.

## 14. HAVING

`WHERE` filters rows **before** grouping; `HAVING` filters groups **after** grouping - and
it's the only place an aggregate function can appear in a condition, since grouping hasn't
happened yet when `WHERE` runs:

```sql
-- Tutor groups with more than 3 students
SELECT tutor_group_id, COUNT(*) FROM students
GROUP BY tutor_group_id
HAVING COUNT(*) > 3

-- WHERE, GROUP BY and HAVING together
SELECT module, COUNT(*) FROM grades
WHERE score >= 70
GROUP BY module
HAVING COUNT(*) > 5
```

**Try it:** find every `module` with an average `score` of at least `80`.

## 15. Subqueries

A subquery is a complete `SELECT` written inside another query. Every subquery here is
**uncorrelated** - self-contained, unable to refer to the outer query's tables.

```sql
-- IN (subquery): students with at least one grade of 95+
SELECT forename, surname FROM students
WHERE student_id IN (SELECT student_id FROM grades WHERE score >= 95)

-- Scalar subquery: must return exactly one row and one column
SELECT forename, surname FROM students
WHERE tutor_group_id = (SELECT tutor_group_id FROM tutor_groups WHERE room = 'B12')

-- EXISTS: true if the subquery returns any row at all - which column doesn't matter
SELECT forename FROM students
WHERE EXISTS (SELECT student_id FROM grades WHERE score >= 95)

-- Derived table: a subquery used as a FROM-clause table (needs an alias)
SELECT t.tutor_group_id, t.avg_score
FROM (
  SELECT students.tutor_group_id, AVG(grades.score) AS avg_score
  FROM students
  INNER JOIN grades ON students.student_id = grades.student_id
  GROUP BY students.tutor_group_id
) t
ORDER BY t.avg_score DESC
```

**Try it:** find students whose `student_id` is `NOT IN` a subquery selecting `student_id`
from `grades` where `score < 70` - in other words, students with no grade below 70.

## 16. Changing Data: CREATE, INSERT, UPDATE, DELETE

`students`, `tutor_groups` and `grades` are **protected** - read-only. To practise changing
data, create your own table first:

```sql
CREATE TABLE tasks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(100) NOT NULL,
  done BOOLEAN NOT NULL
);

INSERT INTO tasks (title, done) VALUES ('Write SQL', FALSE);
INSERT INTO tasks (title, done) VALUES ('Celebrate', TRUE);

UPDATE tasks SET done = TRUE WHERE title = 'Write SQL';

DELETE FROM tasks WHERE done = TRUE;

SELECT * FROM tasks;
```

- **Types:** `INT`/`DECIMAL`/`FLOAT`/`NUMERIC` → number, `VARCHAR`/`CHAR`/`TEXT` → string,
  `BOOLEAN` → true/false
- **PRIMARY KEY** must be unique and non-null; **AUTO_INCREMENT** fills it in automatically
  when you omit it; **NOT NULL** makes a value required
- `ALTER TABLE tasks ADD COLUMN priority INT` adds a column to a table you created
- `DROP TABLE tasks` removes a table you created entirely

**Try it:** create a `notes` table with an auto-incrementing `id` and a `NOT NULL` `text`
column, then insert one row into it.

## 17. Reading Error Messages

SQLSim's errors are meant to be readable, not cryptic:

| Code | Means | Fix |
|---|---|---|
| `SYNTAX_ERROR` | The query doesn't parse | Check quotes, commas, keyword spelling |
| `UNKNOWN_TABLE` | That table doesn't exist | Check the left panel for the real name |
| `UNKNOWN_COLUMN` | That column doesn't exist in any table in scope | Check spelling |
| `AMBIGUOUS_COLUMN` | The column exists in more than one joined table | Qualify it: `table.column` |
| `UNSUPPORTED_FEATURE` | Real SQL, but not implemented here | See [section 18](#18-whats-not-supported) |

```sql
-- ❌ AMBIGUOUS_COLUMN: tutor_group_id is in both tables
SELECT tutor_group_id FROM students INNER JOIN tutor_groups ON students.tutor_group_id = tutor_groups.tutor_group_id

-- ✅ Qualify it
SELECT students.tutor_group_id FROM students INNER JOIN tutor_groups ON students.tutor_group_id = tutor_groups.tutor_group_id
```

## 18. What's Not Supported

This is a teaching tool covering the core of SQL, not the whole standard. Not available:

- ❌ LEFT JOIN, RIGHT JOIN, FULL OUTER JOIN (only `INNER JOIN`)
- ❌ Multiple JOINs in a single query
- ❌ Correlated subqueries (one that refers back to the outer query)
- ❌ A derived table as a JOIN target (only in the main `FROM`)
- ❌ Subqueries in the `SELECT` list
- ❌ CASE statements

---

## Need Help?

- Check [README.md](README.md) for the full, technical reference of every supported feature
- Use the in-app **📚 Guide** for the same content with clickable, runnable examples
- Use **↺ Reset** to restore the default query and undo any tables you created

**Happy Querying! 🚀**
