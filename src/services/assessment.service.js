import pool from '../../db/db.js';

/**
 * Saves a generated assessment to the database, including its questions and options.
 */
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

            if (assmnt.questions && Array.isArray(assmnt.questions)) {
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

/**
 * Fetches all assessments and results for a specific user.
 */
export async function getUserResults(userId) {
    const query = `
        SELECT 
            a.id, a.skill, a.job_title, a.created_at,
            COUNT(q.id) as total_questions,
            COUNT(ur.question_id) as answered_questions,
            COALESCE(SUM(ur.score), 0) as correct_answers
        FROM assessments a
        LEFT JOIN questions q ON a.id = q.assessment_id
        LEFT JOIN user_results ur ON q.id = ur.question_id AND ur.user_id = a.user_id
        WHERE a.user_id = $1
        GROUP BY a.id
        ORDER BY a.created_at DESC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
}

/**
 * Fetches a specific assessment by ID, verifying user ownership.
 */
export async function getAssessmentById(id, userId) {
    const assessmentRes = await pool.query(
        'SELECT * FROM assessments WHERE id = $1 AND user_id = $2',
        [id, userId]
    );

    if (assessmentRes.rows.length === 0) return null;

    const assessment = assessmentRes.rows[0];

    const questionsRes = await pool.query(
        'SELECT * FROM questions WHERE assessment_id = $1 ORDER BY sequence_num',
        [id]
    );

    const questions = await Promise.all(questionsRes.rows.map(async (q) => {
        const optionsRes = await pool.query(
            'SELECT * FROM question_options WHERE question_id = $1 ORDER BY label',
            [q.id]
        );
        return {
            ...q,
            options: optionsRes.rows.map(o => o.content)
        };
    }));

    return { ...assessment, questions };
}

/**
 * Submits a batch of user results for assessment questions.
 */
export async function submitUserResults(userId, results) {
    try {
        await pool.query('BEGIN');
        let totalScore = 0;

        for (const r of results) {
            // 1. Verify if the option is correct by querying question_options
            const optionsRes = await pool.query(
                'SELECT is_correct FROM question_options WHERE question_id = $1 AND content = $2',
                [r.question_id, r.selected_option]
            );

            let isCorrect = false;
            if (optionsRes.rows.length > 0) {
                isCorrect = optionsRes.rows[0].is_correct;
            } else {
                // For non-multiple-choice (e.g. text fill), fall back to checking the question's correct_answer
                const qRes = await pool.query('SELECT correct_answer FROM questions WHERE id = $1', [r.question_id]);
                if (qRes.rows.length > 0) {
                    const cleanAns = String(r.selected_option || '').toLowerCase().trim();
                    const cleanCor = String(qRes.rows[0].correct_answer || '').toLowerCase().trim();
                    isCorrect = (cleanAns === cleanCor); // Simple text match
                }
            }

            if (isCorrect) totalScore++;

            await pool.query(
                `INSERT INTO user_results (user_id, question_id, selected_option, is_correct, score)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (user_id, question_id) 
                 DO UPDATE SET selected_option = EXCLUDED.selected_option, 
                               is_correct = EXCLUDED.is_correct, 
                               score = EXCLUDED.score,
                               answered_at = now()`,
                [userId, r.question_id, r.selected_option, isCorrect, isCorrect ? 1 : 0]
            );
        }
        await pool.query('COMMIT');
        return totalScore;
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error("Submit error:", err);
        throw err;
    }
}

/**
 * Fetches the raw data needed for learning path generation.
 */
export async function getLearningPathSourceData(userId) {
    const query = `
        SELECT 
            a.skill, CAST(a.priority AS TEXT) as priority,
            COUNT(q.id) as total_questions,
            COUNT(ur.question_id) as answered_questions,
            COALESCE(SUM(ur.score), 0) as correct_answers
        FROM assessments a
        LEFT JOIN questions q ON a.id = q.assessment_id
        LEFT JOIN user_results ur ON q.id = ur.question_id AND ur.user_id = a.user_id
        WHERE a.user_id = $1
        GROUP BY a.id, a.skill, a.priority
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
}

/**
 * Logic to detect if an option is correct based on AI return.
 */
function isOptionCorrect(correctAnswer, label, optStr) {
    const corAns = String(correctAnswer || '').toLowerCase().trim();
    const labLower = label.toLowerCase();
    const cleanOpt = optStr.toLowerCase().replace(/^[a-z][\.\:\)]\s*/, '').trim();
    const cleanCor = corAns.replace(/^[a-z][\.\:\)]\s*/, '').trim();
    
    if (corAns === labLower || corAns.startsWith(labLower + '.') || corAns.startsWith(labLower + ')') || corAns.startsWith(labLower + ':')) {
        return true;
    } 
    
    if (cleanCor === cleanOpt && cleanCor.length > 0) {
        return true;
    }

    if (cleanCor.length > 5 && (cleanCor.includes(cleanOpt) || cleanOpt.includes(cleanCor))) {
        return true;
    }
    
    return false;
}
