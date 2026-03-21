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
        console.log(rawText);

        res.json({
            success: true,
            resumeText: rawText
        });

    } catch (err) {
        console.error("Resume extraction error:", err);
        res.status(500).json({ success: false, error: "Failed to parse resume: " + err.message });
    }
});


/**
 * Upload and save a resume file to the database.
 */
router.post('/upload', authMiddleware, upload.single('resume'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send("no file uploaded");
    }

    try {
        const query = `INSERT INTO files (user_id, file_name, file_data) VALUES ($1, $2, $3)`;
        const response = await pool.query(query, [req.user.id, req.file.originalname, req.file.buffer]);

        res.status(201).json(response.rows[0]);
    } catch (err) {
        console.error(err);
        return res.status(401).json({ success: false, error: err });
    }
});

export default router;