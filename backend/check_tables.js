require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'registry_db',
    password: process.env.DB_PASSWORD || 'your_password', // Will try default postgres logic via db.js instead
    port: process.env.DB_PORT || 5432,
});

async function main() {
    try {
        const res = await pool.query("SELECT * FROM bilan_packages LIMIT 1");
        console.log("Table exists:", res.rows);
    } catch (e) {
        console.error("Error:", e.message);
    }
    process.exit(0);
}
main();
