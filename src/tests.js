/**
 * Test Suite for SQL Engine
 * Can be run in Node (npm test) or in the browser console via runTests().
 */

import { executeQuery } from './engine/executor.js';
import { sampleData } from './data/sampleData.js';
import { schema } from './data/schema.js';

const clone = obj => JSON.parse(JSON.stringify(obj));

const selectResultRows = result => (result?.rows ? result.rows : []);

// Groups `rows` by `keyFn`, returning a Map of key -> rows in that group.
// Used to independently recompute expected GROUP BY / HAVING results.
const groupRowsBy = (rows, keyFn) => {
  const groups = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  return groups;
};

export const testCases = [
  {
    name: 'Basic SELECT * returns all students',
    queries: ['SELECT * FROM students'],
    shouldPass: true,
    assert: result => {
      if (result.meta.rowCount !== 10) {
        throw new Error(`Expected 10 rows, got ${result.meta.rowCount}`);
      }
    },
  },
  {
    name: 'DISTINCT eliminates duplicates',
    queries: ['SELECT DISTINCT tutor_group_id FROM students ORDER BY tutor_group_id'],
    shouldPass: true,
    assert: result => {
      const expected = [[1], [2], [3]];
      const rows = selectResultRows(result);
      if (JSON.stringify(rows) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(rows)}`);
      }
    },
  },
  {
    name: 'WHERE FALSE returns zero rows',
    queries: ['SELECT * FROM students WHERE FALSE'],
    shouldPass: true,
    assert: result => {
      if (result.meta.rowCount !== 0) {
        throw new Error(`Expected 0 rows, got ${result.meta.rowCount}`);
      }
    },
  },
  {
    name: 'BOOLEAN type roundtrip with AUTO_INCREMENT',
    queries: [
      'CREATE TABLE statuses (id INT AUTO_INCREMENT PRIMARY KEY, active BOOLEAN NOT NULL)',
      'INSERT INTO statuses (active) VALUES (TRUE)',
      'INSERT INTO statuses (active) VALUES (FALSE)',
      'SELECT id, active FROM statuses ORDER BY id',
    ],
    shouldPass: true,
    assert: result => {
      const expected = [[1, true], [2, false]];
      const rows = selectResultRows(result);
      if (JSON.stringify(rows) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(rows)}`);
      }
    },
  },
  {
    name: 'NOT NULL columns reject NULL inserts',
    queries: [
      'CREATE TABLE people (id INT PRIMARY KEY, name VARCHAR(20) NOT NULL)',
      'INSERT INTO people (id, name) VALUES (1, NULL)',
    ],
    shouldPass: false,
    expectedErrorSubstring: 'cannot be NULL',
  },
  {
    name: 'PRIMARY KEY enforces uniqueness',
    queries: [
      'CREATE TABLE pk_test (id INT PRIMARY KEY, note TEXT)',
      "INSERT INTO pk_test (id, note) VALUES (1, 'first')",
      "INSERT INTO pk_test (id, note) VALUES (1, 'dupe')",
    ],
    shouldPass: false,
    expectedErrorSubstring: 'Duplicate primary key',
  },
  {
    name: 'AUTO_INCREMENT advances after explicit value',
    queries: [
      'CREATE TABLE nums (id INT AUTO_INCREMENT PRIMARY KEY, note TEXT)',
      "INSERT INTO nums (note) VALUES ('a')",
      "INSERT INTO nums (id, note) VALUES (10, 'b')",
      "INSERT INTO nums (note) VALUES ('c')",
      'SELECT id, note FROM nums ORDER BY id',
    ],
    shouldPass: true,
    assert: result => {
      const expected = [[1, 'a'], [10, 'b'], [11, 'c']];
      const rows = selectResultRows(result);
      if (JSON.stringify(rows) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(rows)}`);
      }
    },
  },
  {
    name: 'NULL allowed when column is nullable',
    queries: [
      'CREATE TABLE notes (id INT PRIMARY KEY, memo TEXT NULL)',
      "INSERT INTO notes (id, memo) VALUES (1, NULL)",
      'SELECT id, memo FROM notes',
    ],
    shouldPass: true,
    assert: result => {
      const expected = [[1, null]];
      const rows = selectResultRows(result);
      if (JSON.stringify(rows) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(rows)}`);
      }
    },
  },
  {
    name: 'COUNT aggregate works on sample data',
    queries: ['SELECT COUNT(*) FROM students'],
    shouldPass: true,
    assert: result => {
      const rows = selectResultRows(result);
      const expected = [[10]];
      if (JSON.stringify(rows) !== JSON.stringify(expected)) {
        throw new Error(`Expected COUNT 10, got ${JSON.stringify(rows)}`);
      }
    },
  },
  {
    name: 'Type validation rejects string into numeric column',
    queries: [
      'CREATE TABLE metrics (value INT)',
      "INSERT INTO metrics (value) VALUES ('oops')",
    ],
    shouldPass: false,
    expectedErrorSubstring: 'type number',
  },
  {
    name: 'Table alias with AS keyword works in JOIN, WHERE, ORDER BY',
    queries: [
      `SELECT s.forename, s.surname, t.tutor_name
       FROM students AS s
       INNER JOIN tutor_groups AS t ON s.tutor_group_id = t.tutor_group_id
       WHERE t.room = 'B12'
       ORDER BY s.surname ASC`,
    ],
    shouldPass: true,
    assert: result => {
      const expected = ['s.forename', 's.surname', 't.tutor_name'];
      if (JSON.stringify(result.columns) !== JSON.stringify(expected)) {
        throw new Error(`Expected columns ${JSON.stringify(expected)}, got ${JSON.stringify(result.columns)}`);
      }
    },
  },
  {
    name: 'Table alias without AS keyword works the same as with AS',
    queries: [
      `SELECT s.forename, s.surname, t.tutor_name
       FROM students s
       INNER JOIN tutor_groups t ON s.tutor_group_id = t.tutor_group_id
       WHERE t.room = 'B12'
       ORDER BY s.surname ASC`,
    ],
    shouldPass: true,
    assert: result => {
      const rows = selectResultRows(result);
      if (rows.length === 0) {
        throw new Error('Expected at least one row');
      }
    },
  },
  {
    name: 'Duplicate table alias is rejected',
    queries: [
      'SELECT * FROM students s INNER JOIN tutor_groups s ON s.tutor_group_id = s.tutor_group_id',
    ],
    shouldPass: false,
    expectedErrorSubstring: "Duplicate table alias or name 's'",
  },
  {
    name: 'WHERE OR combines two conditions',
    queries: [`SELECT * FROM students WHERE surname = 'Smith' OR surname = 'Brown'`],
    shouldPass: true,
    assert: result => {
      const expected = sampleData.students.filter(s => s.surname === 'Smith' || s.surname === 'Brown').length;
      if (result.meta.rowCount !== expected) {
        throw new Error(`Expected ${expected} rows, got ${result.meta.rowCount}`);
      }
    },
  },
  {
    name: 'WHERE NOT negates a comparison',
    queries: [`SELECT * FROM students WHERE NOT tutor_group_id = 1`],
    shouldPass: true,
    assert: result => {
      const expected = sampleData.students.filter(s => s.tutor_group_id !== 1).length;
      if (result.meta.rowCount !== expected) {
        throw new Error(`Expected ${expected} rows, got ${result.meta.rowCount}`);
      }
    },
  },
  {
    name: 'WHERE IN matches any listed value',
    queries: [`SELECT * FROM students WHERE tutor_group_id IN (1, 3)`],
    shouldPass: true,
    assert: result => {
      const expected = sampleData.students.filter(s => [1, 3].includes(s.tutor_group_id)).length;
      if (result.meta.rowCount !== expected) {
        throw new Error(`Expected ${expected} rows, got ${result.meta.rowCount}`);
      }
    },
  },
  {
    name: 'WHERE NOT IN excludes listed values',
    queries: [`SELECT * FROM students WHERE tutor_group_id NOT IN (1, 3)`],
    shouldPass: true,
    assert: result => {
      const expected = sampleData.students.filter(s => ![1, 3].includes(s.tutor_group_id)).length;
      if (result.meta.rowCount !== expected) {
        throw new Error(`Expected ${expected} rows, got ${result.meta.rowCount}`);
      }
    },
  },
  {
    name: 'WHERE BETWEEN is inclusive of both bounds',
    queries: [`SELECT * FROM grades WHERE score BETWEEN 80 AND 90`],
    shouldPass: true,
    assert: result => {
      const expected = sampleData.grades.filter(g => g.score >= 80 && g.score <= 90).length;
      if (result.meta.rowCount !== expected) {
        throw new Error(`Expected ${expected} rows, got ${result.meta.rowCount}`);
      }
    },
  },
  {
    name: 'WHERE NOT BETWEEN excludes the range',
    queries: [`SELECT * FROM grades WHERE score NOT BETWEEN 80 AND 90`],
    shouldPass: true,
    assert: result => {
      const expected = sampleData.grades.filter(g => !(g.score >= 80 && g.score <= 90)).length;
      if (result.meta.rowCount !== expected) {
        throw new Error(`Expected ${expected} rows, got ${result.meta.rowCount}`);
      }
    },
  },
  {
    name: 'AND binds tighter than OR (standard SQL precedence)',
    queries: [`SELECT * FROM students WHERE tutor_group_id = 1 AND surname = 'Smith' OR surname = 'Brown'`],
    shouldPass: true,
    assert: result => {
      // Expected reading: (tutor_group_id = 1 AND surname = 'Smith') OR surname = 'Brown'
      const expected = sampleData.students.filter(
        s => (s.tutor_group_id === 1 && s.surname === 'Smith') || s.surname === 'Brown'
      ).length;
      if (result.meta.rowCount !== expected) {
        throw new Error(`Expected ${expected} rows, got ${result.meta.rowCount}`);
      }
    },
  },
  {
    name: 'UPDATE and DELETE support OR, NOT, IN, and BETWEEN in WHERE',
    queries: [
      'CREATE TABLE widgets (id INT PRIMARY KEY, category VARCHAR(20), price INT)',
      "INSERT INTO widgets (id, category, price) VALUES (1, 'A', 10)",
      "INSERT INTO widgets (id, category, price) VALUES (2, 'B', 20)",
      "INSERT INTO widgets (id, category, price) VALUES (3, 'C', 30)",
      "INSERT INTO widgets (id, category, price) VALUES (4, 'D', 40)",
      "UPDATE widgets SET price = 0 WHERE category = 'A' OR category = 'B'",
      "DELETE FROM widgets WHERE price BETWEEN 1 AND 35 AND NOT category = 'C'",
      'SELECT id, category, price FROM widgets ORDER BY id',
    ],
    shouldPass: true,
    assert: result => {
      const expected = [
        [1, 'A', 0],
        [2, 'B', 0],
        [3, 'C', 30],
        [4, 'D', 40],
      ];
      const rows = selectResultRows(result);
      if (JSON.stringify(rows) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(rows)}`);
      }
    },
  },
  {
    name: 'Parentheses override default AND/OR precedence',
    queries: [
      `SELECT * FROM students
       WHERE (surname = 'Smith' OR surname = 'Brown') AND tutor_group_id = 2`,
    ],
    shouldPass: true,
    assert: result => {
      const expected = sampleData.students.filter(
        s => (s.surname === 'Smith' || s.surname === 'Brown') && s.tutor_group_id === 2
      ).length;
      if (result.meta.rowCount !== expected) {
        throw new Error(`Expected ${expected} rows, got ${result.meta.rowCount}`);
      }
    },
  },
  {
    name: 'NOT applies to a whole parenthesized group',
    queries: [`SELECT * FROM students WHERE NOT (tutor_group_id = 1 OR tutor_group_id = 3)`],
    shouldPass: true,
    assert: result => {
      const expected = sampleData.students.filter(
        s => !(s.tutor_group_id === 1 || s.tutor_group_id === 3)
      ).length;
      if (result.meta.rowCount !== expected) {
        throw new Error(`Expected ${expected} rows, got ${result.meta.rowCount}`);
      }
    },
  },
  {
    name: 'Nested parenthesized groups combine correctly',
    queries: [
      `SELECT * FROM students
       WHERE (tutor_group_id = 1 OR tutor_group_id = 2) AND (surname = 'Smith' OR surname = 'Brown')`,
    ],
    shouldPass: true,
    assert: result => {
      const expected = sampleData.students.filter(
        s =>
          (s.tutor_group_id === 1 || s.tutor_group_id === 2) &&
          (s.surname === 'Smith' || s.surname === 'Brown')
      ).length;
      if (result.meta.rowCount !== expected) {
        throw new Error(`Expected ${expected} rows, got ${result.meta.rowCount}`);
      }
    },
  },
  {
    name: 'Unbalanced parenthesis in WHERE is a syntax error',
    queries: [`SELECT * FROM students WHERE (tutor_group_id = 1`],
    shouldPass: false,
    expectedErrorSubstring: 'Expected RPAREN',
  },
  {
    name: 'WHERE IN (subquery) matches students with a high grade',
    queries: [
      `SELECT student_id FROM students
       WHERE student_id IN (SELECT student_id FROM grades WHERE score >= 95)
       ORDER BY student_id`,
    ],
    shouldPass: true,
    assert: result => {
      const expected = sampleData.students.filter(s =>
        sampleData.grades.some(g => g.student_id === s.student_id && g.score >= 95)
      ).length;
      if (result.meta.rowCount !== expected) {
        throw new Error(`Expected ${expected} rows, got ${result.meta.rowCount}`);
      }
    },
  },
  {
    name: 'WHERE NOT IN (subquery) excludes students with any low grade',
    queries: [
      `SELECT student_id FROM students
       WHERE student_id NOT IN (SELECT student_id FROM grades WHERE score < 70)
       ORDER BY student_id`,
    ],
    shouldPass: true,
    assert: result => {
      const expected = sampleData.students.filter(
        s => !sampleData.grades.some(g => g.student_id === s.student_id && g.score < 70)
      ).length;
      if (result.meta.rowCount !== expected) {
        throw new Error(`Expected ${expected} rows, got ${result.meta.rowCount}`);
      }
    },
  },
  {
    name: 'WHERE = (scalar subquery) filters by a computed single value',
    queries: [
      `SELECT forename, surname FROM students
       WHERE tutor_group_id = (SELECT tutor_group_id FROM tutor_groups WHERE room = 'B12')
       ORDER BY surname`,
    ],
    shouldPass: true,
    assert: result => {
      const targetGroup = sampleData.tutor_groups.find(t => t.room === 'B12').tutor_group_id;
      const expected = sampleData.students.filter(s => s.tutor_group_id === targetGroup).length;
      if (result.meta.rowCount !== expected) {
        throw new Error(`Expected ${expected} rows, got ${result.meta.rowCount}`);
      }
    },
  },
  {
    name: 'WHERE EXISTS (subquery) is true when the subquery finds any row',
    queries: [`SELECT COUNT(*) FROM students WHERE EXISTS (SELECT student_id FROM grades WHERE score >= 95)`],
    shouldPass: true,
    assert: result => {
      const anyHighScore = sampleData.grades.some(g => g.score >= 95);
      const expected = anyHighScore ? sampleData.students.length : 0;
      const rows = selectResultRows(result);
      if (rows[0][0] !== expected) {
        throw new Error(`Expected COUNT(*) = ${expected}, got ${rows[0][0]}`);
      }
    },
  },
  {
    name: 'WHERE NOT EXISTS (subquery) is true when the subquery finds nothing',
    queries: [`SELECT COUNT(*) FROM students WHERE NOT EXISTS (SELECT student_id FROM grades WHERE score > 1000)`],
    shouldPass: true,
    assert: result => {
      const rows = selectResultRows(result);
      if (rows[0][0] !== sampleData.students.length) {
        throw new Error(`Expected COUNT(*) = ${sampleData.students.length}, got ${rows[0][0]}`);
      }
    },
  },
  {
    name: 'Scalar subquery returning more than one row is a runtime error',
    queries: [
      `SELECT forename FROM students
       WHERE tutor_group_id = (SELECT tutor_group_id FROM tutor_groups)`,
    ],
    shouldPass: false,
    expectedErrorSubstring: 'returned 3 rows',
  },
  {
    name: 'IN subquery returning more than one column is a validation error',
    queries: [
      `SELECT forename FROM students
       WHERE student_id IN (SELECT student_id, score FROM grades)`,
    ],
    shouldPass: false,
    expectedErrorSubstring: 'Subquery must return exactly one column (found 2)',
  },
  {
    name: 'A bare subquery cannot stand alone in WHERE',
    queries: [`SELECT * FROM students WHERE (SELECT 1 FROM students)`],
    shouldPass: false,
    expectedErrorSubstring: "can't stand alone",
  },
  {
    name: 'FROM derived table (subquery) works as a table source',
    queries: [
      `SELECT t.tutor_group_id, g.tutor_name
       FROM (SELECT DISTINCT tutor_group_id FROM students) t
       INNER JOIN tutor_groups g ON t.tutor_group_id = g.tutor_group_id
       ORDER BY t.tutor_group_id`,
    ],
    shouldPass: true,
    assert: result => {
      const expected = sampleData.tutor_groups
        .map(t => [t.tutor_group_id, t.tutor_name])
        .sort((a, b) => a[0] - b[0]);
      const rows = selectResultRows(result);
      if (JSON.stringify(rows) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(rows)}`);
      }
    },
  },
  {
    name: 'FROM derived table with GROUP BY and an aliased aggregate',
    queries: [
      `SELECT t.tutor_group_id, t.avg_score
       FROM (
         SELECT students.tutor_group_id, AVG(grades.score) AS avg_score
         FROM students
         INNER JOIN grades ON students.student_id = grades.student_id
         GROUP BY students.tutor_group_id
       ) t
       ORDER BY t.avg_score DESC`,
    ],
    shouldPass: true,
    assert: result => {
      const rows = selectResultRows(result);
      if (rows.length !== 3) {
        throw new Error(`Expected 3 rows, got ${rows.length}`);
      }
      const groupIds = rows.map(r => r[0]).sort((a, b) => a - b);
      if (JSON.stringify(groupIds) !== JSON.stringify([1, 2, 3])) {
        throw new Error(`Expected tutor groups [1, 2, 3], got ${JSON.stringify(groupIds)}`);
      }
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][1] > rows[i - 1][1]) {
          throw new Error('Expected avg_score to be sorted descending');
        }
      }
    },
  },
  {
    name: 'A derived table without an alias is a syntax error',
    queries: [`SELECT * FROM (SELECT * FROM students)`],
    shouldPass: false,
    expectedErrorSubstring: 'must have an alias',
  },
  {
    name: 'A derived table is not supported as a JOIN target',
    queries: [
      `SELECT * FROM students
       INNER JOIN (SELECT * FROM tutor_groups) t ON students.tutor_group_id = t.tutor_group_id`,
    ],
    shouldPass: false,
    expectedErrorSubstring: 'only supported in the main FROM clause',
  },
  {
    name: 'An unaliased aggregate in a derived table is a syntax error',
    queries: [`SELECT * FROM (SELECT tutor_group_id, COUNT(*) FROM students GROUP BY tutor_group_id) t`],
    shouldPass: false,
    expectedErrorSubstring: 'Give this COUNT(...) an alias',
  },
  {
    name: 'A duplicate unaliased column name in a derived table is a syntax error',
    queries: [`SELECT * FROM (SELECT student_id, student_id FROM students) t`],
    shouldPass: false,
    expectedErrorSubstring: 'appears more than once',
  },
  {
    name: 'UPDATE and DELETE support IN (subquery) and NOT IN (subquery)',
    queries: [
      'CREATE TABLE widgets (id INT PRIMARY KEY, category VARCHAR(20), price INT)',
      'CREATE TABLE flagged (id INT PRIMARY KEY)',
      "INSERT INTO widgets (id, category, price) VALUES (1, 'A', 10)",
      "INSERT INTO widgets (id, category, price) VALUES (2, 'B', 20)",
      "INSERT INTO widgets (id, category, price) VALUES (3, 'C', 30)",
      "INSERT INTO widgets (id, category, price) VALUES (4, 'D', 40)",
      'INSERT INTO flagged (id) VALUES (2)',
      'INSERT INTO flagged (id) VALUES (4)',
      'UPDATE widgets SET price = 0 WHERE id IN (SELECT id FROM flagged)',
      'DELETE FROM widgets WHERE id NOT IN (SELECT id FROM flagged)',
      'SELECT id, category, price FROM widgets ORDER BY id',
    ],
    shouldPass: true,
    assert: result => {
      const expected = [
        [2, 'B', 0],
        [4, 'D', 0],
      ];
      const rows = selectResultRows(result);
      if (JSON.stringify(rows) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(rows)}`);
      }
    },
  },
  {
    name: 'HAVING COUNT(*) filters groups by their row count',
    queries: [
      `SELECT tutor_group_id, COUNT(*) FROM students
       GROUP BY tutor_group_id
       HAVING COUNT(*) > 3
       ORDER BY tutor_group_id`,
    ],
    shouldPass: true,
    assert: result => {
      const groups = groupRowsBy(sampleData.students, s => s.tutor_group_id);
      const expected = [...groups.entries()]
        .filter(([, rows]) => rows.length > 3)
        .map(([id, rows]) => [id, rows.length])
        .sort((a, b) => a[0] - b[0]);
      const rows = selectResultRows(result);
      if (JSON.stringify(rows) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(rows)}`);
      }
    },
  },
  {
    name: 'HAVING AVG(...) filters groups by a computed aggregate',
    queries: [
      `SELECT module, AVG(score) FROM grades
       GROUP BY module
       HAVING AVG(score) >= 80
       ORDER BY module`,
    ],
    shouldPass: true,
    assert: result => {
      const groups = groupRowsBy(sampleData.grades, g => g.module);
      const expectedModules = [...groups.entries()]
        .filter(([, rows]) => rows.reduce((s, r) => s + r.score, 0) / rows.length >= 80)
        .map(([module]) => module)
        .sort();
      const rows = selectResultRows(result);
      const actualModules = rows.map(r => r[0]);
      if (JSON.stringify(actualModules) !== JSON.stringify(expectedModules)) {
        throw new Error(`Expected modules ${JSON.stringify(expectedModules)}, got ${JSON.stringify(actualModules)}`);
      }
    },
  },
  {
    name: 'WHERE, GROUP BY and HAVING combine correctly',
    queries: [
      `SELECT module, COUNT(*) FROM grades
       WHERE score >= 70
       GROUP BY module
       HAVING COUNT(*) > 5
       ORDER BY module`,
    ],
    shouldPass: true,
    assert: result => {
      const groups = groupRowsBy(sampleData.grades.filter(g => g.score >= 70), g => g.module);
      const expected = [...groups.entries()]
        .filter(([, rows]) => rows.length > 5)
        .map(([module, rows]) => [module, rows.length])
        .sort((a, b) => (a[0] < b[0] ? -1 : 1));
      const rows = selectResultRows(result);
      if (JSON.stringify(rows) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(rows)}`);
      }
    },
  },
  {
    name: 'HAVING can AND together multiple aggregate conditions',
    queries: [
      `SELECT module, COUNT(*), AVG(score) FROM grades
       GROUP BY module
       HAVING COUNT(*) > 5 AND AVG(score) >= 75
       ORDER BY module`,
    ],
    shouldPass: true,
    assert: result => {
      const groups = groupRowsBy(sampleData.grades, g => g.module);
      const expectedModules = [...groups.entries()]
        .filter(([, rows]) => rows.length > 5 && rows.reduce((s, r) => s + r.score, 0) / rows.length >= 75)
        .map(([module]) => module)
        .sort();
      const rows = selectResultRows(result);
      const actualModules = rows.map(r => r[0]);
      if (JSON.stringify(actualModules) !== JSON.stringify(expectedModules)) {
        throw new Error(`Expected modules ${JSON.stringify(expectedModules)}, got ${JSON.stringify(actualModules)}`);
      }
    },
  },
  {
    name: 'HAVING can reference a GROUP BY column directly, not just aggregates',
    queries: [
      `SELECT tutor_group_id, COUNT(*) FROM students
       GROUP BY tutor_group_id
       HAVING tutor_group_id != 2
       ORDER BY tutor_group_id`,
    ],
    shouldPass: true,
    assert: result => {
      const groups = groupRowsBy(sampleData.students, s => s.tutor_group_id);
      const expected = [...groups.entries()]
        .filter(([id]) => id !== 2)
        .map(([id, rows]) => [id, rows.length])
        .sort((a, b) => a[0] - b[0]);
      const rows = selectResultRows(result);
      if (JSON.stringify(rows) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(rows)}`);
      }
    },
  },
  {
    name: 'HAVING BETWEEN filters on an aggregate range',
    queries: [
      `SELECT module, COUNT(*) FROM grades
       GROUP BY module
       HAVING COUNT(*) BETWEEN 3 AND 10
       ORDER BY module`,
    ],
    shouldPass: true,
    assert: result => {
      const groups = groupRowsBy(sampleData.grades, g => g.module);
      const expected = [...groups.entries()]
        .filter(([, rows]) => rows.length >= 3 && rows.length <= 10)
        .map(([module, rows]) => [module, rows.length])
        .sort((a, b) => (a[0] < b[0] ? -1 : 1));
      const rows = selectResultRows(result);
      if (JSON.stringify(rows) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(rows)}`);
      }
    },
  },
  {
    name: 'HAVING works without GROUP BY, filtering the whole table as one group',
    queries: ['SELECT COUNT(*) FROM students HAVING COUNT(*) > 1000'],
    shouldPass: true,
    assert: result => {
      if (result.meta.rowCount !== 0) {
        throw new Error(`Expected 0 rows, got ${result.meta.rowCount}`);
      }
    },
  },
  {
    name: 'A non-aggregated, non-GROUP-BY column in HAVING is a validation error',
    queries: [
      `SELECT tutor_group_id, COUNT(*) FROM students
       GROUP BY tutor_group_id
       HAVING surname = 'Smith'`,
    ],
    shouldPass: false,
    expectedErrorSubstring: 'must appear in GROUP BY clause or be used in an aggregate function',
  },
  {
    name: 'Single-line -- comments are ignored, to end of line only',
    queries: [
      `-- This whole line is a comment
       SELECT forename, surname -- trailing comment on the SELECT line
       FROM students -- another one here
       WHERE surname = 'Smith' -- and one more
       ORDER BY forename ASC`,
    ],
    shouldPass: true,
    assert: result => {
      const expected = sampleData.students.filter(s => s.surname === 'Smith').length;
      if (result.meta.rowCount !== expected) {
        throw new Error(`Expected ${expected} rows, got ${result.meta.rowCount}`);
      }
    },
  },
  {
    name: 'Block /* */ comments are ignored, including multi-line ones',
    queries: [
      `SELECT forename, surname /* inline block comment */ FROM students
       /*
         A block comment
         spanning several lines
       */
       WHERE surname = 'Smith'`,
    ],
    shouldPass: true,
    assert: result => {
      const expected = sampleData.students.filter(s => s.surname === 'Smith').length;
      if (result.meta.rowCount !== expected) {
        throw new Error(`Expected ${expected} rows, got ${result.meta.rowCount}`);
      }
    },
  },
  {
    name: 'A comment can sit directly against a token with no whitespace',
    queries: [`SELECT/*no space*/* FROM students--no space either`],
    shouldPass: true,
    assert: result => {
      if (result.meta.rowCount !== sampleData.students.length) {
        throw new Error(`Expected ${sampleData.students.length} rows, got ${result.meta.rowCount}`);
      }
    },
  },
  {
    name: 'A -- sequence inside a block comment does not end it early',
    queries: [`SELECT * FROM students /* -- still a comment */ WHERE surname = 'Smith'`],
    shouldPass: true,
    assert: result => {
      const expected = sampleData.students.filter(s => s.surname === 'Smith').length;
      if (result.meta.rowCount !== expected) {
        throw new Error(`Expected ${expected} rows, got ${result.meta.rowCount}`);
      }
    },
  },
  {
    name: 'An unterminated block comment is a syntax error',
    queries: ['SELECT * FROM students /* never closed'],
    shouldPass: false,
    expectedErrorSubstring: 'Unterminated block comment',
  },
  {
    name: 'A second JOIN chains onto the first, three tables in one query',
    queries: [
      `SELECT s.forename, t.tutor_name, g.score
       FROM students s
       INNER JOIN tutor_groups t ON s.tutor_group_id = t.tutor_group_id
       INNER JOIN grades g ON s.student_id = g.student_id`,
    ],
    shouldPass: true,
    assert: result => {
      // tutor_groups is 1:1 with every student, so the row count is driven
      // entirely by how many grade records each student has.
      if (result.meta.rowCount !== sampleData.grades.length) {
        throw new Error(`Expected ${sampleData.grades.length} rows, got ${result.meta.rowCount}`);
      }
      const rows = selectResultRows(result);
      const alice = sampleData.students.find(s => s.forename === 'Alice');
      const aliceTutor = sampleData.tutor_groups.find(t => t.tutor_group_id === alice.tutor_group_id).tutor_name;
      const aliceGradeCount = sampleData.grades.filter(g => g.student_id === alice.student_id).length;
      const aliceRows = rows.filter(r => r[0] === 'Alice');
      if (aliceRows.length !== aliceGradeCount) {
        throw new Error(`Expected ${aliceGradeCount} rows for Alice, got ${aliceRows.length}`);
      }
      if (!aliceRows.every(r => r[1] === aliceTutor)) {
        throw new Error(`Expected every Alice row to show tutor '${aliceTutor}'`);
      }
    },
  },
  {
    name: 'A later JOIN can reference the original FROM table, not just the one before it',
    queries: [
      `SELECT s.forename, g.score
       FROM students s
       INNER JOIN tutor_groups t ON s.tutor_group_id = t.tutor_group_id
       INNER JOIN grades g ON s.student_id = g.student_id
       WHERE t.room = 'B12' AND g.score >= 90`,
    ],
    shouldPass: true,
    assert: result => {
      const room = sampleData.tutor_groups.find(t => t.room === 'B12');
      const studentIds = new Set(
        sampleData.students.filter(s => s.tutor_group_id === room.tutor_group_id).map(s => s.student_id)
      );
      const expected = sampleData.grades.filter(g => studentIds.has(g.student_id) && g.score >= 90).length;
      if (result.meta.rowCount !== expected) {
        throw new Error(`Expected ${expected} rows, got ${result.meta.rowCount}`);
      }
    },
  },
  {
    name: 'GROUP BY and aggregates work across multiple JOINs',
    queries: [
      `SELECT s.forename, s.surname, COUNT(*)
       FROM students s
       INNER JOIN tutor_groups t ON s.tutor_group_id = t.tutor_group_id
       INNER JOIN grades g ON s.student_id = g.student_id
       GROUP BY s.forename, s.surname
       ORDER BY s.surname`,
    ],
    shouldPass: true,
    assert: result => {
      const rows = selectResultRows(result);
      if (rows.length !== sampleData.students.length) {
        throw new Error(`Expected ${sampleData.students.length} groups, got ${rows.length}`);
      }
      const alice = sampleData.students.find(s => s.forename === 'Alice');
      const aliceGradeCount = sampleData.grades.filter(g => g.student_id === alice.student_id).length;
      const aliceRow = rows.find(r => r[0] === 'Alice');
      if (!aliceRow || aliceRow[2] !== aliceGradeCount) {
        throw new Error(`Expected Alice's count to be ${aliceGradeCount}, got ${aliceRow && aliceRow[2]}`);
      }
    },
  },
  {
    name: 'An unknown table in a second JOIN is still a clear validation error',
    queries: [
      `SELECT * FROM students
       INNER JOIN tutor_groups ON students.tutor_group_id = tutor_groups.tutor_group_id
       INNER JOIN not_a_table ON students.student_id = not_a_table.student_id`,
    ],
    shouldPass: false,
    expectedErrorSubstring: 'Unknown table: not_a_table',
  },
];

