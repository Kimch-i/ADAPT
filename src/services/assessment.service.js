import pool from '../../db/db.js';

export async function saveAssessmentToDb(userId, assessment, jobTitle) {
    try {
        await pool.query('BEGIN');
        for (const assmnt of assessment.assessments) {

            let priorityVal = String(assmnt.priority).toLowerCase().trim();
            priorityVal = priorityVal.replace('_', ' ');

            if (!['high priority', 'medium priority', 'low priority'].includes(priorityVal)) {
                if (['high', 'medium', 'low'].includes(priorityVal)) {
                    priorityVal = priorityVal + ' priority';
                } else {
                    priorityVal = 'medium priority'; // fallback
                }
            }

            const assmtRes = await pool.query(
                `INSERT INTO assessments (user_id, skill, priority, job_title) 
                 VALUES ($1, $2, CAST($3 AS priority_level), $4) RETURNING id`,
                [userId, assmnt.skill || 'Unknown', priorityVal, jobTitle]
            );

            const assessmentId = assmtRes.rows[0].id;

            if (assmnt.questions) {
                for (let i = 0; i < assmnt.questions.length; i++) {
                    const q = assmnt.questions[i];
                    let safeType = (q.type || 'multiple_choice').toLowerCase();

                    const qRes = await pool.query(
                        `INSERT INTO questions (assessment_id, sequence_num, type, approach, question, code_snippet, correct_answer, explanation)
                         VALUES ($1, $2, CAST($3 AS question_type), $4, $5, $6, $7, $8) RETURNING id`,
                        [
                            assessmentId,
                            i + 1,
                            safeType,
                            q.approach || 'technical',
                            q.question || 'Missing question?',
                            q.code_snippet !== 'null' && q.code_snippet !== null ? q.code_snippet : null,
                            typeof q.correct_answer === 'string' ? q.correct_answer : String(q.correct_answer || ''),
                            q.explanation || ''
                        ]
                    );

                    const qId = qRes.rows[0].id;
                    q.db_id = qId;

                    if (q.options && Array.isArray(q.options) && q.options.length > 0) {
                        for (let j = 0; j < q.options.length; j++) {
                            const optStr = String(q.options[j]);
                            const label = String.fromCharCode(65 + j);

                            let isCorrect = isOptionCorrect(q.correct_answer, label, optStr);

                            await pool.query(
                                `INSERT INTO question_options (question_id, label, content, is_correct, explanation)
                                 VALUES ($1, $2, $3, $4, $5)`,
                                [qId, label, optStr, isCorrect, q.explanation || '']
                            );
                        }
                    } else if (safeType === 'true_false') {
                        const options = ['True', 'False'];
                        for (let j = 0; j < options.length; j++) {
                            const label = String.fromCharCode(65 + j);
                            const isCorrect = String(q.correct_answer || '').toLowerCase() === options[j].toLowerCase() || String(q.correct_answer || '').toLowerCase().startsWith(label.toLowerCase());

                            await pool.query(
                                `INSERT INTO question_options (question_id, label, content, is_correct, explanation)
                                  VALUES ($1, $2, $3, $4, $5)`,
                                [qId, label, options[j], isCorrect, q.explanation || '']
                            );
                        }
                    }
                }
            }
        }
        await pool.query('COMMIT');
    } catch (dbErr) {
        await pool.query('ROLLBACK');
        console.error("Database error during assessment storage:", dbErr);
        throw dbErr;
    }
}

function isOptionCorrect(correctAnswer, label, optStr) {
    const corAns = String(correctAnswer || '').toLowerCase().trim();
    const labLower = label.toLowerCase();
    
    if (corAns === labLower || corAns.startsWith(labLower + '.') || corAns.startsWith(labLower + ')')) {
        return true;
    } 
    
    if (corAns.replace(/^[a-z][\.\)]\s*/, '') === optStr.toLowerCase().replace(/^[a-z][\.\)]\s*/, '')) {
        return true;
    }
    
    return false;
}
