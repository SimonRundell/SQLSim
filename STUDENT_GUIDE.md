# 🎓 Student Guide: Using the SQL Simulator

## Getting Started

The SQL Simulator is now running at **http://localhost:5174**

You'll see three main areas:
1. **Left Panel**: Source tables with their data
2. **Center**: SQL query editor
3. **Right/Bottom**: Query results or errors

## Your First Query

A sample query is already loaded. Click the green **▶ Run Query** button to execute it!

```sql
SELECT students.forename, students.surname, tutor_groups.tutor_name
FROM students
INNER JOIN tutor_groups ON students.tutor_group_id = tutor_groups.tutor_group_id
WHERE tutor_groups.room = 'B12'
ORDER BY students.surname ASC
LIMIT 20
```

This query:
- Selects student names and their tutor
- Joins the students and tutor_groups tables
- Filters for only students in room 'B12'
- Orders results by surname
- Limits to 20 results

## Understanding the Tables

### 📚 students
Contains 10 students with columns:
- `student_id` - Unique student number
- `forename` - First name
- `surname` - Last name
- `tutor_group_id` - Links to tutor_groups table

### 👥 tutor_groups  
Contains 3 tutor groups with columns:
- `tutor_group_id` - Unique group number
- `tutor_name` - Name of the tutor
- `room` - Room location

### 📊 grades
Contains assessment scores with columns:
- `student_id` - Links to students table
- `module` - Module name
- `paper` - Paper number
- `score` - Numeric score

## Writing Queries

### Important Syntax Rules

✅ **DO THIS:**
- Use single quotes for strings: `'Smith'`
- Use bare column names: `surname`
- Keywords can be any case: `SELECT`, `select`, `Select`
- Use DISTINCT when you want unique rows: `SELECT DISTINCT tutor_group_id FROM students`
- End with a semicolon if you like: `SELECT * FROM students;` (optional)

❌ **DON'T DO THIS:**
- Double quotes: `"Smith"` ← Use single quotes instead
- Backticks: `` `surname` `` ← Not supported
- OR / NOT / IN / BETWEEN ← Not supported yet

### Query Structure

```sql
SELECT column1, column2          -- What columns to show
FROM table_name                  -- Which table to query
INNER JOIN other_table          -- Join another table (optional)
  ON table1.id = table2.id      -- How to join them
WHERE column = 'value'          -- Filter rows (optional)
  AND other_column = 123        -- More filters
ORDER BY column ASC             -- Sort results (optional)
LIMIT 10                        -- Limit number of rows (optional)
```

## Example Queries to Try

### Beginner Queries

**1. See all students:**
```sql
SELECT * FROM students
```

**2. See just names:**
```sql
SELECT forename, surname FROM students
```

**3. Find students named Smith:**
```sql
SELECT forename, surname FROM students WHERE surname = 'Smith'
```

### Intermediate Queries

**4. Students with their tutors:**
```sql
SELECT students.forename, students.surname, tutor_groups.tutor_name
FROM students
INNER JOIN tutor_groups ON students.tutor_group_id = tutor_groups.tutor_group_id
```

**5. Students in a specific room:**
```sql
SELECT students.forename, students.surname, tutor_groups.room
FROM students
INNER JOIN tutor_groups ON students.tutor_group_id = tutor_groups.tutor_group_id
WHERE tutor_groups.room = 'A5'
```

**6. Sort students by surname:**
```sql
SELECT forename, surname FROM students ORDER BY surname ASC
```

**7. Get unique tutor groups:**
```sql
SELECT DISTINCT tutor_group_id FROM students ORDER BY tutor_group_id
```

### Advanced Queries

**7. Attendance records with student names:**
```sql
SELECT students.forename, students.surname, attendance.session_date, attendance.present
FROM students
INNER JOIN attendance ON students.student_id = attendance.student_id
ORDER BY attendance.session_date DESC
```

**8. Multiple filters:**
```sql
SELECT forename, surname, tutor_group_id 
FROM students 
WHERE tutor_group_id = 1 AND surname = 'Smith'
```

**9. Boolean + aggregate example:**
```sql
SELECT COUNT(*) AS total_students
FROM students
WHERE TRUE
```

## Working with Your Own Tables

Create tables with constraints and types:

```sql
CREATE TABLE tasks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(100) NOT NULL,
  done BOOLEAN NOT NULL
);

INSERT INTO tasks (title, done) VALUES ('Write SQL', FALSE);
INSERT INTO tasks (title, done) VALUES ('Celebrate', TRUE);

SELECT DISTINCT done FROM tasks;
```

