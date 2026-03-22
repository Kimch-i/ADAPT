import PDFParser from 'pdf2json';
import pool from '../../db/db.js';

export async function extractTextFromPdfBuffer(buffer) {
    return new Promise((resolve, reject) => {
        const parser = new PDFParser(null, true);

        parser.on('pdfParser_dataReady', () => {
            try {
                const text = decodeURIComponent(parser.getRawTextContent());
                resolve(text);
            } catch (err) {
                reject(err);
            }
        });

        parser.on('pdfParser_dataError', err => {
            reject(err);
        });

        parser.parseBuffer(buffer);
    });
}

/**
 * Saves a user's resume PDF buffer to the database, overwriting any existing one.
 */
export async function saveResumeToDb(userId, fileName, fileData) {
    // Delete existing resumes for this user to ensure "overwrite"
    await pool.query('DELETE FROM files WHERE user_id = $1', [userId]);
    
    // Insert new resume
    await pool.query(
        `INSERT INTO files (user_id, file_name, file_data) VALUES ($1, $2, $3)`,
        [userId, fileName, fileData]
    );
}

/**
 * Retrieves the user's stored resume from the database.
 */
export async function getResumeFromDb(userId) {
    const res = await pool.query(
        'SELECT file_name, file_data FROM files WHERE user_id = $1 LIMIT 1',
        [userId]
    );
    return res.rows[0];
}
