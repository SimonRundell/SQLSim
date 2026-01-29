import { useState } from 'react';
import './GuideDrawer.css';

function GuideDrawer({ isOpen, onClose }) {
  return (
    <>
      {/* Overlay */}
      {isOpen && <div className="drawer-overlay" onClick={onClose} />}
      
      {/* Drawer */}
      <div className={`guide-drawer ${isOpen ? 'open' : ''}`}>
        <div className="drawer-header">
          <h2>🎓 Student Guide</h2>
          <button className="drawer-close-btn" onClick={onClose}>
            ×
          </button>
        </div>
        
        <div className="drawer-content">
          <section>
            <h3>Getting Started</h3>
            <p>You'll see three main areas:</p>
            <ol>
              <li><strong>Left Panel:</strong> Source tables with their data</li>
              <li><strong>Center:</strong> SQL query editor</li>
              <li><strong>Right/Bottom:</strong> Query results or errors</li>
            </ol>
          </section>

          <section>
            <h3>Understanding the Tables</h3>
            
            <h4>📚 students</h4>
            <p>Contains 10 students with columns:</p>
            <ul>
              <li><code>student_id</code> - Unique student number</li>
              <li><code>forename</code> - First name</li>
              <li><code>surname</code> - Last name</li>
              <li><code>tutor_group_id</code> - Links to tutor_groups table</li>
            </ul>

            <h4>👥 tutor_groups</h4>
            <p>Contains 3 tutor groups with columns:</p>
            <ul>
              <li><code>tutor_group_id</code> - Unique group number</li>
              <li><code>tutor_name</code> - Name of the tutor</li>
              <li><code>room</code> - Room location</li>
            </ul>

            <h4>📊 grades</h4>
            <p>Contains grade records with columns:</p>
            <ul>
              <li><code>student_id</code> - Links to students table</li>
              <li><code>module</code> - Module name</li>
              <li><code>paper</code> - Paper number (1, 2, or 3)</li>
              <li><code>score</code> - Score out of 100</li>
            </ul>
          </section>

          <section>
            <h3>Important Syntax Rules</h3>
            
            <div className="rule-box do">
              <strong>✅ DO THIS:</strong>
              <ul>
                <li>Use single quotes for strings: <code>'Smith'</code></li>
                <li>Use bare column names: <code>surname</code></li>
                <li>Keywords can be any case: <code>SELECT</code>, <code>select</code></li>
                <li>Semicolons are optional: <code>SELECT * FROM students;</code></li>
                <li>Use TRUE/FALSE for boolean values</li>
              </ul>
            </div>

            <div className="rule-box dont">
              <strong>❌ DON'T DO THIS:</strong>
              <ul>
                <li>Double quotes: <code>"Smith"</code> ← Will cause an error!</li>
                <li>Backticks: <code>`surname`</code> ← Not supported</li>
              </ul>
            </div>
          </section>

          <section>
            <h3>Query Structure</h3>
            <pre className="code-block">{`SELECT column1, column2      -- What columns to show
FROM table_name              -- Which table to query
INNER JOIN other_table       -- Join another table (optional)
  ON table1.id = table2.id   -- How to join them
WHERE column >= value        -- Filter rows (optional)
  AND column LIKE 'pattern%' -- Pattern matching
  AND other_column = 123     -- More filters
GROUP BY column              -- Group results (optional)
ORDER BY column ASC          -- Sort results (optional)
LIMIT 10                     -- Limit rows (optional)`}</pre>
          </section>

          <section>
            <h3>🆕 Column Aliases (AS)</h3>
            <p>Make your results more readable by giving columns custom names!</p>
            
            <div className="example">
              <p><strong>Basic alias with AS keyword:</strong></p>
              <pre className="code-block">{`SELECT forename AS FirstName, surname AS LastName
FROM students`}</pre>
            </div>

            <div className="example">
              <p><strong>Alias without AS (also works):</strong></p>
              <pre className="code-block">{`SELECT forename first_name, surname last_name
FROM students`}</pre>
            </div>

            <div className="example">
              <p><strong>With aggregate functions:</strong></p>
              <pre className="code-block">{`SELECT module, AVG(score) AS average_score
FROM grades
GROUP BY module`}</pre>
            </div>

            <div className="example">
              <p><strong>Multiple aliases:</strong></p>
              <pre className="code-block">{`SELECT 
  s.forename AS FirstName,
  s.surname AS LastName,
  t.tutor_name AS Tutor,
  COUNT(*) AS total_grades
FROM students s
INNER JOIN tutor_groups t ON s.tutor_group_id = t.tutor_group_id
INNER JOIN grades g ON s.student_id = g.student_id
GROUP BY s.student_id, s.forename, s.surname, t.tutor_name`}</pre>
            </div>
          </section>

          <section>
            <h3>🆕 Creating Your Own Tables</h3>
            <p>Practice DDL (Data Definition Language) by creating custom tables!</p>

            <h4>CREATE TABLE</h4>
            <div className="example">
              <p><strong>Basic syntax:</strong></p>
              <pre className="code-block">{`CREATE TABLE table_name (
  column1 type,
  column2 type,
  column3 type
)`}</pre>
            </div>

            <div className="example">
              <p><strong>Supported types:</strong></p>
              <ul>
                <li><code>number</code>, <code>int</code>, <code>integer</code>, <code>float</code>, <code>real</code> → number</li>
                <li><code>string</code>, <code>varchar</code>, <code>text</code> → string</li>
              </ul>
            </div>

            <div className="example">
              <p><strong>Example - Create a contacts table:</strong></p>
              <pre className="code-block">{`CREATE TABLE contacts (
  contact_id number,
  name string,
  email string,
  phone string
)`}</pre>
            </div>

            <h4>ALTER TABLE</h4>
            <p>Add new columns to tables you've created:</p>
            <div className="example">
              <pre className="code-block">{`ALTER TABLE contacts ADD COLUMN age number

-- COLUMN keyword is optional:
ALTER TABLE contacts ADD city string`}</pre>
            </div>

            <p className="warning-box">
              ⚠️ <strong>Note:</strong> You can only ALTER tables you created. 
              The base tables (students, tutor_groups, grades) are protected.
            </p>
          </section>

          <section>
            <h3>🆕 Inserting Data</h3>
            <p>Add rows to your custom tables with INSERT INTO:</p>

            <div className="example">
              <p><strong>Basic syntax:</strong></p>
              <pre className="code-block">{`INSERT INTO table_name (column1, column2, column3)
VALUES (value1, value2, value3)`}</pre>
            </div>

            <div className="example">
              <p><strong>Example:</strong></p>
              <pre className="code-block">{`INSERT INTO contacts (contact_id, name, email, phone)
VALUES (1, 'John Smith', 'john@example.com', '555-0101')

INSERT INTO contacts (contact_id, name, email)
VALUES (2, 'Jane Doe', 'jane@example.com')`}</pre>
            </div>

            <p className="warning-box">
              ⚠️ <strong>Protected tables:</strong> You cannot INSERT into students, 
              tutor_groups, or grades tables.
            </p>
          </section>

          <section>
            <h3>🆕 Updating Data</h3>
            <p>Modify existing rows in your custom tables:</p>

            <div className="example">
              <p><strong>Basic syntax:</strong></p>
              <pre className="code-block">{`UPDATE table_name
SET column1 = value1, column2 = value2
WHERE condition`}</pre>
            </div>

            <div className="example">
              <p><strong>Update a single row:</strong></p>
              <pre className="code-block">{`UPDATE contacts
SET email = 'newemail@example.com'
WHERE contact_id = 1`}</pre>
            </div>

            <div className="example">
              <p><strong>Update multiple columns:</strong></p>
              <pre className="code-block">{`UPDATE contacts
SET email = 'updated@example.com', phone = '555-9999'
WHERE name = 'John Smith'`}</pre>
            </div>

            <p className="warning-box">
              ⚠️ <strong>Important:</strong> Always use a WHERE clause or you'll update ALL rows!
              Protected tables cannot be updated.
            </p>
          </section>

          <section>
            <h3>🆕 Deleting Data</h3>
            <p>Remove rows from your custom tables:</p>

            <div className="example">
              <p><strong>Basic syntax:</strong></p>
              <pre className="code-block">{`DELETE FROM table_name WHERE condition`}</pre>
            </div>

            <div className="example">
              <p><strong>Delete specific rows:</strong></p>
              <pre className="code-block">{`DELETE FROM contacts WHERE contact_id = 1

DELETE FROM contacts WHERE email LIKE '%example.com'`}</pre>
            </div>

            <p className="warning-box">
              ⚠️ <strong>Warning:</strong> DELETE without WHERE removes ALL rows!
              Protected tables cannot have rows deleted.
            </p>
          </section>

          <section>
            <h3>🆕 Complete Workflow Example</h3>
            <div className="example">
              <p><strong>1. Create a table:</strong></p>
              <pre className="code-block">{`CREATE TABLE my_scores (
  test_id number,
  student_name string,
  score number
)`}</pre>
            </div>

            <div className="example">
              <p><strong>2. Add a column:</strong></p>
              <pre className="code-block">ALTER TABLE my_scores ADD test_date string</pre>
            </div>

            <div className="example">
              <p><strong>3. Insert data:</strong></p>
              <pre className="code-block">{`INSERT INTO my_scores (test_id, student_name, score, test_date)
VALUES (1, 'Alice', 95, '2026-01-15')

INSERT INTO my_scores (test_id, student_name, score, test_date)
VALUES (2, 'Bob', 88, '2026-01-15')`}</pre>
            </div>

            <div className="example">
              <p><strong>4. Query with aliases:</strong></p>
              <pre className="code-block">{`SELECT 
  student_name AS Name,
  score AS Grade,
  test_date AS Date
FROM my_scores
WHERE score >= 90
ORDER BY score DESC`}</pre>
            </div>

            <div className="example">
              <p><strong>5. Update a score:</strong></p>
              <pre className="code-block">{`UPDATE my_scores
SET score = 90
WHERE test_id = 2`}</pre>
            </div>

            <div className="example">
              <p><strong>6. Delete a record:</strong></p>
              <pre className="code-block">DELETE FROM my_scores WHERE test_id = 1</pre>
            </div>

            <div className="example">
              <p><strong>7. Drop the table when done:</strong></p>
              <pre className="code-block">DROP TABLE my_scores;</pre>
            </div>

            <div className="example">
              <p><strong>8. Click "🖨️ Print Report" to save your work!</strong></p>
            </div>
          </section>

          <section>
            <h3>🆕 TRUE and FALSE Keywords</h3>
            <p>Use boolean literals in WHERE clauses for testing and logic!</p>
            
            <div className="example">
              <p><strong>Return all rows:</strong></p>
              <pre className="code-block">SELECT * FROM students WHERE TRUE;</pre>
            </div>

            <div className="example">
              <p><strong>Return no rows (useful for testing):</strong></p>
              <pre className="code-block">SELECT * FROM students WHERE FALSE;</pre>
            </div>

            <div className="example">
              <p><strong>Combine with AND:</strong></p>
              <pre className="code-block">{`SELECT * FROM students 
WHERE TRUE AND surname = 'Smith';`}</pre>
            </div>

            <div className="example">
              <p><strong>Use in INSERT/UPDATE:</strong></p>
              <pre className="code-block">{`INSERT INTO my_table (id, active) VALUES (1, TRUE);
UPDATE my_table SET active = FALSE WHERE id = 1;`}</pre>
            </div>

            <p className="warning-box">
              💡 <strong>Note:</strong> TRUE evaluates to 1 and FALSE evaluates to 0 internally.
            </p>
          </section>

          <section>
            <h3>🆕 DROP TABLE</h3>
            <p>Remove tables you've created when finished!</p>
            
            <div className="example">
              <p><strong>Basic syntax:</strong></p>
              <pre className="code-block">DROP TABLE table_name;</pre>
            </div>

            <div className="example">
              <p><strong>Examples:</strong></p>
              <pre className="code-block">{`-- Remove a custom table
DROP TABLE contacts;

-- Clean up after testing
DROP TABLE test_scores;`}</pre>
            </div>

            <p className="warning-box">
              ⚠️ <strong>Note:</strong> You can only DROP tables you created. 
              Protected tables (students, tutor_groups, grades) cannot be dropped.
            </p>
          </section>

          <section>
            <h3>🆕 Semicolon Support</h3>
            <p>End your statements with a semicolon (;) just like in real SQL!</p>
            
            <div className="example">
              <p><strong>All statements support semicolons:</strong></p>
              <pre className="code-block">{`SELECT * FROM students;
CREATE TABLE test (id number);
INSERT INTO test (id) VALUES (1);
DROP TABLE test;`}</pre>
            </div>

            <p className="warning-box">
              💡 <strong>Note:</strong> Semicolons are optional - both styles work!
            </p>
          </section>

          <section>
            <h3>🖨️ Print/Export Reports</h3>
            <p>Create professional reports for homework submissions:</p>
            <ol>
              <li>Execute your SQL query</li>
              <li>Click the <strong>"🖨️ Print Report"</strong> button</li>
              <li>A new window opens with a formatted report</li>
              <li>Use your browser's print function</li>
              <li>Select "Save as PDF" to create a document</li>
            </ol>
            <p>Reports include your query, results, timestamp, and row count!</p>
          </section>

          <section>
            <h3>Comparison Operators</h3>
            <ul>
              <li><code>=</code> - Equal to</li>
              <li><code>!=</code> or <code>&lt;&gt;</code> - Not equal to</li>
              <li><code>&lt;</code> - Less than</li>
              <li><code>&lt;=</code> - Less than or equal to</li>
              <li><code>&gt;</code> - Greater than</li>
              <li><code>&gt;=</code> - Greater than or equal to</li>
              <li><code>LIKE</code> - Pattern matching with <code>%</code> wildcard</li>
            </ul>
            <div className="example">
              <p><strong>Examples:</strong></p>
              <pre className="code-block">{`-- Greater than or equal
WHERE score >= 70

-- Not equal
WHERE room != 'B12'

-- Pattern matching
WHERE surname LIKE 'S%'    -- Starts with S
WHERE forename LIKE '%e'   -- Ends with e
WHERE module LIKE '%Data%' -- Contains Data`}</pre>
            </div>
          </section>

          <section>
            <h3>Example Queries</h3>

            <h4>Beginner</h4>
            <div className="example">
              <p><strong>See all students:</strong></p>
              <pre className="code-block">SELECT * FROM students</pre>
            </div>

            <div className="example">
              <p><strong>Find students named Smith:</strong></p>
              <pre className="code-block">SELECT forename, surname FROM students WHERE surname = 'Smith'</pre>
            </div>

            <h4>Intermediate</h4>
            <div className="example">
              <p><strong>Students with their tutors:</strong></p>
              <pre className="code-block">{`SELECT students.forename, students.surname, tutor_groups.tutor_name
FROM students
INNER JOIN tutor_groups ON students.tutor_group_id = tutor_groups.tutor_group_id`}</pre>
            </div>

            <div className="example">
              <p><strong>Sort students by surname:</strong></p>
              <pre className="code-block">SELECT forename, surname FROM students ORDER BY surname ASC</pre>
            </div>

            <h4>Advanced</h4>
            <div className="example">
              <p><strong>Count students by tutor group:</strong></p>
              <pre className="code-block">{`SELECT tutor_group_id, COUNT(*) 
FROM students 
GROUP BY tutor_group_id`}</pre>
            </div>

            <div className="example">
              <p><strong>Average score by module:</strong></p>
              <pre className="code-block">{`SELECT module, AVG(score), MIN(score), MAX(score)
FROM grades
GROUP BY module
ORDER BY AVG(score) DESC`}</pre>
            </div>

            <h4>Using Comparison Operators</h4>
            <div className="example">
              <p><strong>Find high scores (&gt;= 90):</strong></p>
              <pre className="code-block">{`SELECT students.forename, students.surname, grades.score
FROM students
INNER JOIN grades ON students.student_id = grades.student_id
WHERE grades.score >= 90`}</pre>
            </div>

            <div className="example">
              <p><strong>Grade boundaries - distinctions:</strong></p>
              <pre className="code-block">{`SELECT students.forename, students.surname, COUNT(*) AS distinctions
FROM students
INNER JOIN grades ON students.student_id = grades.student_id
WHERE grades.score >= 70
GROUP BY students.forename, students.surname`}</pre>
            </div>

            <h4>Using LIKE Pattern Matching</h4>
            <div className="example">
              <p><strong>Surnames starting with 'S':</strong></p>
              <pre className="code-block">SELECT forename, surname FROM students WHERE surname LIKE 'S%'</pre>
            </div>

            <div className="example">
              <p><strong>Modules containing 'Data':</strong></p>
              <pre className="code-block">{`SELECT module, AVG(score)
FROM grades
WHERE module LIKE '%Data%'
GROUP BY module`}</pre>
            </div>
          </section>

          <section>
            <h3>Understanding Errors</h3>

            <h4>AMBIGUOUS_COLUMN</h4>
            <p><strong>Problem:</strong> Column name exists in multiple tables</p>
            <div className="error-example">
              <p>❌ This fails:</p>
              <pre className="code-block">{`SELECT tutor_group_id
FROM students
INNER JOIN tutor_groups ON students.tutor_group_id = tutor_groups.tutor_group_id`}</pre>
              <p>✅ Fix it by qualifying the column:</p>
              <pre className="code-block">{`SELECT students.tutor_group_id
FROM students
INNER JOIN tutor_groups ON students.tutor_group_id = tutor_groups.tutor_group_id`}</pre>
            </div>

            <h4>SYNTAX_ERROR</h4>
            <p><strong>Problem:</strong> Query has incorrect syntax</p>
            <div className="error-example">
              <p>❌ Using double quotes:</p>
              <pre className="code-block">SELECT * FROM students WHERE surname = "Smith"</pre>
              <p>✅ Use single quotes:</p>
              <pre className="code-block">SELECT * FROM students WHERE surname = 'Smith'</pre>
            </div>
          </section>

          <section>
            <h3>Aggregate Functions</h3>
            <ul>
              <li><code>COUNT(*)</code> - Count all rows</li>
              <li><code>COUNT(column)</code> - Count non-null values</li>
              <li><code>SUM(column)</code> - Sum of numeric values</li>
              <li><code>AVG(column)</code> - Average of numeric values</li>
              <li><code>MIN(column)</code> - Minimum value</li>
              <li><code>MAX(column)</code> - Maximum value</li>
            </ul>
            <p>Note: Use with GROUP BY to aggregate by categories!</p>
          </section>

          <section>
            <h3>Tips for Learning</h3>
            <ol>
              <li><strong>Start Simple:</strong> Begin with <code>SELECT * FROM tablename</code></li>
              <li><strong>Add One Feature at a Time:</strong> Add WHERE, then JOIN, then ORDER BY</li>
              <li><strong>Read the Errors:</strong> Error messages tell you exactly what's wrong</li>
              <li><strong>Use Table Names:</strong> When joining, always use <code>table.column</code></li>
              <li><strong>Experiment:</strong> Try breaking things to understand how SQL works!</li>
            </ol>
          </section>

          <section>
            <h3>What's NOT Supported</h3>
            <p>This is a teaching tool, so these features aren't available:</p>
            <ul>
              <li>❌ LEFT JOIN, RIGHT JOIN</li>
              <li>❌ OR, NOT operators</li>
              <li>❌ IN, BETWEEN</li>
              <li>❌ Subqueries</li>
              <li>❌ CASE statements</li>
            </ul>
          </section>

          <div className="footer">
            <p><strong>Happy Querying! 🚀</strong></p>
          </div>
        </div>
      </div>
    </>
  );
}

export default GuideDrawer;
