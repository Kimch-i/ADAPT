import express from 'express';
import multer from 'multer';
import PDFParser from 'pdf2json';
import { generateAssessment, generateLearningPath } from '../src/config/groq.js';
import { saveAssessmentToDb } from '../src/services/assessment.service.js';
import pool from '../db/db.js';
import authMiddleware from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authMiddleware);

//null pdf parse context, then true for raw text to get raw text
const pdfParser = new PDFParser(null, true);



const upload = multer({ storage: multer.memoryStorage() });



router.post('/extract', upload.single('resume'), (req, res) => {

    if (!req.file) {
        return res.json({ success: false, error: "received no file" });
    }
    pdfParser.parseBuffer(req.file.buffer);

    pdfParser.on("pdfParser_dataReady", (pdfData) => {
        const rawText = pdfParser.getRawTextContent();
        const decodedText = decodeURIComponent(rawText);
        console.log(decodedText);
    });
});

router.post('/upload', upload.single('resume'), (req, res) => {

});

router.post('/generate', async (req, res) => {
    try {
        let { jobTitle, skills, type } = req.body;
        const userId = req.user.id;
        if (!jobTitle || !skills) {
            return res.status(400).json({ error: "Missing jobTitle or skills" });
        }

        const assessmentType = type || 'claimed';

        if (assessmentType === 'target') {
            const userRes = await pool.query('SELECT preferred_job_title FROM users WHERE id = $1', [userId]);
            if (userRes.rows.length > 0 && userRes.rows[0].preferred_job_title) {
                jobTitle = userRes.rows[0].preferred_job_title;
            }
        }

        const assessment = await generateAssessment(jobTitle, skills, assessmentType);

        await saveAssessmentToDb(userId, assessment, jobTitle);

        res.json({ success: true, assessment });
    } catch (error) {
        console.error("Error generating assessment:", error);
        res.status(500).json({ error: "Failed to generate assessment" });
    }
});

router.post('/submit', async (req, res) => {
    try {
        const { results } = req.body;
        const userId = req.user.id;
        if (!results || !Array.isArray(results)) {
            return res.status(400).json({ error: "Missing results" });
        }

        await pool.query('BEGIN');
        for (const r of results) {
            await pool.query(
                `INSERT INTO user_results (user_id, question_id, selected_option, is_correct, score)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (user_id, question_id) 
                 DO UPDATE SET selected_option = EXCLUDED.selected_option, 
                               is_correct = EXCLUDED.is_correct, 
                               score = EXCLUDED.score,
                               answered_at = now()`,
                [userId, r.question_id, r.selected_option, r.is_correct, r.is_correct ? 1 : 0]
            );
        }
        await pool.query('COMMIT');
        res.json({ success: true, message: "Results saved successfully!" });
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error("Error saving assessment results:", err);
        res.status(500).json({ error: "Failed to save results" });
    }
});

router.get('/my-results', async (req, res) => {
    try {
        const userId = req.user.id;

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

        res.json({ success: true, results: result.rows });
    } catch (err) {
        console.error("Error fetching results", err);
        res.status(500).json({ error: "Failed to fetch results" });
    }
});

