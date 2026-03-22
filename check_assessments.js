import pool from './db/db.js';
import fs from 'fs';

async function check() {
    try {
        const res = await pool.query(`
            SELECT DISTINCT a.skill 
            FROM user_results ur
            JOIN assessments a ON a.id = ur.assessment_id
        `);
        const skills = res.rows.map(r => r.skill).join(', ');
        fs.writeFileSync('skills_output.txt', skills);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
