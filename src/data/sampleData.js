/**
 * Sample Data
 * Teaching data designed to demonstrate JOINs, WHERE clauses, and edge cases
 */

export const sampleData = {
  students: [
    { student_id: 1, forename: 'Alice', surname: 'Smith', tutor_group_id: 1 },
    { student_id: 2, forename: 'Bob', surname: 'Johnson', tutor_group_id: 1 },
    { student_id: 3, forename: 'Charlie', surname: 'Smith', tutor_group_id: 2 },
    { student_id: 4, forename: 'Diana', surname: 'Brown', tutor_group_id: 2 },
    { student_id: 5, forename: 'Eve', surname: 'Williams', tutor_group_id: 3 },
    { student_id: 6, forename: 'Frank', surname: 'Davis', tutor_group_id: 3 },
    { student_id: 7, forename: 'Grace', surname: 'Miller', tutor_group_id: 1 },
    { student_id: 8, forename: 'Henry', surname: 'Wilson', tutor_group_id: 2 },
    { student_id: 9, forename: 'Iris', surname: 'Moore', tutor_group_id: 3 },
    { student_id: 10, forename: 'Jack', surname: 'Taylor', tutor_group_id: 1 },
  ],
  tutor_groups: [
    { tutor_group_id: 1, tutor_name: 'Clive Anderson', room: 'B12' },
    { tutor_group_id: 2, tutor_name: 'Amelia Bennett', room: 'A5' },
    { tutor_group_id: 3, tutor_name: 'Sidney Carter', room: 'C3' },
  ],
  attendance: [
    { student_id: 1, session_date: '2026-01-20', present: 'Y' },
    { student_id: 1, session_date: '2026-01-21', present: 'Y' },
    { student_id: 2, session_date: '2026-01-20', present: 'N' },
    { student_id: 2, session_date: '2026-01-21', present: 'Y' },
    { student_id: 3, session_date: '2026-01-20', present: 'Y' },
    { student_id: 5, session_date: '2026-01-20', present: 'Y' },
    { student_id: 5, session_date: '2026-01-21', present: 'Y' },
    { student_id: 7, session_date: '2026-01-20', present: 'N' },
    // Note: students 4, 6, 8, 9, 10 have no attendance records
    // This demonstrates LEFT JOIN scenarios for future expansion
  ],
};