router.post('/generate-learning-path', async (req, res) => {
    try {
        const userId = req.user.id;

        const userRes = await pool.query('SELECT users.preffered_job_title FROM users WHERE id = $1', [userId]);
        const jobTitle = userRes.rows.length > 0 && userRes.rows[0].preffered_job_title
            ? userRes.rows[0].preffered_job_title
            : 'Software Engineer';

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


        let allDone = true;
        let leftToAnswer = 0;

        const assessmentResults = result.rows.map(r => {
            const total = parseInt(r.total_questions) || 0;
            const correct = parseInt(r.correct_answers) || 0;
            const answered = parseInt(r.answered_questions) || 0;

            if (answered < total) {
                allDone = false;
                leftToAnswer += (total - answered);
            }

            let percentage = 0;
            if (answered > 0 && total > 0) {
                percentage = Math.round((correct / total) * 100);
            }

            return {
                skill: r.skill,
                priority: r.priority,
                total_questions: total,
                correct_answers: correct,
                score_percentage: percentage
            };
        });

        if (assessmentResults.length === 0) {
            return res.status(400).json({ error: "No assessments found to generate a learning path." });
        }

        // 1. Check if a learning path already exists in the database
        const existingPathRes = await pool.query(
            'SELECT path_data FROM learning_paths WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
            [userId]
        );
        if (existingPathRes.rows.length > 0 && existingPathRes.rows[0].path_data) {
            return res.json({ success: true, learningPath: existingPathRes.rows[0].path_data, cached: true });
        }

        // 2. If it doesn't exist, strictly verify all assessments are fully completely answered!
        if (!allDone) {
            return res.status(400).json({
                error: `Learning path cannot auto-generate. You still have ${leftToAnswer} assessment questions pending completion!`,
                inProgress: true
            });
        }

        // 3. Generate it if all tests are done
        const { generateLearningPath } = await import('../src/config/groq.js');
        const learningPath = await generateLearningPath(jobTitle, assessmentResults);

        // Enhance with real resources!
        const { fetchResources } = await import('../src/config/resources.js');
        if (learningPath.learning_path) {
            // Process resources sequentially for each step to respect API rate limits
            for (let i = 0; i < learningPath.learning_path.length; i++) {
                const step = learningPath.learning_path[i];
                if (step.search_queries && step.search_queries.length > 0) {
                    step.enhanced_resources = await fetchResources(step.search_queries);
                }
            }
        }

        // 4. Save it into the DB so next visit hits the Cache (step 1)
        await pool.query(
            `INSERT INTO learning_paths (user_id, path_data) VALUES ($1, $2)`,
            [userId, JSON.stringify(learningPath)]
        );

        res.json({ success: true, learningPath, cached: false });
    } catch (error) {
        console.error("Error generating learning path:", error);
        res.status(500).json({ error: "Failed to generate learning path" });
    }
});

router.get('/recommendations', async (req, res) => {
    try {
        const userId = req.user.id;

        const userQuery = await pool.query('SELECT users.preffered_job_title FROM users WHERE id = $1', [userId]);
        if (!userQuery.rows.length) return res.status(404).json({ error: "User not found" });

        const targetJobTitle = userQuery.rows[0].preffered_job_title || 'Software Developer';

        // Rule-based title matching explicitly pulling only their exact DB preference.
        const recommendedTitles = [
            { job_title: targetJobTitle, match_score: 95, readiness: 'ready now', reason: "Direct match to your target career goals based on assessment scores." }
        ];

        const topTitles = recommendedTitles
            .filter(t => t.readiness === 'ready now')
            .slice(0, 3);

        const { fetchRemotive, fetchJobicy, fetchAdzuna } = await import('../src/services/job-listings.js');

        const listingsPerTitle = await Promise.all(
            topTitles.map(async t => {
                const [remotive, jobicy, adzuna] = await Promise.allSettled([
                    fetchRemotive(t.job_title),
                    fetchJobicy(t.job_title),
                    fetchAdzuna(t.job_title)
                ]);

                const listings = [
                    ...(remotive.status === 'fulfilled' ? remotive.value : []),
                    ...(jobicy.status === 'fulfilled' ? jobicy.value : []),
                    ...(adzuna.status === 'fulfilled' ? adzuna.value : []),
                ];

                return {
                    job_title: t.job_title,
                    match_score: t.match_score,
                    readiness: t.readiness,
                    reason: t.reason,
                    listings: listings
                };
            })
        );

        res.json({
            success: true,
            recommended_titles: recommendedTitles,
            job_listings: listingsPerTitle
        });
    } catch (err) {
        console.error("Recommendations failed:", err);
        res.status(500).json({ error: "Failed to load job boards" });
    }
});

export default router;
