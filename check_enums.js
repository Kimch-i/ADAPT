
import pool from './db/db.js';

async function checkEnums() {
  try {
    const res = await pool.query(`
      SELECT t.typname AS enum_name, e.enumlabel AS enum_value
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname IN ('priority_level', 'question_type');
    `);
    
    const enums = res.rows.reduce((acc, row) => {
      if (!acc[row.enum_name]) acc[row.enum_name] = [];
      acc[row.enum_name].push(row.enum_value);
      return acc;
    }, {});
    
    console.log(JSON.stringify(enums, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkEnums();
