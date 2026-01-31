# Quick Start - Testing New Features

## 🚀 Quick Test Script

Run the automated suite anytime with `npm test`. For hands-on checks, copy and paste these queries one at a time:

### Test 1: Column Aliases
```sql
SELECT forename AS FirstName, surname AS LastName FROM students LIMIT 5;
```
✅ Expected: Results with "FirstName" and "LastName" column headers

---

### Test 2: DISTINCT
```sql
SELECT DISTINCT tutor_group_id FROM students ORDER BY tutor_group_id;
```
✅ Expected: 3 rows (1, 2, 3)

---

### Test 3: Create Table with Constraints
```sql
CREATE TABLE test_table (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  age INT,
  active BOOLEAN NOT NULL
);
```
✅ Expected: "Table 'test_table' created successfully with 4 column(s)"

---

### Test 4: Insert Data (NOT NULL + AUTO_INCREMENT)
```sql
INSERT INTO test_table (name, age, active) VALUES ('Alice', 25, TRUE);
```
✅ Expected: "1 row inserted into 'test_table'" (id should auto-start at 1)

```sql
INSERT INTO test_table (name, age, active) VALUES ('Bob', 30, FALSE);
```

```sql
INSERT INTO test_table (name, age, active) VALUES ('Carol', 28, TRUE);
```

---

### Test 5: Query with Aliases
```sql
SELECT id AS StudentID, name AS FullName, age AS Age, active AS IsActive FROM test_table ORDER BY id;
```
✅ Expected: 3 rows with aliased column names and boolean values

---

### Test 6: Alter Table
```sql
ALTER TABLE test_table ADD COLUMN email string;
```
✅ Expected: "Column 'email' added to table 'test_table'"

---

### Test 7: Update Data
```sql
UPDATE test_table SET email = 'alice@example.com' WHERE id = 1;
```
✅ Expected: "1 row(s) updated in 'test_table'"

```sql
UPDATE test_table SET email = 'bob@example.com' WHERE name = 'Bob';
```

---

### Test 8: Verify Update
```sql
SELECT id, name, email FROM test_table;
```
✅ Expected: See email column with updated values

---

### Test 9: Delete Row
```sql
DELETE FROM test_table WHERE id = 3;
```
✅ Expected: "1 row(s) deleted from 'test_table'"

---

### Test 10: Verify Delete
```sql
SELECT * FROM test_table;
```
✅ Expected: Only 2 rows (Alice and Bob)

---

### Test 11: NOT NULL (Should Fail)
```sql
INSERT INTO test_table (name, age, active) VALUES (NULL, 22, TRUE);
```
❌ Expected: Error - "cannot be NULL"

---

### Test 12: Primary Key Uniqueness (Should Fail)
```sql
INSERT INTO test_table (id, name, age, active) VALUES (1, 'Clash', FALSE);
```
❌ Expected: Error - "Duplicate primary key"

---

### Test 13: Print Report
1. Click the **"🖨️ Print Report"** button
2. Verify the report opens in a new window
3. Test "Save as PDF" from your browser's print dialog

---

### Test 14: Protected Table (Should Fail)
```sql
INSERT INTO students (student_id, forename, surname, tutor_group_id) VALUES (99, 'Test', 'User', 1);
```
❌ Expected: Error - "Cannot insert into protected table 'students'"

---

### Test 15: Complex Query with Aliases
```sql
SELECT 
  s.forename AS FirstName,
  s.surname AS LastName,
  t.tutor_name AS Tutor,
  AVG(g.score) AS AverageScore
FROM students s
INNER JOIN tutor_groups t ON s.tutor_group_id = t.tutor_group_id
INNER JOIN grades g ON s.student_id = g.student_id
GROUP BY s.student_id, s.forename, s.surname, t.tutor_name
ORDER BY AverageScore DESC
LIMIT 5;
```
✅ Expected: Top 5 students with aliased columns

---

## 🧹 Reset
Click the **"Reset"** button to clear all custom tables and restore the original database.

---

## ✅ All Tests Passed?

If all tests work correctly:
- ✅ DISTINCT works
- ✅ Column aliases working
- ✅ CREATE / ALTER / DROP TABLE working
- ✅ PRIMARY KEY, AUTO_INCREMENT, NOT NULL enforced
- ✅ INSERT / UPDATE / DELETE working
- ✅ Protected tables enforced
- ✅ Print/Export working

**You're ready to go!** 🎉

---

## 📚 More Examples

See `NEW_SAMPLE_QUERIES.sql` for extensive examples of all features.
See `NEW_FEATURES.md` for complete documentation.
