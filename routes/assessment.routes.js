import express from 'express';
import pool from '../db/db.js';
import { generateAssessment, generateLearningPath } from '../src/config/groq.js';
import { fetchResources } from '../src/config/resources.js';
import {
    saveAssessmentToDb,
    getUserResults,
    getAssessmentById,
    submitUserResults,
    getLearningPathSourceData
} from '../src/services/assessment.service.js';
import authMiddleware from '../middleware/auth.middleware.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

/**
 * Generate a new assessment for a job role and skills.
 */
router.post('/generate', async (req, res) => {
    try {
        let { jobTitle, skills, type } = req.body;
        const userId = req.user.id;

        if (!jobTitle || !skills) {
            return res.status(400).json({ error: "Missing jobTitle or skills" });
        }

        const assessmentType = type || 'claimed';

        // Auto-fetch job title from user profile if not provided or for target skills
        if (assessmentType === 'target') {
            const userRes = await pool.query('SELECT preferred_job_title FROM users WHERE id = $1', [userId]);
            if (userRes.rows.length > 0 && userRes.rows[0].preferred_job_title) {
                jobTitle = userRes.rows[0].preferred_job_title;
            }
        }

        const assessment = await generateAssessment(jobTitle, skills, assessmentType);
        await saveAssessmentToDb(userId, assessment, jobTitle);

        res.json({ success: true, assessment });

    } catch (err) {
        console.error("Error generating assessment:", err);
        res.status(500).json({ error: "Failed to generate assessment" });
    }
});

/**
 * List all generated assessments and their scores for the current user.
 */
router.get('/my-results', async (req, res) => {
    try {
        const userId = req.user.id;
        const results = await getUserResults(userId);
        res.json({ success: true, results });
    } catch (err) {
        console.error("Error fetching results:", err);
        res.status(500).json({ error: "Failed to fetch results" });
    }
});

/**
 * Get details for a specific assessment plus questions.
 */
router.get('/assessment/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const assessment = await getAssessmentById(id, userId);

        if (!assessment) {
            return res.status(404).json({ error: "Assessment not found or unauthorized" });
        }

        res.json({ success: true, assessment });
    } catch (err) {
        console.error("Error fetching assessment by ID:", err);
        res.status(500).json({ error: "Failed to load assessment details" });
    }
});

/**
 * Submit answers for a specific assessment.
 */
router.post('/submit', async (req, res) => {
    try {
        const { results } = req.body;
        const userId = req.user.id;

        if (!results || !Array.isArray(results)) {
            return res.status(400).json({ error: "Results array is required" });
        }

        const score = await submitUserResults(userId, results);
        res.json({ success: true, message: "Scores updated successfully!", score });

    } catch (err) {
        console.error("Error submitting results:", err);
        res.status(500).json({ error: "Failed to save results" });
    }
});

/**
 * Generate a personalized learning path based on assessment performance.
 */
router.post('/generate-learning-path', async (req, res) => {
    try {
        const userId = req.user.id;

        // Check cache first
        const cacheRes = await pool.query('SELECT path_data FROM learning_paths WHERE user_id = $1', [userId]);
        if (cacheRes.rows.length > 0) {
            return res.json({ success: true, learningPath: cacheRes.rows[0].path_data });
        }

        // Fetch user data and assessment summary
        const userRes = await pool.query('SELECT preferred_job_title FROM users WHERE id = $1', [userId]);
        if (!userRes.rows.length) return res.status(404).json({ error: "User not found" });

        const jobTitle = userRes.rows[0].preferred_job_title || 'Software Engineer';
        const assessmentResults = await getLearningPathSourceData(userId);

        if (assessmentResults.length === 0) {
            return res.status(400).json({ error: "Please complete at least one assessment first." });
        }

        // Verify completion
        const incompleteCount = assessmentResults.filter(r => parseInt(r.answered_questions) < parseInt(r.total_questions)).length;
        if (incompleteCount > 0) {
            return res.status(400).json({ error: `${incompleteCount} assessments are still in progress. Please finish all questions.` });
        }

        // Generate and enhance with resources
        const learningPath = await generateLearningPath(jobTitle, assessmentResults);

        if (learningPath.steps && Array.isArray(learningPath.steps)) {
            for (let step of learningPath.steps) {
                step.resources = await fetchResources(step.title);
            }
        }

        // Save for future use
        await pool.query(
            `INSERT INTO learning_paths (user_id, path_data) VALUES ($1, $2)`,
            [userId, JSON.stringify(learningPath)]
        );

        res.json({ success: true, learningPath });

    } catch (err) {
        console.error("Error generating learning path:", err);
        res.status(500).json({ error: "Failed to build your personalized roadmap." });
    }
});

/**
 * Job recommendation route.
 */
router.get('/recommendations', async (req, res) => {
    try {
        const userId = req.user.id;
        const userQuery = await pool.query('SELECT preferred_job_title FROM users WHERE id = $1', [userId]);
        if (!userQuery.rows.length) return res.status(404).json({ error: "User not found" });

        const targetJobTitle = userQuery.rows[0].preferred_job_title || 'Software Developer';

        // Mocking some internal matches based on the title, in reality this would fetch from an API or DB
        const recommendedTitles = [
            targetJobTitle,
            `Senior ${targetJobTitle}`,
            `${targetJobTitle} Lead`,
            `Specialist ${targetJobTitle}`
        ];

        res.json({
            success: true,
            jobTitle: targetJobTitle,
            recommendations: recommendedTitles.map(title => ({
                title,
                location: "Remote",
                company: "Potential Match",
                match_score: "High"
            }))
        });
    } catch (err) {
        console.error("Error fetching job recommendations:", err);
        res.status(500).json({ error: "Failed to get job recommendations" });
    }
});

export default router;
