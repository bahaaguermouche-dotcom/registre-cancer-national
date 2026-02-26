const db = require('./db');

async function debugTaxonomy() {
    try {
        console.log('--- ref_cancer_rules Check ---');
        const rules = await db.query('SELECT DISTINCT category, specialty FROM ref_cancer_rules ORDER BY category');
        console.table(rules.rows);

        console.log('--- Active Doctors Check ---');
        const doctors = await db.query('SELECT name, role, specialty, location, status FROM users WHERE role = \'Médecin\'');
        console.table(doctors.rows);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

debugTaxonomy();
