/**
 * Test Suite for SQL Engine
 * Run these tests in the browser console to verify functionality
 */

import { executeQuery } from './engine/executor.js';
import { sampleData } from './data/sampleData.js';
import { schema } from './data/schema.js';

export const testCases = [
  {
    name: 'Test 1: SELECT * FROM students',
    query: 'SELECT * FROM students',
    shouldPass: true,
    expectedRows: 10,
  },
  {
    name: 'Test 2: SELECT with WHERE clause',
    query: "SELECT forename, surname FROM students WHERE surname = 'Smith'",
    shouldPass: true,
    expectedRows: 2, // Alice Smith and Charlie Smith
  },
  {
    name: 'Test 3: INNER JOIN',
    query: `SELECT students.forename, students.surname, tutor_groups.tutor_name
            FROM students
            INNER JOIN tutor_groups ON students.tutor_group_id = tutor_groups.tutor_group_id`,
    shouldPass: true,
    expectedRows: 10,
  },
  {
    name: 'Test 4: Ambiguous column (should error)',
    query: `SELECT tutor_group_id 
            FROM students 
            INNER JOIN tutor_groups ON students.tutor_group_id = tutor_groups.tutor_group_id`,
    shouldPass: false,
    expectedError: 'AMBIGUOUS_COLUMN',
  },
  {
    name: 'Test 5: Unknown column (should error)',
    query: 'SELECT foo FROM students',
    shouldPass: false,
    expectedError: 'UNKNOWN_COLUMN',
  },
  {
    name: 'Test 6: Unsupported feature (should error)',
    query: 'SELECT COUNT(*) FROM students',
    shouldPass: false,
    expectedError: 'UNSUPPORTED_FEATURE',
  },
  {
    name: 'Test 7: Complex query with all features',
    query: `SELECT students.forename, students.surname, tutor_groups.tutor_name
            FROM students
            INNER JOIN tutor_groups ON students.tutor_group_id = tutor_groups.tutor_group_id
            WHERE tutor_groups.room = 'B12'
            ORDER BY students.surname ASC
            LIMIT 20`,
    shouldPass: true,
    expectedRows: 4, // Students in room B12
  },
  {
    name: 'Test 8: Multiple WHERE conditions',
    query: `SELECT * FROM students 
            WHERE tutor_group_id = 1 AND surname = 'Smith'`,
    shouldPass: true,
    expectedRows: 1, // Alice Smith
  },
  {
    name: 'Test 9: ORDER BY DESC',
    query: 'SELECT forename, surname FROM students ORDER BY surname DESC LIMIT 3',
    shouldPass: true,
    expectedRows: 3,
  },
  {
    name: 'Test 10: Double-quoted string (should error)',
    query: 'SELECT * FROM students WHERE surname = "Smith"',
    shouldPass: false,
    expectedError: 'SYNTAX_ERROR',
  },
];

export function runTests() {
  console.log('🧪 Running SQL Engine Tests...\n');
  
  let passed = 0;
  let failed = 0;

  testCases.forEach((test, index) => {
    try {
      const result = executeQuery({
        queryText: test.query,
        tables: sampleData,
        schema: schema,
      });

      if (test.shouldPass) {
        if (test.expectedRows !== undefined && result.meta.rowCount !== test.expectedRows) {
          console.error(`❌ ${test.name}`);
          console.error(`   Expected ${test.expectedRows} rows, got ${result.meta.rowCount}`);
          failed++;
        } else {
          console.log(`✅ ${test.name}`);
          passed++;
        }
      } else {
        console.error(`❌ ${test.name}`);
        console.error(`   Expected error, but query succeeded`);
        failed++;
      }
    } catch (error) {
      if (!test.shouldPass) {
        if (error.code === test.expectedError) {
          console.log(`✅ ${test.name}`);
          console.log(`   Correctly caught error: ${error.message}`);
          passed++;
        } else {
          console.error(`❌ ${test.name}`);
          console.error(`   Expected error ${test.expectedError}, got ${error.code}`);
          failed++;
        }
      } else {
        console.error(`❌ ${test.name}`);
        console.error(`   Unexpected error: ${error.message}`);
        failed++;
      }
    }
  });

  console.log(`\n📊 Results: ${passed}/${testCases.length} passed, ${failed} failed`);
  return { passed, failed, total: testCases.length };
}

// Auto-run tests if in development mode
if (import.meta.env.DEV) {
  console.log('💡 Tip: Run runTests() in the console to verify all test cases');
}
