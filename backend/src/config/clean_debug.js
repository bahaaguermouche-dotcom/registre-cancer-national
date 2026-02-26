const db = require('./db');

async function debug() {
    try {
        const rules = await db.query('SELECT DISTINCT category, specialty FROM ref_cancer_rules');
        console.log('--- RULES ---');
        rules.rows.forEach(r => console.log(`${r.category} -> ${r.specialty}`));

        const doctors = await db.query('SELECT name, specialty FROM users WHERE role = \'Médecin\' AND status = \'active\'');
        console.log('\n--- ACTIVE DOCTORS ---');
        doctors.rows.forEach(d => console.log(`${d.name} -> ${d.specialty}`));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
debug();
