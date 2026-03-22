
import { saveAssessmentToDb } from './src/services/assessment.service.js';
import pool from './db/db.js';

async function verify() {
  const userId = 1;
  const mockAssessment = {
    assessments: [
      {
        skill: 'Test Skill High',
        priority: 'high priority',
        questions: [
          {
            type: 'multiple_choice',
            question: 'What is 1+1?',
            options: ['A. 1', 'B. 2', 'C. 3'],
            correct_answer: 'B'
          }
        ]
      },
      {
        skill: 'Test Skill Medium',
        priority: 'Medium', // Testing the normalization
        questions: [
          {
            type: 'true_false',
            question: 'Sky is blue',
            correct_answer: 'True'
          }
        ]
      },
      {
        skill: 'Test Skill Low',
        priority: 'low_priority', // Testing the normalization
        questions: [
          {
            type: 'scenario',
            question: 'A scenario question',
            correct_answer: 'Answer'
          }
        ]
      }
    ]
  };

  try {
    console.log('Testing saveAssessmentToDb...');
    await saveAssessmentToDb(userId, mockAssessment, 'Verification Job');
    console.log('Success! Assessment saved without enum errors.');
    
    // Cleanup the test data
    const res = await pool.query("SELECT id FROM assessments WHERE job_title = 'Verification Job'");
    for (const row of res.rows) {
      await pool.query("DELETE FROM assessments WHERE id = $1", [row.id]);
    }
    console.log('Test data cleaned up.');
    process.exit(0);
  } catch (err) {
    console.error('Verification failed:', err);
    process.exit(1);
  }
}

verify();
