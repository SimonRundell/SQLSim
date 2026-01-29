-- =====================================================
-- SQLSim Sample Queries - New Features Showcase
-- =====================================================

-- =====================================================
-- 1. COLUMN ALIASES (AS)
-- =====================================================

-- Basic alias with AS keyword
SELECT 
  forename AS FirstName, 
  surname AS LastName 
FROM students;

-- Alias without AS keyword
SELECT 
  forename first_name, 
  surname last_name 
FROM students
LIMIT 5;

-- Aliases with aggregate functions
SELECT 
  module,
  AVG(score) AS AverageScore,
  MIN(score) AS LowestScore,
  MAX(score) AS HighestScore,
  COUNT(*) AS TotalTests
FROM grades
WHERE module = 'Programming'
GROUP BY module;

-- Aliases in complex queries with JOINs
SELECT 
  s.forename AS StudentFirstName,
  s.surname AS StudentLastName,
  tg.tutor_name AS Tutor,
  tg.room AS TutorRoom
FROM students s
INNER JOIN tutor_groups tg ON s.tutor_group_id = tg.tutor_group_id
ORDER BY s.surname;


-- =====================================================
-- 2. CREATE TABLE - Build Your Own Tables
-- =====================================================

-- Create a simple contacts table
CREATE TABLE contacts (
  contact_id number,
  name string,
  email string
);

-- Create a products inventory table
CREATE TABLE inventory (
  product_id int,
  product_name varchar,
  quantity int,
  price float
);

-- Create a class schedule table
CREATE TABLE schedule (
  class_id number,
  class_name string,
  room string,
  day string,
  time string
);


-- =====================================================
-- 3. ALTER TABLE - Modify Your Tables
-- =====================================================

-- Add a phone column to contacts
ALTER TABLE contacts ADD COLUMN phone string;

-- Add a category to inventory
ALTER TABLE inventory ADD category string;

-- Add instructor to schedule
ALTER TABLE schedule ADD COLUMN instructor string;


-- =====================================================
-- 4. INSERT INTO - Add Data
-- =====================================================

-- Insert contacts
INSERT INTO contacts (contact_id, name, email, phone) 
VALUES (1, 'Alice Johnson', 'alice@example.com', '555-0101');

INSERT INTO contacts (contact_id, name, email, phone) 
VALUES (2, 'Bob Smith', 'bob@example.com', '555-0102');

INSERT INTO contacts (contact_id, name, email) 
VALUES (3, 'Carol White', 'carol@example.com');

-- Insert inventory items
INSERT INTO inventory (product_id, product_name, quantity, price, category) 
VALUES (1, 'Laptop', 15, 999.99, 'Electronics');

INSERT INTO inventory (product_id, product_name, quantity, price, category) 
VALUES (2, 'Mouse', 50, 19.99, 'Electronics');

INSERT INTO inventory (product_id, product_name, quantity, price, category) 
VALUES (3, 'Desk', 8, 299.99, 'Furniture');

-- Insert class schedules
INSERT INTO schedule (class_id, class_name, room, day, time, instructor) 
VALUES (1, 'Databases', 'A101', 'Monday', '09:00', 'Dr. Smith');

INSERT INTO schedule (class_id, class_name, room, day, time, instructor) 
VALUES (2, 'Programming', 'B205', 'Tuesday', '10:30', 'Prof. Jones');


-- =====================================================
-- 5. QUERY YOUR CUSTOM DATA WITH ALIASES
-- =====================================================

-- Query contacts with nice column names
SELECT 
  contact_id AS ID,
  name AS ContactName,
  email AS EmailAddress,
  phone AS PhoneNumber
FROM contacts;

-- Query inventory with calculations
SELECT 
  product_name AS Product,
  quantity AS InStock,
  price AS UnitPrice,
  category AS Category
FROM inventory
WHERE quantity > 10
ORDER BY price DESC;

-- Query schedule
SELECT 
  class_name AS Class,
  instructor AS Teacher,
  room AS Location,
  day AS Day,
  time AS Time
FROM schedule
ORDER BY day, time;


-- =====================================================
-- 6. UPDATE - Modify Data
-- =====================================================

-- Update contact phone
UPDATE contacts 
SET phone = '555-9999' 
WHERE contact_id = 3;

-- Update product price
UPDATE inventory 
SET price = 949.99 
WHERE product_name = 'Laptop';

-- Update multiple fields
UPDATE inventory 
SET quantity = 45, price = 17.99 
WHERE product_id = 2;

-- Update schedule room
UPDATE schedule 
SET room = 'C301' 
WHERE class_name = 'Programming';


-- =====================================================
-- 7. VERIFY UPDATES WITH SELECT
-- =====================================================

-- Check updated contact
SELECT 
  name AS ContactName,
  phone AS UpdatedPhone
FROM contacts 
WHERE contact_id = 3;

-- Check updated inventory
SELECT 
  product_name AS Product,
  price AS NewPrice,
  quantity AS Stock
FROM inventory;


-- =====================================================
-- 8. DELETE - Remove Data
-- =====================================================

-- Delete a specific contact
DELETE FROM contacts WHERE contact_id = 3;

-- Delete low stock items
DELETE FROM inventory WHERE quantity < 10;

-- Verify deletion
SELECT 
  product_name AS RemainingProducts,
  quantity AS Stock
FROM inventory;


-- =====================================================
-- 9. TRUE AND FALSE KEYWORDS
-- =====================================================

-- Return all rows using TRUE
SELECT * FROM students WHERE TRUE;

-- Return no rows using FALSE (useful for testing)
SELECT * FROM students WHERE FALSE;

-- Combine TRUE with AND for testing
SELECT 
  forename AS FirstName,
  surname AS LastName
