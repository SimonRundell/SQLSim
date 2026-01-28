/**
 * Sample SQL Queries
 * Copy and paste these into the query editor to test different features
 */

// ==================== BASIC SELECT ====================

// 1. Select all students
SELECT * FROM students

// 2. Select specific columns
SELECT forename, surname FROM students

// 3. Select from tutor_groups
SELECT * FROM tutor_groups

// ==================== WHERE CLAUSE ====================

// 4. Filter by surname
SELECT forename, surname FROM students WHERE surname = 'Smith'

// 5. Filter by tutor group
SELECT * FROM students WHERE tutor_group_id = 1

// 6. Multiple conditions with AND
SELECT forename, surname FROM students 
WHERE tutor_group_id = 1 AND surname = 'Smith'

// 7. Filter tutor groups by room
SELECT * FROM tutor_groups WHERE room = 'B12'

// ==================== INNER JOIN ====================

// 8. Simple join - students with their tutor
SELECT students.forename, students.surname, tutor_groups.tutor_name
FROM students
INNER JOIN tutor_groups ON students.tutor_group_id = tutor_groups.tutor_group_id

// 9. Join with WHERE clause
SELECT students.forename, students.surname, tutor_groups.room
FROM students
INNER JOIN tutor_groups ON students.tutor_group_id = tutor_groups.tutor_group_id
WHERE tutor_groups.room = 'A5'

// 10. Join students with attendance
SELECT students.forename, students.surname, attendance.session_date, attendance.present
FROM students
INNER JOIN attendance ON students.student_id = attendance.student_id

// ==================== ORDER BY ====================

// 11. Order by surname ascending
SELECT forename, surname FROM students ORDER BY surname ASC

// 12. Order by surname descending
SELECT forename, surname FROM students ORDER BY surname DESC

// 13. Order by forename
SELECT forename, surname FROM students ORDER BY forename ASC

// 14. Join with ORDER BY
SELECT students.surname, students.forename, tutor_groups.tutor_name
FROM students
INNER JOIN tutor_groups ON students.tutor_group_id = tutor_groups.tutor_group_id
ORDER BY students.surname ASC

// ==================== LIMIT ====================

// 15. First 3 students
SELECT * FROM students LIMIT 3

// 16. Top 5 students by surname
SELECT forename, surname FROM students ORDER BY surname ASC LIMIT 5

// ==================== COMPLEX QUERIES ====================

// 17. Complete query with all features
SELECT students.forename, students.surname, tutor_groups.tutor_name, tutor_groups.room
FROM students
INNER JOIN tutor_groups ON students.tutor_group_id = tutor_groups.tutor_group_id
WHERE tutor_groups.room = 'B12'
ORDER BY students.surname ASC
LIMIT 20

// 18. Students in A5 or C3 rooms (using multiple queries since OR not supported)
SELECT students.forename, students.surname, tutor_groups.room
FROM students
INNER JOIN tutor_groups ON students.tutor_group_id = tutor_groups.tutor_group_id
WHERE tutor_groups.room = 'A5'

// 19. Attendance for specific student
SELECT students.forename, students.surname, attendance.session_date, attendance.present
FROM students
INNER JOIN attendance ON students.student_id = attendance.student_id
WHERE students.surname = 'Smith' AND students.forename = 'Alice'

// ==================== COUNT and GROUP BY ====================

// 20. Count all students
SELECT COUNT(*) FROM students

// 21. Count students by tutor group
SELECT tutor_group_id, COUNT(*) 
FROM students 
GROUP BY tutor_group_id

// 22. Count students with tutor names
SELECT tutor_groups.tutor_name, COUNT(*) 
FROM students
INNER JOIN tutor_groups ON students.tutor_group_id = tutor_groups.tutor_group_id
GROUP BY tutor_groups.tutor_name

// 23. Count by surname
SELECT surname, COUNT(*) 
FROM students 
GROUP BY surname

// 24. Count students by room with ordering
SELECT tutor_groups.room, tutor_groups.tutor_name, COUNT(*) 
FROM students
INNER JOIN tutor_groups ON students.tutor_group_id = tutor_groups.tutor_group_id
GROUP BY tutor_groups.room, tutor_groups.tutor_name
ORDER BY COUNT(*) DESC

// 25. Count attendance records per student
SELECT students.forename, students.surname, COUNT(*) 
FROM students
INNER JOIN attendance ON students.student_id = attendance.student_id
GROUP BY students.forename, students.surname
ORDER BY COUNT(*) DESC

// ==================== AGGREGATE FUNCTIONS (NEW!) ====================

// 26. Average score for all grades
SELECT AVG(score) FROM grades

// 27. Sum of all scores
SELECT SUM(score) FROM grades

// 28. Highest and lowest scores
SELECT MAX(score), MIN(score) FROM grades

// 29. Average score by module
SELECT module, AVG(score)
FROM grades
GROUP BY module

// 30. Total scores by student
SELECT student_id, SUM(score)
FROM grades
GROUP BY student_id
ORDER BY SUM(score) DESC

// 31. Student performance summary
SELECT students.forename, students.surname, AVG(grades.score), MIN(grades.score), MAX(grades.score)
FROM students
INNER JOIN grades ON students.student_id = grades.student_id
GROUP BY students.forename, students.surname
ORDER BY AVG(grades.score) DESC

// 32. Module statistics
SELECT module, COUNT(*), AVG(score), MIN(score), MAX(score)
FROM grades
GROUP BY module
ORDER BY AVG(score) DESC

// 33. Average score by paper number
SELECT paper, AVG(score)
FROM grades
GROUP BY paper
ORDER BY paper ASC

// 34. Performance in specific module
SELECT students.forename, students.surname, AVG(grades.score)
FROM students
INNER JOIN grades ON students.student_id = grades.student_id
WHERE grades.module = 'Programming'
GROUP BY students.forename, students.surname
ORDER BY AVG(grades.score) DESC

// 35. Top performing module for each student (using MAX)
SELECT student_id, module, MAX(score)
FROM grades
GROUP BY student_id, module
ORDER BY student_id ASC

// ==================== ERROR EXAMPLES ====================

// These should produce errors - try them to see error handling!

// ERROR: Ambiguous column (tutor_group_id exists in both tables)
SELECT tutor_group_id
FROM students
INNER JOIN tutor_groups ON students.tutor_group_id = tutor_groups.tutor_group_id

// ERROR: Unknown column
SELECT foo FROM students

// ERROR: Unknown table
SELECT * FROM professors

// ERROR: Column not in GROUP BY
SELECT forename, COUNT(*) 
FROM students 
GROUP BY tutor_group_id

// ERROR: Double quotes not allowed
SELECT * FROM students WHERE surname = "Smith"

// ERROR: Unsupported operator
SELECT * FROM students WHERE student_id > 5
