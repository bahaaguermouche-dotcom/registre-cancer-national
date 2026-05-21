require('dotenv').config({ path: './.env' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function listTables() {
  const res = await pool.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type='BASE TABLE'
    ORDER BY table_name;
  `);
  return res.rows.map(r => r.table_name);
}

async function countRows(table) {
  const res = await pool.query(`SELECT COUNT(*) FROM "${table}"`);
  return res.rows[0].count;
}

(async () => {
  try {
    console.log('🔎 Listing tables...');
    const tables = await listTables();
    console.log('Tables:', tables.join(', '));
    for (const tbl of tables) {
      const cnt = await countRows(tbl);
      console.log(`- ${tbl}: ${cnt} rows`);
    }
    console.log('✅ Database verification completed.');
    await pool.end();
  } catch (err) {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  }
})();