export function runTests({ silent = false } = {}) {
  if (!silent) {
    console.log('🧪 Running SQL Engine Tests...\n');
  }

  let passed = 0;
  let failed = 0;

  for (const test of testCases) {
    const tables = clone(sampleData);
    const schemaCopy = clone(schema);
    let lastResult = null;

    try {
      for (const query of test.queries) {
        lastResult = executeQuery({
          queryText: query,
          tables,
          schema: schemaCopy,
        });
      }

      if (!test.shouldPass) {
        failed++;
        if (!silent) {
          console.error(`❌ ${test.name}`);
          console.error('   Expected an error, but all queries succeeded');
        }
        continue;
      }

      if (typeof test.assert === 'function') {
        test.assert(lastResult, tables, schemaCopy);
      }

      passed++;
      if (!silent) {
        console.log(`✅ ${test.name}`);
      }
    } catch (error) {
      if (test.shouldPass) {
        failed++;
        if (!silent) {
          console.error(`❌ ${test.name}`);
          console.error(`   Unexpected error: ${error.message}`);
        }
        continue;
      }

      const message = error?.message || '';
      if (test.expectedErrorSubstring && !message.includes(test.expectedErrorSubstring)) {
        failed++;
        if (!silent) {
          console.error(`❌ ${test.name}`);
          console.error(`   Expected error containing "${test.expectedErrorSubstring}", got "${message}"`);
        }
        continue;
      }

      passed++;
      if (!silent) {
        console.log(`✅ ${test.name}`);
        console.log(`   Caught expected error: ${message}`);
      }
    }
  }

  if (!silent) {
    console.log(`\n📊 Results: ${passed}/${testCases.length} passed, ${failed} failed`);
  }

  return { passed, failed, total: testCases.length };
}
