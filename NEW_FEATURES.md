# SQLSim New Features Guide

## Recent Updates

### 1. ✅ Attendance Table Removed
The `attendance` table has been removed from the default schema. The database now contains only:
- `students` (protected)
- `tutor_groups` (protected)
- `grades` (protected)

### 2. ✅ Column Aliases (AS)
You can now use aliases for columns in SELECT statements to make results more readable.

**Examples:**
```sql
-- Using AS keyword
SELECT forename AS first_name, surname AS last_name 
FROM students;

-- Without AS keyword (also supported)
SELECT forename first_name, surname last_name 
FROM students;

-- With aggregate functions
SELECT COUNT(*) AS total_students 
FROM students;

SELECT AVG(score) AS average_score 
FROM grades 
WHERE module = 'Programming';
```

### 3. ✅ CREATE TABLE
Create your own custom tables to practice with!

**Syntax:**
```sql
CREATE TABLE table_name (
  column1 type,
  column2 type,
  ...
);
```

**Supported Types:**
- `number`, `int`, `integer`, `float`, `real` (all converted to number)
- `string`, `varchar`, `text` (all converted to string)

**Examples:**
```sql
-- Create a simple table
CREATE TABLE my_contacts (
  contact_id number,
  name string,
  email string
);

-- Create a products table
CREATE TABLE products (
  product_id int,
  product_name varchar,
  price float,
  in_stock string
);
```

### 4. ✅ ALTER TABLE
Modify your custom tables by adding new columns.

**Syntax:**
```sql
ALTER TABLE table_name ADD COLUMN column_name type;
-- or
ALTER TABLE table_name ADD column_name type;
```

**Examples:**
```sql
-- Add a phone column to contacts
ALTER TABLE my_contacts ADD COLUMN phone string;

-- Add a category to products
ALTER TABLE products ADD category string;
```

**Note:** You can only alter tables you've created - the protected tables (`students`, `tutor_groups`, `grades`) cannot be altered.

### 5. ✅ INSERT INTO
Add data to your custom tables.

**Syntax:**
```sql
INSERT INTO table_name (column1, column2, ...) 
VALUES (value1, value2, ...);
```

**Examples:**
```sql
-- Insert a contact
INSERT INTO my_contacts (contact_id, name, email) 
VALUES (1, 'John Smith', 'john@example.com');

-- Insert another contact
INSERT INTO my_contacts (contact_id, name, email, phone) 
VALUES (2, 'Jane Doe', 'jane@example.com', '555-1234');

-- Insert a product
INSERT INTO products (product_id, product_name, price, in_stock) 
VALUES (1, 'Laptop', 999.99, 'Yes');
```

**Note:** You can only insert into tables you've created - the protected tables cannot be modified.

### 6. ✅ UPDATE
Modify existing data in your custom tables.

**Syntax:**
```sql
UPDATE table_name 
SET column1 = value1, column2 = value2, ...
WHERE condition;
```

**Examples:**
```sql
-- Update a specific contact's email
UPDATE my_contacts 
SET email = 'john.smith@newdomain.com' 
WHERE contact_id = 1;

-- Update product price
UPDATE products 
SET price = 899.99 
WHERE product_id = 1;

-- Update multiple columns
UPDATE products 
SET price = 799.99, in_stock = 'No' 
WHERE product_name = 'Laptop';
```

**Note:** You can only update tables you've created - the protected tables cannot be modified.

### 7. ✅ DELETE FROM
Remove data from your custom tables.

**Syntax:**
```sql
DELETE FROM table_name WHERE condition;
```

**Examples:**
```sql
-- Delete a specific contact
DELETE FROM my_contacts WHERE contact_id = 2;

-- Delete products over a certain price
DELETE FROM products WHERE price > 1000;

-- Delete all rows (use with caution!)
DELETE FROM my_contacts;
```

**Note:** You can only delete from tables you've created - the protected tables cannot be modified.

### 8. ✅ TRUE and FALSE Keywords
Use boolean literals in WHERE clauses for testing and logic!

**Examples:**
```sql
-- Return all rows
SELECT * FROM students WHERE TRUE;

-- Return no rows (useful for testing)
SELECT * FROM students WHERE FALSE;

-- Combine with AND for conditional testing
SELECT * FROM students WHERE TRUE AND surname = 'Smith';

-- Use in INSERT/UPDATE
INSERT INTO my_table (id, active) VALUES (1, TRUE);
UPDATE my_table SET active = FALSE WHERE id = 1;
```

