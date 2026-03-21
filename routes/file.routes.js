import express from 'express';
import multer from 'multer';
import PDFParser from 'pdf2json';
import authMiddleware from '../middleware/auth.middleware.js';
import pool from '../db/db.js';

const router = express.Router();

//null pdf parse context, then true for raw text to get raw text
const pdfParser = new PDFParser(null, true);


//saving on RAM
const upload = multer({ storage: multer.memoryStorage() });


//upload.single uses the name resume to find what file to use from frontend
//upload.single is so that we can get req.file.buffer
router.post('/extract', authMiddleware, upload.single('resume'), (req, res) => {
    
    if(!req.file){
        return res.json({success:false, error:"received no file"});
    }
    pdfParser.parseBuffer(req.file.buffer);

    pdfParser.on("pdfParser_dataReady", (pdfData) => {
        const rawText = pdfParser.getRawTextContent();
        const decodedText = decodeURIComponent(rawText);
        console.log(decodedText);
    });
});

router.post('/upload', authMiddleware, upload.single('resume'), async (req, res) => {
    
    if(!req.file){
        return res.status(400).send("no file uploaded");        
    }
    
    try{
        const query = `INSERT INTO files (user_id, file_name, file_data) VALUES ($1, $2, $3)`;  
        const response = await pool.query(query, [req.user.id, req.file.originalname, req.file.buffer]);
   
        res.status(201).json(response.rows[0]);
    }catch(err){    
        console.error(err);
        return res.status(401).json({success: false, error: err});
    }
});

export default router;