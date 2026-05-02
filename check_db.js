
const db = require('./backend/src/config/db');

async function checkSchema() {
    try {
        console.log("Checking 'patients' table schema...");
        const patientsRes = await db.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'patients'
            ORDER BY ordinal_position;
        `);
        console.table(patientsRes.rows);

        console.log("\nChecking 'patient_hospital_links' table schema...");
        const linksRes = await db.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'patient_hospital_links'
            ORDER BY ordinal_position;
        `);
        console.table(linksRes.rows);

        console.log("\nChecking 'ref_cancer_rules' table data for Breast Cancer...");
        const cancerRes = await db.query(`
            SELECT * FROM ref_cancer_rules WHERE category ILIKE '%sein%' OR category ILIKE '%breast%';
        `);
        console.table(cancerRes.rows);

        process.exit(0);
    } catch (err) {
        console.error("Error checking schema:", err);
        process.exit(1);
    }
}

checkSchema();