- **Types:** INT/DECIMAL/FLOAT/NUMERIC → numbers, VARCHAR/CHAR/TEXT → strings, BOOLEAN for true/false
- **Constraints:** PRIMARY KEY + AUTO_INCREMENT make a unique, non-null id; use NOT NULL to require values; NULL is allowed when you declare it or leave it unconstrained
- **Protected tables:** `students`, `tutor_groups`, and `grades` cannot be altered, dropped, or written to

## Understanding Errors

### AMBIGUOUS_COLUMN
**Problem:** Column name exists in multiple tables
```sql
-- ❌ This fails:
SELECT tutor_group_id
FROM students
INNER JOIN tutor_groups ON students.tutor_group_id = tutor_groups.tutor_group_id

-- ✅ Fix it by qualifying the column:
SELECT students.tutor_group_id
FROM students
INNER JOIN tutor_groups ON students.tutor_group_id = tutor_groups.tutor_group_id
```

### UNKNOWN_COLUMN
**Problem:** Column doesn't exist in any table
```sql
-- ❌ This fails:
SELECT foo FROM students

-- ✅ Check the table panel for correct column names
```

### SYNTAX_ERROR
**Problem:** Query has incorrect syntax
```sql
-- ❌ Using double quotes:
SELECT * FROM students WHERE surname = "Smith"

-- ✅ Use single quotes:
SELECT * FROM students WHERE surname = 'Smith'
```

### UNSUPPORTED_FEATURE
**Problem:** Using SQL features not in this MVP
```sql
-- ❌ These don't work yet:
SELECT * FROM students WHERE surname LIKE 'S%' OR tutor_group_id = 1  -- OR not supported
SELECT * FROM students WHERE tutor_group_id IN (1, 2)                 -- IN not supported
SELECT * FROM students WHERE score BETWEEN 70 AND 90                  -- BETWEEN not supported
SELECT * FROM students LEFT JOIN tutor_groups ON ...                  -- Outer joins not supported
SELECT * FROM students s                                              -- Table aliases not supported
```

### CONSTRAINT VIOLATION
**Problem:** Column rules or table protections were broken
```sql
-- ❌ NOT NULL rejected
CREATE TABLE people (id INT PRIMARY KEY, name TEXT NOT NULL);
INSERT INTO people (id, name) VALUES (1, NULL); -- Error: name cannot be NULL

-- ❌ Duplicate primary key
INSERT INTO people (id, name) VALUES (1, 'Second'); -- Error: duplicate primary key value

-- ❌ Protected table
INSERT INTO students (student_id, forename) VALUES (999, 'Test'); -- Error: protected table
```

## Tips for Learning

1. **Start Simple**: Begin with `SELECT * FROM tablename`
2. **Add One Feature at a Time**: Add WHERE, then JOIN, then ORDER BY
3. **Read the Errors**: Error messages tell you exactly what's wrong
4. **Use Table Names**: When joining, always use `table.column` to be clear
5. **Experiment**: Try breaking things to understand how SQL works!

## Practice Exercises

### Exercise 1: Basic SELECT
Find all students in tutor group 2.

<details>
<summary>Click to see answer</summary>

```sql
SELECT * FROM students WHERE tutor_group_id = 2
```
</details>

### Exercise 2: Joining Tables
List all students with their tutor's name, sorted by student surname.

<details>
<summary>Click to see answer</summary>

```sql
SELECT students.forename, students.surname, tutor_groups.tutor_name
FROM students
INNER JOIN tutor_groups ON students.tutor_group_id = tutor_groups.tutor_group_id
ORDER BY students.surname ASC
```
</details>

### Exercise 3: Complex Filter
Find students in room 'C3' whose surname starts with 'M' (there's only one!).

<details>
<summary>Click to see answer</summary>

```sql
SELECT students.forename, students.surname, tutor_groups.room
FROM students
INNER JOIN tutor_groups ON students.tutor_group_id = tutor_groups.tutor_group_id
WHERE tutor_groups.room = 'C3' AND students.surname = 'Moore'
```
</details>

## Need Help?

- Check [README.md](README.md) for supported SQL syntax
- Look at [SAMPLE_QUERIES.sql](SAMPLE_QUERIES.sql) for more examples
- Use the **↺ Reset** button to restore the default query

## What's NOT Supported (Yet)

This is an MVP (Minimum Viable Product), so these features aren't available:
- ❌ LEFT JOIN, RIGHT JOIN
- ❌ Multiple JOINs in one query
- ❌ OR, NOT operators
- ❌ GROUP BY, COUNT, SUM, AVG
- ❌ LIKE, IN, BETWEEN
- ❌ Comparison operators: >, <, >=, <=, !=
- ❌ Table aliases (AS)

These might be added in future versions!

---

**Happy Querying! 🚀**
