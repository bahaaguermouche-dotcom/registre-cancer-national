const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const { Pool } = require('pg');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkIndexes() {
    try {
        const res = await pool.query("SELECT indexdef FROM pg_indexes WHERE tablename = 'patient_hospital_links'");
        console.log("Indexes for patient_hospital_links:");
        console.log(JSON.stringify(res.rows, null, 2));
        
        const tables = await pool.query("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname != 'pg_catalog' AND schemaname != 'information_schema'");
        console.log("\nAvailable tables:");
        console.log(JSON.stringify(tables.rows.map(r => r.tablename), null, 2));
    } catch (err) {
        console.error("Error:", err);
    } finally {
        await pool.end();
    }
}

checkIndexes();
