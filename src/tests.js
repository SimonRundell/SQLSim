/**
 * Test Suite for SQL Engine
 * Can be run in Node (npm test) or in the browser console via runTests().
 */

import { executeQuery } from './engine/executor.js';
import { sampleData } from './data/sampleData.js';
import { schema } from './data/schema.js';

const clone = obj => JSON.parse(JSON.stringify(obj));

const selectResultRows = result => (result?.rows ? result.rows : []);

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