**Note:** TRUE evaluates to 1 and FALSE evaluates to 0 internally.

### 9. ✅ DROP TABLE
Remove tables you've created when you're done practicing!

**Syntax:**
```sql
DROP TABLE table_name;
```

**Examples:**
```sql
-- Remove a custom table
DROP TABLE contacts;

-- Clean up after testing
DROP TABLE test_scores;
```

**Note:** You can only DROP tables you created - the protected tables (students, tutor_groups, grades) cannot be dropped.

### 10. ✅ Semicolon Support
End your statements with a semicolon (;) just like in real SQL!

**Examples:**
```sql
-- All statements can end with semicolon
SELECT * FROM students;
CREATE TABLE test (id number);
INSERT INTO test (id) VALUES (1);
UPDATE test SET id = 2 WHERE id = 1;
DELETE FROM test WHERE id = 2;
DROP TABLE test;

-- Semicolon is optional - both work
SELECT * FROM students;
SELECT * FROM students
```

### 8. ✅ Print/Export Reports
Students can now create professional reports showing their queries and results!

**How to Use:**
1. Execute your SQL query
2. Click the **"🖨️ Print Report"** button in the Results panel
3. A new window will open with a formatted report containing:
   - Your SQL query
   - The results table
   - Timestamp
   - Row count

**To Save as PDF:**
1. In the print dialog, select "Save as PDF" or "Microsoft Print to PDF"
2. Choose a location and filename
3. Click Save

**Perfect for:**
- Submitting homework assignments
- Creating study materials
- Documenting your work
- Sharing results with instructors

## Complete Practice Example

Here's a complete workflow using all the new features:

```sql
-- 1. Create a custom table for tracking assignments
CREATE TABLE assignments (
  assignment_id number,
  student_id number,
  assignment_name string,
  grade number
);

-- 2. Add a submission date column
ALTER TABLE assignments ADD submitted_date string;

-- 3. Insert some data
INSERT INTO assignments (assignment_id, student_id, assignment_name, grade, submitted_date) 
VALUES (1, 1, 'SQL Homework 1', 95, '2026-01-15');

INSERT INTO assignments (assignment_id, student_id, assignment_name, grade, submitted_date) 
VALUES (2, 1, 'SQL Homework 2', 88, '2026-01-22');

INSERT INTO assignments (assignment_id, student_id, assignment_name, grade, submitted_date) 
VALUES (3, 2, 'SQL Homework 1', 92, '2026-01-16');

-- 4. Query with aliases
SELECT 
  student_id AS StudentID,
  assignment_name AS Assignment,
  grade AS Score,
  submitted_date AS SubmittedOn
FROM assignments
WHERE grade >= 90
ORDER BY grade DESC;

-- 5. Update a grade
UPDATE assignments 
SET grade = 90 
WHERE assignment_id = 2;

-- 6. Calculate average with alias
SELECT 
  student_id,
  AVG(grade) AS AverageGrade
FROM assignments
GROUP BY student_id;

-- 7. Clean up - delete low scores
DELETE FROM assignments WHERE grade < 85;

-- 8. Click "Print Report" to save your results!
```

## Tips & Best Practices

1. **Use aliases** to make your results more readable and professional
2. **Always use WHERE clauses** with UPDATE and DELETE to avoid modifying all rows
3. **Test your queries** with SELECT before running UPDATE or DELETE
4. **Use TRUE/FALSE** for testing queries before adding real conditions
5. **DROP TABLE** when you're done with test tables to keep things clean
6. **Use semicolons** to make your SQL more standard and professional
7. **Use the Print Report feature** to save your work as you progress
8. **Reset the database** using the Reset button if you want to start fresh
9. **Protected tables** (students, tutor_groups, grades) are read-only to preserve the learning environment

## Troubleshooting

**"Table already exists"**
- Use a different table name or reset the database

**"Cannot modify protected table"**
- The default tables are read-only. Create your own tables to practice INSERT/UPDATE/DELETE

**"Column does not exist"**
- Check spelling and use the Tables panel to verify column names

**"Column count does not match value count"**
- Make sure you have the same number of values as columns in your INSERT statement

## Need Help?

Click the **"📚 Guide"** button in the bottom-right corner for the full student guide!

---

**Happy Querying!** 🎓
