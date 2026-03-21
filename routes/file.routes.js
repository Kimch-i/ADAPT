import express from 'express';
import multer from 'multer';
import PDFParser from 'pdf2json';
import authMiddleware from '../middleware/auth.middleware.js';
import pool from '../db/db.js';

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
        const rawText = await new Promise((resolve, reject) => {
            const parser = new PDFParser(null, true);
            parser.on("pdfParser_dataReady", () => {
                resolve(decodeURIComponent(parser.getRawTextContent()));
            });
            parser.on("pdfParser_dataError", (err) => {
                reject(err);
            });
            parser.parseBuffer(req.file.buffer);
        });

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
