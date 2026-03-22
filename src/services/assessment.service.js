import pool from '../../db/db.js';

/**
 * Saves a generated assessment to the database, including its questions and options.
 */
export async function saveAssessmentToDb(userId, assessment, jobTitle) {
    try {
        await pool.query('BEGIN');
        const createdIds = [];
        for (const assmnt of assessment.assessments) {

            let priorityVal = String(assmnt.priority || '').toLowerCase().trim();
            priorityVal = priorityVal.replace('_', ' ');

            if (priorityVal.includes('high')) {
                priorityVal = 'high priority';
            } else if (priorityVal.includes('medium')) {
                priorityVal = 'medium priority';
            } else if (priorityVal.includes('low')) {
                priorityVal = 'low priority';
            } else {
                priorityVal = 'medium priority'; // fallback
            }

            const assmtRes = await pool.query(
                `INSERT INTO assessments (user_id, skill, priority, job_title) 
                 VALUES ($1, $2, CAST($3 AS priority_level), $4) RETURNING id`,
                [userId, assmnt.skill || 'Unknown', priorityVal, jobTitle]
            );

            const assessmentId = assmtRes.rows[0].id;
            createdIds.push(assessmentId);

            if (assmnt.questions && Array.isArray(assmnt.questions)) {
                for (let i = 0; i < assmnt.questions.length; i++) {
                    const q = assmnt.questions[i];
                    let safeType = (q.type || 'multiple_choice').toLowerCase().replace('_', ' ');

                    if (safeType.includes('multiple') || safeType.includes('choice')) {
                        safeType = 'multiple_choice';
                    } else if (safeType.includes('true') || safeType.includes('false') || safeType === 'tf') {
                        safeType = 'true_false';
                    } else if (safeType.includes('coding') || safeType.includes('code')) {
                        safeType = 'code_output';
                    } else if (safeType.includes('open') || safeType.includes('ended') || safeType.includes('scenario')) {
                        safeType = 'scenario';
                    } else if (safeType.includes('fill') || safeType.includes('blank')) {
                        safeType = 'fill_blank';
                    } else {
                        safeType = 'multiple_choice'; // fallback
                    }

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
        return createdIds;
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
        LEFT JOIN user_results ur ON q.id = ur.question_id AND ur.user_id = $1 AND ur.assessment_id = a.id
        WHERE a.user_id = $1
        GROUP BY a.id
        ORDER BY a.created_at DESC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
}

/**
 * Fetches the overall score of the most recently answered assessment directly from user_results.
 */
export async function getLatestAssessmentScore(userId) {
    // Step 1: Find the assessment_id of the most recently answered question
    const latestRes = await pool.query(
        `SELECT assessment_id FROM user_results 
         WHERE user_id = $1 AND assessment_id IS NOT NULL
         ORDER BY answered_at DESC LIMIT 1`,
        [userId]
    );

    if (latestRes.rows.length === 0) return null;
    const latestAssessmentId = latestRes.rows[0].assessment_id;

    // Step 2: Aggregate all answers for that assessment (no JOIN to questions to avoid cartesian product)
    const scoreRes = await pool.query(
        `SELECT 
            ur.assessment_id,
            a.skill,
            a.job_title,
            a.created_at,
            COUNT(ur.id) as total_answered,
            COALESCE(SUM(CASE WHEN ur.is_correct THEN 1 ELSE 0 END), 0) as correct_answers,
            (SELECT COUNT(*) FROM questions q WHERE q.assessment_id = $2) as total_questions
         FROM user_results ur
         JOIN assessments a ON a.id = ur.assessment_id
         WHERE ur.user_id = $1 AND ur.assessment_id = $2
         GROUP BY ur.assessment_id, a.skill, a.job_title, a.created_at`,
        [userId, latestAssessmentId]
    );

    if (scoreRes.rows.length === 0) return null;
    return scoreRes.rows[0];
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
        
        // Fetch existing result for this user/question
        const resultRes = await pool.query(
            'SELECT selected_option FROM user_results WHERE user_id = $1 AND question_id = $2',
            [userId, q.id]
        );
        
        const existingAnswer = resultRes.rows.length > 0 ? resultRes.rows[0].selected_option : null;

        return {
            ...q,
            options: optionsRes.rows.map(o => o.content),
            existingAnswer
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
            const cleanSelected = String(r.selected_option || '').trim();

            // Resolve assessment_id: use provided one, or look it up from the question
            let assessmentId = r.assessment_id || null;
            if (!assessmentId) {
                const qLookup = await pool.query('SELECT assessment_id FROM questions WHERE id = $1', [r.question_id]);
                if (qLookup.rows.length > 0) {
                    assessmentId = qLookup.rows[0].assessment_id;
                }
            }

            // 1. Verify if the option is correct by querying question_options
            const optionsRes = await pool.query(
                'SELECT is_correct FROM question_options WHERE question_id = $1 AND content = $2',
                [r.question_id, cleanSelected]
            );

            let isCorrect = false;
            if (optionsRes.rows.length > 0) {
                isCorrect = optionsRes.rows[0].is_correct;
            } else {
                // For non-multiple-choice (e.g. text fill), fall back to checking the question's correct_answer
                const qRes = await pool.query('SELECT correct_answer FROM questions WHERE id = $1', [r.question_id]);
                if (qRes.rows.length > 0) {
                    const cleanAns = cleanSelected.toLowerCase();
                    const cleanCor = String(qRes.rows[0].correct_answer || '').toLowerCase().trim();
                    // More lenient match: if either contains the other, or exact match
                    isCorrect = (cleanAns === cleanCor) || 
                                (cleanCor.length > 3 && cleanAns.includes(cleanCor)) || 
                                (cleanAns.length > 3 && cleanCor.includes(cleanAns));
                }
            }

            if (isCorrect) totalScore++;

            await pool.query(
                `INSERT INTO user_results (user_id, assessment_id, question_id, selected_option, is_correct, score)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 ON CONFLICT (user_id, question_id) 
                 DO UPDATE SET assessment_id = EXCLUDED.assessment_id,
                                selected_option = EXCLUDED.selected_option, 
                               is_correct = EXCLUDED.is_correct, 
                               score = EXCLUDED.score,
                               answered_at = now()`,
                [userId, assessmentId, r.question_id, cleanSelected, isCorrect, isCorrect ? 1 : 0]
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
