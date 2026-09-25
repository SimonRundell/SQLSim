/**
 * Content for the interactive Student Guide: a progressive, step-by-step
 * walkthrough of SQL as SQLSim supports it. Mirrors the structure of
 * STUDENT_GUIDE.md - keep the two roughly in sync when either changes.
 *
 * Each lesson is rendered by GuideDrawer. `challenge` is the one thing a
 * student can click to load straight into the query editor; `body` is
 * free-form JSX for everything else (explanation, illustrative examples).
 */

import { JoinDiagram, SchemaOverview, JoinTypeComparison } from '../components/GuideDiagrams';

export const guideSections = [
  'Getting Started',
  'Filtering Data',
  'Shaping Results',
  'Joining Tables',
  'Aggregating Data',
  'Subqueries',
  'Changing Data',
  'Reference',
];

export const guideLessons = [
  {
    id: 'what-is-sql',
    section: 'Getting Started',
    title: 'What is SQL?',
    body: (
      <>
        <p>
          SQL (Structured Query Language) is how you ask a question of data held in tables.
          You write <em>what</em> you want - "the names of every student in tutor group 1" -
          not the steps to fetch it. The engine works out how.
        </p>
        <p>SQLSim runs entirely in your browser. You'll see three areas:</p>
        <ol>
          <li><strong>Left panel</strong> - the source tables and their data</li>
          <li><strong>Centre</strong> - the SQL query editor, with <strong>▶ Run Query</strong>, <strong>✕ Clear</strong> and <strong>↺ Reset</strong></li>
          <li><strong>Below the editor</strong> - your results, or a clear error message if something's wrong</li>
        </ol>
        <p><strong>✕ Clear</strong> empties the editor. <strong>↺ Reset</strong> restores the starting query and undoes any tables you created.</p>
      </>
    ),
    challenge: {
      prompt: "Let's start simple. Load this query and click ▶ Run Query to see what it does.",
      query: 'SELECT * FROM students',
    },
  },
  {
    id: 'sample-data',
    section: 'Getting Started',
    title: 'The Sample Data',
    diagram: <SchemaOverview />,
    body: (
      <>
        <p>Three tables are preloaded, shown above with how they connect:</p>
        <table className="guide-table">
          <thead><tr><th>Table</th><th>Columns</th></tr></thead>
          <tbody>
            <tr><td>📚 <code>students</code></td><td><code>student_id</code>, <code>forename</code>, <code>surname</code>, <code>tutor_group_id</code></td></tr>
            <tr><td>👥 <code>tutor_groups</code></td><td><code>tutor_group_id</code>, <code>tutor_name</code>, <code>room</code></td></tr>
            <tr><td>📊 <code>grades</code></td><td><code>student_id</code>, <code>module</code>, <code>paper</code>, <code>score</code></td></tr>
          </tbody>
        </table>
        <p>
          <code>students.tutor_group_id</code> and <code>grades.student_id</code> each point back
          to another table's unique identifier - that's what makes a <strong>JOIN</strong> possible
          later on.
        </p>
      </>
    ),
    challenge: {
      prompt: 'Have a look at the tutor_groups table on its own.',
      query: 'SELECT * FROM tutor_groups',
    },
  },
  {
    id: 'first-query',
    section: 'Getting Started',
    title: 'Your First Query',
    body: (
      <>
        <p>
          <code>SELECT *</code> means "give me every column"; <code>FROM students</code> means
          "from the students table". Together they return every row, every column:
        </p>
        <pre className="code-block">SELECT * FROM students</pre>
        <p>Usually you only want specific columns, so name them instead of using <code>*</code>:</p>
        <pre className="code-block">SELECT forename, surname FROM students</pre>
        <p>Strings always use <strong>single</strong> quotes. Column and table names are bare words - no quotes at all.</p>
        <p>
          You can add comments to a query - they're ignored when it runs, so use them to leave
          notes for yourself. <code>--</code> comments out everything to the end of that line;{' '}
          <code>/* ... */</code> comments out everything between the two markers, even across
          several lines:
        </p>
        <pre className="code-block">{`-- Find students in tutor group 1
SELECT forename, surname
FROM students
WHERE tutor_group_id = 1 /* this comment can span
multiple lines */`}</pre>
      </>
    ),
    challenge: {
      prompt: 'Select just tutor_name and room from tutor_groups.',
      query: 'SELECT tutor_name, room FROM tutor_groups',
    },
  },
  {
    id: 'where-basics',
    section: 'Filtering Data',
    title: 'Filtering Rows with WHERE',
    body: (
      <>
        <p><code>WHERE</code> keeps only the rows matching a condition:</p>
        <pre className="code-block">SELECT forename, surname FROM students WHERE surname = 'Smith'</pre>
        <p>Only rows where <code>surname</code> is exactly <code>'Smith'</code> come back.</p>
      </>
    ),
    challenge: {
      prompt: 'Find every student in tutor group 2.',
      query: 'SELECT * FROM students WHERE tutor_group_id = 2',
    },
  },
  {
    id: 'comparison-operators',
    section: 'Filtering Data',
    title: 'Comparison Operators',
    body: (
      <>
        <ul>
          <li><code>=</code> equal to, <code>!=</code> or <code>&lt;&gt;</code> not equal to</li>
          <li><code>&lt;</code>, <code>&lt;=</code>, <code>&gt;</code>, <code>&gt;=</code> - less/greater than, and-or-equal-to</li>
        </ul>
        <pre className="code-block">SELECT * FROM grades WHERE score {'>='} 90</pre>
      </>
    ),
    challenge: {
      prompt: 'Find every grade record with a score below 50.',
      query: 'SELECT * FROM grades WHERE score < 50',
    },
  },
  {
    id: 'like',
    section: 'Filtering Data',
    title: 'Pattern Matching with LIKE',
    body: (
      <>
        <p><code>LIKE</code> matches text patterns, where <code>%</code> means "any sequence of characters (including none)":</p>
        <pre className="code-block">{`WHERE surname LIKE 'S%'   -- starts with S
WHERE surname LIKE '%son' -- ends with son
WHERE surname LIKE '%o%'  -- contains o anywhere`}</pre>
      </>
    ),
    challenge: {
      prompt: 'Find every module in grades containing the word Data.',
      query: "SELECT DISTINCT module FROM grades WHERE module LIKE '%Data%'",
    },
  },
  {
    id: 'and-or-not',
    section: 'Filtering Data',
    title: 'Combining Conditions: AND, OR, NOT',
    body: (
      <>
        <pre className="code-block">{`-- Both must be true
WHERE tutor_group_id = 1 AND surname = 'Smith'

-- Either can be true
WHERE surname = 'Smith' OR surname = 'Brown'

-- Negates the condition that follows
WHERE NOT tutor_group_id = 1`}</pre>
      </>
    ),
    challenge: {
      prompt: "Find students whose surname is 'Smith' OR whose tutor_group_id is 3.",
      query: "SELECT * FROM students WHERE surname = 'Smith' OR tutor_group_id = 3",
    },
  },
  {
    id: 'in-between-parens',
    section: 'Filtering Data',
    title: 'IN, BETWEEN and Parentheses',
    body: (
      <>
        <p>
          <code>IN</code> checks a list of values in one go; <code>BETWEEN</code> checks an
          inclusive range. Both can be negated with <code>NOT</code>:
        </p>
        <pre className="code-block">{`WHERE tutor_group_id IN (1, 3)
WHERE score BETWEEN 70 AND 89
WHERE tutor_group_id NOT IN (1)`}</pre>
        <p>
          Without parentheses, <code>AND</code> is always worked out before <code>OR</code>, and{' '}
          <code>NOT</code> before that:
        </p>
        <pre className="code-block">{`-- Reads as (surname = 'Smith' AND tutor_group_id = 1) OR surname = 'Brown'
WHERE surname = 'Smith' AND tutor_group_id = 1 OR surname = 'Brown'

-- Parentheses change the order: OR happens first
WHERE (surname = 'Smith' OR surname = 'Brown') AND tutor_group_id = 2`}</pre>
      </>
    ),
    challenge: {
      prompt: 'Find every grade BETWEEN 70 AND 100.',
      query: 'SELECT * FROM grades WHERE score BETWEEN 70 AND 100',
    },
  },
  {
    id: 'order-limit-distinct',
    section: 'Shaping Results',
    title: 'Sorting, Limiting and De-duplicating',
    body: (
      <>
        <pre className="code-block">{`SELECT forename, surname FROM students ORDER BY surname ASC   -- A-Z (DESC for Z-A)

SELECT forename, surname FROM students ORDER BY surname ASC LIMIT 5

SELECT DISTINCT tutor_group_id FROM students  -- unique values only`}</pre>
      </>
    ),
    challenge: {
      prompt: 'List every student ordered by surname, limited to the first 3.',
      query: 'SELECT forename, surname FROM students ORDER BY surname ASC LIMIT 3',
    },
  },
  {
    id: 'aliases',
    section: 'Shaping Results',
    title: 'Aliases',
    body: (
      <>
        <p><code>AS</code> renames a column or table in the output - it's optional, the alias can go straight after:</p>
        <pre className="code-block">{`SELECT forename AS FirstName, surname AS LastName FROM students

SELECT forename first_name, surname last_name FROM students   -- same thing, no AS`}</pre>
        <p>Table aliases save a lot of typing in joins (next lesson) - once a table has an alias, use it everywhere in that query.</p>
      </>
    ),
    challenge: {
      prompt: 'Select forename and surname from students, aliased to FirstName and LastName.',
      query: 'SELECT forename AS FirstName, surname AS LastName FROM students',
    },
  },
  {
    id: 'joins',
    section: 'Joining Tables',
    title: 'Joining Tables',
    diagram: (
      <JoinDiagram
        leftTitle="students"
        leftColumns={['student_id', 'forename', 'surname', 'tutor_group_id']}
        leftKeyIndex={3}
        leftKeyLabel="FK"
        rightTitle="tutor_groups"
        rightColumns={['tutor_group_id', 'tutor_name', 'room']}
        rightKeyIndex={0}
        rightKeyLabel="PK"
      />
    ),
    body: (
      <>
        <p>
          A JOIN combines rows from two tables using a shared value: a <strong>foreign key</strong>{' '}
          (FK) in one table that points to a <strong>primary key</strong> (PK) in another. Every
          student's <code>tutor_group_id</code> matches exactly one row's <code>tutor_group_id</code>{' '}
          in <code>tutor_groups</code>, as shown above. <code>INNER JOIN ... ON</code> tells SQL
          which two columns to match up:
        </p>
        <pre className="code-block">{`SELECT students.forename, students.surname, tutor_groups.tutor_name
FROM students
INNER JOIN tutor_groups ON students.tutor_group_id = tutor_groups.tutor_group_id`}</pre>
        <p>
          When a column name exists in both tables (like <code>tutor_group_id</code> here), you
          must qualify it with the table name, or you'll get an <code>AMBIGUOUS_COLUMN</code> error.
          With table aliases, the same query is shorter:
        </p>
        <pre className="code-block">{`SELECT s.forename, s.surname, t.tutor_name
FROM students s
INNER JOIN tutor_groups t ON s.tutor_group_id = t.tutor_group_id`}</pre>
      </>
    ),
    challenge: {
      prompt: 'Join students to grades (on student_id), selecting forename, module and score.',
      query: `SELECT students.forename, grades.module, grades.score
FROM students
INNER JOIN grades ON students.student_id = grades.student_id`,
    },
  },
  {
    id: 'multi-join',
    section: 'Joining Tables',
    title: 'Joining Multiple Tables',
    diagram: <SchemaOverview />,
    body: (
      <>
        <p>
          You're not limited to one JOIN - chain more <code>INNER JOIN</code> clauses to bring in
          further tables, one at a time. A later join's <code>ON</code> can reference any table
          already joined, not just the one immediately before it - here the second join
          references <code>s</code>, from the original <code>FROM</code>, not <code>t</code>:
        </p>
        <pre className="code-block">{`SELECT s.forename, t.tutor_name, g.module, g.score
FROM students s
INNER JOIN tutor_groups t ON s.tutor_group_id = t.tutor_group_id
INNER JOIN grades g ON s.student_id = g.student_id`}</pre>
        <p>
          Everything you already know still applies across every joined table at once -{' '}
          <code>WHERE</code>, <code>GROUP BY</code>, <code>HAVING</code>, <code>ORDER BY</code>:
        </p>
        <pre className="code-block">{`SELECT s.forename, t.tutor_name, g.score
FROM students s
INNER JOIN tutor_groups t ON s.tutor_group_id = t.tutor_group_id
INNER JOIN grades g ON s.student_id = g.student_id
WHERE t.room = 'B12' AND g.score >= 90
ORDER BY g.score DESC`}</pre>
      </>
    ),
    challenge: {
      prompt: 'Join all three tables, then find grades of 90+ for students in room B12.',
      query: `SELECT s.forename, t.tutor_name, g.module, g.score
FROM students s
INNER JOIN tutor_groups t ON s.tutor_group_id = t.tutor_group_id
INNER JOIN grades g ON s.student_id = g.student_id
WHERE t.room = 'B12' AND g.score >= 90
ORDER BY g.score DESC`,
    },
  },
  {
    id: 'outer-joins',
    section: 'Joining Tables',
    title: 'Outer Joins: LEFT, RIGHT, FULL',
    diagram: <JoinTypeComparison leftLabel="emp" rightLabel="dept" />,
    body: (
      <>
        <p>
          <code>INNER JOIN</code> only keeps rows with a match on both sides - shown above as
          just the overlap. Sometimes you want to keep rows that <em>don't</em> have a match too:
        </p>
        <ul>
          <li><code>LEFT [OUTER] JOIN</code> - every row from the left table, right side <code>NULL</code> when there's no match</li>
          <li><code>RIGHT [OUTER] JOIN</code> - every row from the right table, left side <code>NULL</code> when there's no match</li>
          <li><code>FULL [OUTER] JOIN</code> - every row from both tables</li>
        </ul>
        <p>
          The sample data doesn't have any unmatched rows to show this with (every student has a
          tutor group and at least one grade), so here's a scratch example. Bob's <code>dept_id</code>{' '}
          matches nothing, and HR has no employees:
        </p>
        <pre className="code-block">{`CREATE TABLE dept (id INT PRIMARY KEY, dept_name VARCHAR(50));
CREATE TABLE emp (id INT PRIMARY KEY, emp_name VARCHAR(50), dept_id INT);
INSERT INTO dept (id, dept_name) VALUES (1, 'Sales');
INSERT INTO dept (id, dept_name) VALUES (2, 'HR');
INSERT INTO emp (id, emp_name, dept_id) VALUES (1, 'Alice', 1);
INSERT INTO emp (id, emp_name, dept_id) VALUES (2, 'Bob', 99);

-- Every employee appears, even Bob (dept_name comes back NULL)
SELECT e.emp_name, d.dept_name FROM emp e LEFT JOIN dept d ON e.dept_id = d.id;`}</pre>
        <p>
          A <code>NULL</code> from an outer join behaves like any other <code>NULL</code>:{' '}
          <code>COUNT(column)</code> skips it, and comparing it in <code>WHERE</code> is never true.
        </p>
      </>
    ),
    challenge: {
      prompt: "Run this to set up dept/emp, then see FULL OUTER JOIN keep both Bob and HR - each with a NULL on the other side.",
      query: `CREATE TABLE dept (id INT PRIMARY KEY, dept_name VARCHAR(50));
CREATE TABLE emp (id INT PRIMARY KEY, emp_name VARCHAR(50), dept_id INT);
INSERT INTO dept (id, dept_name) VALUES (1, 'Sales');
INSERT INTO dept (id, dept_name) VALUES (2, 'HR');
INSERT INTO emp (id, emp_name, dept_id) VALUES (1, 'Alice', 1);
INSERT INTO emp (id, emp_name, dept_id) VALUES (2, 'Bob', 99);
SELECT e.emp_name, d.dept_name FROM emp e FULL OUTER JOIN dept d ON e.dept_id = d.id;`,
    },
  },
  {
    id: 'aggregates',
    section: 'Aggregating Data',
    title: 'Aggregate Functions',
    body: (
      <>
        <p>Aggregate functions summarise many rows into one value:</p>
        <ul>
          <li><code>COUNT(*)</code> - count all rows; <code>COUNT(column)</code> - count non-null values</li>
          <li><code>SUM(column)</code> - total; <code>AVG(column)</code> - average</li>
          <li><code>MIN(column)</code> / <code>MAX(column)</code> - smallest / largest value</li>
        </ul>
        <pre className="code-block">{`SELECT COUNT(*) FROM students
SELECT AVG(score) FROM grades`}</pre>
      </>
    ),
    challenge: {
      prompt: 'Find the highest score in grades.',
      query: 'SELECT MAX(score) FROM grades',
    },
  },
  {
    id: 'group-by',
    section: 'Aggregating Data',
    title: 'GROUP BY',
    body: (
      <>
        <p>
          <code>GROUP BY</code> splits rows into groups (one per distinct value) before an
          aggregate runs, giving one summary row per group instead of one for the whole table:
        </p>
        <pre className="code-block">{`SELECT tutor_group_id, COUNT(*) FROM students GROUP BY tutor_group_id

SELECT module, AVG(score) FROM grades GROUP BY module ORDER BY AVG(score) DESC`}</pre>
        <p className="warning-box">
          ⚠️ <strong>Rule:</strong> once you <code>GROUP BY</code>, every column in the{' '}
          <code>SELECT</code> list must either be a <code>GROUP BY</code> column or be wrapped in
          an aggregate function - SQL can't show a plain column's value for a group that spans
          several different rows.
        </p>
      </>
    ),
    challenge: {
      prompt: 'Count how many grade records exist for each module.',
      query: 'SELECT module, COUNT(*) FROM grades GROUP BY module',
    },
  },
  {
    id: 'having',
    section: 'Aggregating Data',
    title: 'HAVING',
    body: (
      <>
        <p>
          <code>WHERE</code> filters rows <em>before</em> grouping; <code>HAVING</code> filters
          groups <em>after</em> grouping - and it's the only place an aggregate function can appear
          in a condition, since grouping hasn't happened yet when <code>WHERE</code> runs:
        </p>
        <pre className="code-block">{`-- Tutor groups with more than 3 students
SELECT tutor_group_id, COUNT(*) FROM students
GROUP BY tutor_group_id
HAVING COUNT(*) > 3

-- WHERE, GROUP BY and HAVING together
SELECT module, COUNT(*) FROM grades
WHERE score >= 70
GROUP BY module
HAVING COUNT(*) > 5`}</pre>
      </>
    ),
    challenge: {
      prompt: 'Find every module with an average score of at least 80.',
      query: 'SELECT module, AVG(score) FROM grades GROUP BY module HAVING AVG(score) >= 80',
    },
  },
  {
    id: 'subqueries',
    section: 'Subqueries',
    title: 'Subqueries',
    body: (
      <>
        <p>
          A subquery is a complete <code>SELECT</code> written inside another query. Every
          subquery here is <strong>uncorrelated</strong> - self-contained, unable to refer to the
          outer query's tables.
        </p>
        <pre className="code-block">{`-- IN (subquery): students with at least one grade of 95+
SELECT forename, surname FROM students
WHERE student_id IN (SELECT student_id FROM grades WHERE score >= 95)

-- Scalar subquery: must return exactly one row and one column
SELECT forename, surname FROM students
WHERE tutor_group_id = (SELECT tutor_group_id FROM tutor_groups WHERE room = 'B12')

-- EXISTS: true if the subquery returns any row at all
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
ORDER BY t.avg_score DESC`}</pre>
      </>
    ),
    challenge: {
      prompt: 'Find students with no grade below 70, using NOT IN with a subquery.',
      query: `SELECT forename, surname FROM students
WHERE student_id NOT IN (SELECT student_id FROM grades WHERE score < 70)`,
    },
  },
  {
    id: 'changing-data',
    section: 'Changing Data',
    title: 'CREATE, INSERT, UPDATE, DELETE',
    body: (
      <>
        <p>
          <code>students</code>, <code>tutor_groups</code> and <code>grades</code> are{' '}
          <strong>protected</strong> - read-only. To practise changing data, create your own
          table first:
        </p>
        <pre className="code-block">{`CREATE TABLE tasks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(100) NOT NULL,
  done BOOLEAN NOT NULL
);

INSERT INTO tasks (title, done) VALUES ('Write SQL', FALSE);
UPDATE tasks SET done = TRUE WHERE title = 'Write SQL';
DELETE FROM tasks WHERE done = TRUE;`}</pre>
        <ul>
          <li><strong>Types:</strong> <code>INT</code>/<code>DECIMAL</code>/<code>FLOAT</code>/<code>NUMERIC</code> → number, <code>VARCHAR</code>/<code>CHAR</code>/<code>TEXT</code> → string, <code>BOOLEAN</code> → true/false</li>
          <li><strong>PRIMARY KEY</strong> must be unique and non-null; <strong>AUTO_INCREMENT</strong> fills it in automatically; <strong>NOT NULL</strong> makes a value required</li>
          <li><code>ALTER TABLE tasks ADD COLUMN priority INT</code> adds a column; <code>DROP TABLE tasks</code> removes a table you created</li>
        </ul>
      </>
    ),
    challenge: {
      prompt: 'Create a notes table with an auto-incrementing id and a required text column, then add one note.',
      query: `CREATE TABLE notes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  text VARCHAR(200) NOT NULL
);

INSERT INTO notes (text) VALUES ('My first note');

SELECT * FROM notes;`,
    },
  },
  {
    id: 'errors',
    section: 'Reference',
    title: 'Reading Error Messages',
    body: (
      <>
        <p>SQLSim's errors are meant to be readable, not cryptic:</p>
        <table className="guide-table">
          <thead><tr><th>Code</th><th>Means</th><th>Fix</th></tr></thead>
          <tbody>
            <tr><td><code>SYNTAX_ERROR</code></td><td>The query doesn't parse</td><td>Check quotes, commas, keyword spelling</td></tr>
            <tr><td><code>UNKNOWN_TABLE</code></td><td>That table doesn't exist</td><td>Check the left panel for the real name</td></tr>
            <tr><td><code>UNKNOWN_COLUMN</code></td><td>That column doesn't exist in scope</td><td>Check spelling</td></tr>
            <tr><td><code>AMBIGUOUS_COLUMN</code></td><td>The column exists in more than one joined table</td><td>Qualify it: <code>table.column</code></td></tr>
            <tr><td><code>UNSUPPORTED_FEATURE</code></td><td>Real SQL, but not implemented here</td><td>See the next lesson</td></tr>
          </tbody>
        </table>
      </>
    ),
    challenge: {
      prompt: "See an AMBIGUOUS_COLUMN error for yourself - tutor_group_id exists in both tables here.",
      query: `SELECT tutor_group_id
FROM students
INNER JOIN tutor_groups ON students.tutor_group_id = tutor_groups.tutor_group_id`,
    },
  },
  {
    id: 'not-supported',
    section: 'Reference',
    title: "What's Not Supported",
    body: (
      <>
        <p>This is a teaching tool covering the core of SQL, not the whole standard. Not available:</p>
        <ul>
          <li>❌ Correlated subqueries (one that refers back to the outer query)</li>
          <li>❌ A derived table as a JOIN target (only in the main <code>FROM</code>)</li>
          <li>❌ Subqueries in the <code>SELECT</code> list</li>
          <li>❌ CASE statements</li>
        </ul>
        <p>That's everything SQLSim covers - go back to any lesson from the list, or start experimenting on your own!</p>
      </>
    ),
  },
];
