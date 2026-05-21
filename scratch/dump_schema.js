const db = require('../backend/src/config/db');

async function dumpSchema() {
    try {
        const tables = ['patients', 'diagnostics', 'medical_records', 'tumors', 'patient_hospital_links', 'lab_requests'];
        for (const table of tables) {
            const res = await db.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = $1;
            `, [table]);
            console.log(`--- Columns in ${table} ---`);
            console.log(res.rows);
        }
        process.exit(0);
    } catch (err) {
        console.error('Error dumping schema:', err);
        process.exit(1);
    }
}

dumpSchema();
