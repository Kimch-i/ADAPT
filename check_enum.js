
import pool from './db/db.js';

async function checkEnum() {
  try {
    const res = await pool.query(`
      SELECT n.nspname AS schema, t.typname AS enum_name, e.enumlabel AS enum_value
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE t.typname = 'priority_level';
    `);
    console.log('Enum values for priority_level:');
    console.log(JSON.stringify(res.rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('Error checking enum:', err);
    process.exit(1);
  }
}

checkEnum();
