const db = require('./db');

async function dump() {
    try {
        console.log('--- Users Dump ---');
        const users = await db.query('SELECT id, name, email, role, location, status FROM users');
        console.table(users.rows);

        console.log('\n--- Patients Dump ---');
        const patients = await db.query('SELECT id, national_id, assigned_doctor_id, hospital_location FROM patients');
        console.table(patients.rows);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
dump();
