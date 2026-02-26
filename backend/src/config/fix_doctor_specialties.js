const db = require('./db');

async function fix() {
    try {
        const res = await db.query("UPDATE users SET specialty = 'Oncologie Médicale' WHERE role = 'Médecin' AND specialty IS NULL");
        console.log(`Successfully updated ${res.rowCount} doctors with default specialty.`);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
fix();
