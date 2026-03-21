import express from 'express';
import bcrypt from 'bcryptjs';
import pool from '../db/db.js';

const router = express.Router();


router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        
        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, message: 'No user found.' });
        }
        
        const user = result.rows[0];
        const isMatch = await bcrypt.compare(password, user.password);

 
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Incorrect password" });
        }

        return res.json({ success: true, message: "Logged in!" });

    } catch (err) { 
        return res.status(500).json({ success: false, message: err.message }); 
    }
});


router.post('/register', async (req,res)=>{
    const { full_name, email, password, location, preferred_job_title } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 12);
        const result = await pool.query(
            `INSERT INTO users (full_name, email, password, location, preferred_job_title) 
             VALUES ($1, $2, $3, $4, $5) RETURNING id, email`,
            [full_name, email, hashedPassword, location, preferred_job_title]
        );
        res.status(201).json(result.rows);
    } catch (err) {
        res.status(500).json({ success: false, error: `Registration failed: ${err.message} ` });
    }
});


export default router