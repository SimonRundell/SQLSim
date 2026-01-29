# Quick Start - Testing New Features

## 🚀 Quick Test Script

Copy and paste these queries one at a time to test all new features:

### Test 1: Column Aliases
```sql
SELECT forename AS FirstName, surname AS LastName FROM students LIMIT 5;
```
✅ Expected: Results with "FirstName" and "LastName" column headers

---

### Test 2: Create Table
```sql
CREATE TABLE test_table (id number, name string, age number);
```
✅ Expected: "Table 'test_table' created successfully with 3 column(s)"

---

### Test 3: Insert Data
```sql
INSERT INTO test_table (id, name, age) VALUES (1, 'Alice', 25);
```
✅ Expected: "1 row inserted into 'test_table'"

```sql
INSERT INTO test_table (id, name, age) VALUES (2, 'Bob', 30);
```

```sql
INSERT INTO test_table (id, name, age) VALUES (3, 'Carol', 28);
```

---

### Test 4: Query with Aliases
```sql
SELECT id AS StudentID, name AS FullName, age AS Age FROM test_table;
```
✅ Expected: 3 rows with aliased column names

---

### Test 5: Alter Table
```sql
ALTER TABLE test_table ADD COLUMN email string;
```
✅ Expected: "Column 'email' added to table 'test_table'"

---

### Test 6: Update Data
```sql
UPDATE test_table SET email = 'alice@example.com' WHERE id = 1;
```
✅ Expected: "1 row(s) updated in 'test_table'"

```sql
UPDATE test_table SET email = 'bob@example.com' WHERE name = 'Bob';
```

---

### Test 7: Verify Update
```sql
SELECT id, name, email FROM test_table;
```
✅ Expected: See email column with updated values

---

### Test 8: Delete Row
```sql
DELETE FROM test_table WHERE id = 3;
```
✅ Expected: "1 row(s) deleted from 'test_table'"

---

### Test 9: Verify Delete
```sql
SELECT * FROM test_table;
```
✅ Expected: Only 2 rows (Alice and Bob)

---

### Test 10: Print Report
1. Click the **"🖨️ Print Report"** button
2. Verify the report opens in a new window
3. Test "Save as PDF" from your browser's print dialog

---

### Test 11: Protected Table (Should Fail)
```sql
INSERT INTO students (student_id, forename, surname, tutor_group_id) VALUES (99, 'Test', 'User', 1);
```
❌ Expected: Error - "Cannot insert into protected table 'students'"

---

### Test 12: Complex Query with Aliases
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
- ✅ Attendance table removed
- ✅ Column aliases working
- ✅ CREATE TABLE working
- ✅ ALTER TABLE working
- ✅ INSERT working
- ✅ UPDATE working
- ✅ DELETE working
- ✅ Protected tables enforced
- ✅ Print/Export working

**You're ready to go!** 🎉

---

## 📚 More Examples

See `NEW_SAMPLE_QUERIES.sql` for extensive examples of all features.
See `NEW_FEATURES.md` for complete documentation.
