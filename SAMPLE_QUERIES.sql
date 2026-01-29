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

// ==================== COMPARISON OPERATORS ====================

// 36. Students with high scores (>= 90)
SELECT students.forename, students.surname, grades.module, grades.score
FROM students
INNER JOIN grades ON students.student_id = grades.student_id
WHERE grades.score >= 90
ORDER BY grades.score DESC

// 37. Failing grades (< 60)
SELECT students.forename, students.surname, grades.module, grades.score
FROM students
INNER JOIN grades ON students.student_id = grades.student_id
WHERE grades.score < 60

// 38. Grade boundaries - Distinction (>= 70)
SELECT students.forename, students.surname, COUNT(*) AS distinctions
FROM students
INNER JOIN grades ON students.student_id = grades.student_id
WHERE grades.score >= 70
GROUP BY students.forename, students.surname
ORDER BY COUNT(*) DESC

// 39. Grade boundaries - Pass (>= 40 and < 70)
SELECT students.forename, students.surname, grades.module, grades.score
FROM students
INNER JOIN grades ON students.student_id = grades.student_id
WHERE grades.score >= 40 AND grades.score < 70

// 40. Students not in room B12
SELECT students.forename, students.surname, tutor_groups.room
FROM students
INNER JOIN tutor_groups ON students.tutor_group_id = tutor_groups.tutor_group_id
WHERE tutor_groups.room != 'B12'

// 41. Scores between 80 and 90
SELECT students.forename, students.surname, grades.module, grades.score
FROM students
INNER JOIN grades ON students.student_id = grades.student_id
WHERE grades.score >= 80 AND grades.score <= 90
ORDER BY grades.score DESC

// ==================== LIKE OPERATOR ====================

// 42. Students whose surname starts with 'S'
SELECT forename, surname FROM students WHERE surname LIKE 'S%'

// 43. Students whose forename ends with 'e'
SELECT forename, surname FROM students WHERE forename LIKE '%e'

// 44. Students with 'i' in their forename
SELECT forename, surname FROM students WHERE forename LIKE '%i%'

// 45. Modules containing 'Data'
SELECT DISTINCT module FROM grades WHERE module LIKE '%Data%'

// 46. Find 'Programming' or 'Project' modules
SELECT module, AVG(score)
FROM grades
WHERE module LIKE '%Prog%'
GROUP BY module

// 47. Students with 'son' in surname
SELECT forename, surname FROM students WHERE surname LIKE '%son%'

// ==================== COMPLEX QUERIES WITH NEW OPERATORS ====================

// 48. High achievers in Database modules
SELECT students.forename, students.surname, grades.score
FROM students
INNER JOIN grades ON students.student_id = grades.student_id
WHERE grades.module LIKE '%Database%' AND grades.score >= 85
ORDER BY grades.score DESC

// 49. Count of grades by performance level
SELECT 
  CASE 
    WHEN score >= 70 THEN 'Distinction'
    WHEN score >= 40 THEN 'Pass'
    ELSE 'Fail'
  END AS grade_level,
  COUNT(*)
FROM grades
WHERE score >= 70
GROUP BY score >= 70

// Note: CASE statements not supported, use separate queries:
SELECT COUNT(*) AS distinctions FROM grades WHERE score >= 70
SELECT COUNT(*) AS passes FROM grades WHERE score >= 40 AND score < 70
SELECT COUNT(*) AS fails FROM grades WHERE score < 40

// 50. Students with perfect scores
SELECT students.forename, students.surname, grades.module
FROM students
INNER JOIN grades ON students.student_id = grades.student_id
WHERE grades.score = 100

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
