import express from 'express';
import multer from 'multer';
import authMiddleware from '../middleware/auth.middleware.js';
import { extractTextFromPdfBuffer, saveResumeToDb, getResumeFromDb } from '../src/services/file.service.js';

const router = express.Router();

//saving on RAM
const upload = multer({ storage: multer.memoryStorage() });


/**
 * Extract raw text from an uploaded resume PDF and save it to the database.
 */
router.post('/extract', authMiddleware, upload.single('resume'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, error: "No file received" });
    }

    try {
        const userId = req.user.id;
        const fileName = req.file.originalname;
        const fileData = req.file.buffer;

        // 1. Extract text for the immediate assessment flow
        const rawText = await extractTextFromPdfBuffer(fileData);
        
        // 2. Persist the actual PDF file to the database (overwrites existing)
        await saveResumeToDb(userId, fileName, fileData);

        res.json({
            success: true,
            resumeText: rawText
        });

    } catch (err) {
        console.error("Resume extraction/storage error:", err);
        res.status(500).json({ success: false, error: "Failed to process resume: " + err.message });
    }
});

/**
 * Handle resume download from the database.
 */
router.get('/download-resume', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const file = await getResumeFromDb(userId);

        if (!file || !file.file_data) {
            return res.status(404).json({ error: "No resume found for this user." });
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${file.file_name || 'resume.pdf'}"`);
        res.send(file.file_data);

    } catch (err) {
        console.error("Resume download error:", err);
        res.status(500).json({ error: "Internal server error during download." });
    }
});

export default router;
