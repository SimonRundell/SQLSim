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
