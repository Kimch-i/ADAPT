import express from 'express';
import multer from 'multer';
import authMiddleware from '../middleware/auth.middleware.js';
import pool from '../db/db.js';
import { extractTextFromPdfBuffer } from '../src/services/file.service.js';

const router = express.Router();

//saving on RAM
const upload = multer({ storage: multer.memoryStorage() });


/**
 * Extract raw text from an uploaded resume PDF.
 * Returns the raw text only — no AI call.
 */
router.post('/extract', authMiddleware, upload.single('resume'), async (req, res) => {
    console.log("extract");
    if (!req.file) {
        return res.status(400).json({ success: false, error: "No file received" });
    }

    try {
        const rawText = await extractTextFromPdfBuffer(req.file.buffer);
        console.log("Extracted text:", rawText);
        console.log("Parsed resume text length:", rawText.length);

        res.json({
            success: true,
            resumeText: rawText
        });

    } catch (err) {
        console.error("Resume extraction error:", err);
        res.status(500).json({ success: false, error: "Failed to parse resume: " + err.message });
    }
});

export default router;
