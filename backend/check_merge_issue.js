const dotenv = require('dotenv');
dotenv.config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function check() {
    try {
        const res = await pool.query("SELECT indexdef FROM pg_indexes WHERE tablename = 'patient_hospital_links'");
        console.log("Indexes for patient_hospital_links:");
        console.log(JSON.stringify(res.rows, null, 2));
        
        const constraints = await pool.query("SELECT conname, pg_get_constraintdef(c.oid) FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid WHERE t.relname = 'patient_hospital_links'");
        console.log("\nConstraints for patient_hospital_links:");
        console.log(JSON.stringify(constraints.rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}
check();