FROM students 
WHERE TRUE AND surname LIKE 'S%';

-- Use FALSE to quickly disable a condition
SELECT * FROM grades 
WHERE FALSE AND module = 'Programming';

-- Use TRUE/FALSE in INSERT statements
CREATE TABLE task_list (
  task_id number,
  task_name string,
  completed number
);

INSERT INTO task_list (task_id, task_name, completed) 
VALUES (1, 'Complete SQL Assignment', FALSE);

INSERT INTO task_list (task_id, task_name, completed) 
VALUES (2, 'Review Database Design', TRUE);

INSERT INTO task_list (task_id, task_name, completed) 
VALUES (3, 'Practice JOINs', FALSE);

-- Query tasks
SELECT 
  task_name AS Task,
  CASE 
    WHEN completed = 1 THEN 'Done'
    ELSE 'Pending'
  END AS Status
FROM task_list;

-- Update using TRUE/FALSE
UPDATE task_list 
SET completed = TRUE 
WHERE task_id = 1;

-- Query only incomplete tasks
SELECT task_name AS IncompleteTasks
FROM task_list 
WHERE completed = FALSE;


-- =====================================================
-- 10. DROP TABLE - Clean Up
-- =====================================================

-- Drop tables you created (when done practicing)
DROP TABLE task_list;

-- Drop other test tables
DROP TABLE contacts;
DROP TABLE inventory;
DROP TABLE schedule;

-- Note: Protected tables cannot be dropped
-- DROP TABLE students;  -- This would give an error!


-- =====================================================
-- 11. SEMICOLON USAGE
-- =====================================================

-- All statements support optional semicolons
SELECT * FROM students;
SELECT * FROM tutor_groups;
SELECT * FROM grades;

-- Semicolons work with all DDL statements
CREATE TABLE test_semicolons (id number, value string);
ALTER TABLE test_semicolons ADD description string;
INSERT INTO test_semicolons (id, value) VALUES (1, 'Testing');
UPDATE test_semicolons SET value = 'Updated' WHERE id = 1;
DELETE FROM test_semicolons WHERE id = 1;
DROP TABLE test_semicolons;

-- Semicolons are optional - both styles work
CREATE TABLE style_test (id number)
INSERT INTO style_test (id) VALUES (1)
SELECT * FROM style_test
DROP TABLE style_test

-- Use semicolons for professional, standard SQL!


-- =====================================================
-- 12. COMPLEX EXAMPLE - Assignment Tracker
-- =====================================================

-- Create assignments table
CREATE TABLE student_assignments (
  assignment_id number,
  student_id number,
  assignment_name string,
  score number
);

-- Add due date column
ALTER TABLE student_assignments ADD due_date string;

-- Insert assignments
INSERT INTO student_assignments (assignment_id, student_id, assignment_name, score, due_date) 
VALUES (1, 1, 'SQL Basics', 95, '2026-02-01');

INSERT INTO student_assignments (assignment_id, student_id, assignment_name, score, due_date) 
VALUES (2, 1, 'Advanced Queries', 88, '2026-02-08');

INSERT INTO student_assignments (assignment_id, student_id, assignment_name, score, due_date) 
VALUES (3, 2, 'SQL Basics', 92, '2026-02-01');

INSERT INTO student_assignments (assignment_id, student_id, assignment_name, score, due_date) 
VALUES (4, 3, 'SQL Basics', 78, '2026-02-01');

-- Query with joins and aliases
SELECT 
  s.forename AS FirstName,
  s.surname AS LastName,
  sa.assignment_name AS Assignment,
  sa.score AS Grade,
  sa.due_date AS DueDate
FROM student_assignments sa
INNER JOIN students s ON sa.student_id = s.student_id
WHERE sa.score >= 85
ORDER BY sa.score DESC;

-- Calculate average by student
SELECT 
  s.forename AS FirstName,
  s.surname AS LastName,
  AVG(sa.score) AS AverageGrade,
  COUNT(*) AS AssignmentsCompleted
FROM student_assignments sa
INNER JOIN students s ON sa.student_id = s.student_id
GROUP BY s.student_id, s.forename, s.surname
ORDER BY AverageGrade DESC;


-- =====================================================
-- 13. PRINT YOUR RESULTS!
-- =====================================================

-- After running any query above, click the 
-- "🖨️ Print Report" button to create a professional
-- PDF report with your query and results!

-- This is perfect for:
--   - Homework submissions
--   - Portfolio documentation
--   - Study materials
--   - Sharing with instructors


-- =====================================================
-- PRACTICE WORKFLOW - Using All Features
-- =====================================================

-- 1. Create a table with semicolon
CREATE TABLE practice (id number, name string, active number);

-- 2. Add a column
ALTER TABLE practice ADD notes string;

-- 3. Insert data with TRUE/FALSE
INSERT INTO practice (id, name, active) VALUES (1, 'First Item', TRUE);
INSERT INTO practice (id, name, active) VALUES (2, 'Second Item', FALSE);

-- 4. Query with aliases and TRUE
SELECT 
  id AS ItemID,
  name AS ItemName,
  active AS IsActive
FROM practice
WHERE TRUE;

-- 5. Update using FALSE
UPDATE practice SET active = FALSE WHERE id = 1;

-- 6. Delete a row
DELETE FROM practice WHERE id = 2;

-- 7. View results
SELECT * FROM practice;

-- 8. Clean up with DROP
DROP TABLE practice;

-- 9. Print your report to document your work!


-- =====================================================
-- RESET DATABASE
-- =====================================================
-- Use the "Reset" button to restore the original
-- database and clear all custom tables
-- =====================================================
