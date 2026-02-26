const db = require('./db');

async function checkMatches() {
    try {
        console.log('--- USER DATA ---');
        const users = await db.query('SELECT name, role, specialty, location, status FROM users');
        users.rows.forEach(u => {
            console.log(`[${u.role}] ${u.name} | Status: ${u.status} | Location: "${u.location}" | Spec: "${u.specialty}"`);
        });

        console.log('\n--- NORMALIZED RULES (Sample) ---');
        const rules = await db.query('SELECT DISTINCT category, specialty FROM ref_cancer_rules WHERE category != \'\'');
        rules.rows.forEach(r => {
            console.log(`- ${r.category} => ${r.specialty}`);
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
checkMatches();
