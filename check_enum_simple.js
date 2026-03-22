
import pool from './db/db.js';

async function checkEnum() {
  try {
    const res = await pool.query(`
      SELECT e.enumlabel AS enum_value
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'priority_level';
    `);
    console.log('Values:', res.rows.map(r => r.enum_value));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkEnum();
