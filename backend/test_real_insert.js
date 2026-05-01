const db = require('./src/config/db');

async function testRealInsert() {
    try {
        // 1. Get a real patient
        const patientRes = await db.query('SELECT id FROM patients LIMIT 1');
        if (patientRes.rowCount === 0) {
            console.log("No patients found in DB!");
            process.exit(0);
        }
        const patientId = patientRes.rows[0].id;
        console.log("Using patient ID:", patientId);

        // 2. Get a real doctor (admin or doctor)
        const doctorRes = await db.query("SELECT id, name FROM users WHERE role IN ('Médecin', 'Administrateur National') LIMIT 1");
        const doc = doctorRes.rows[0];
        console.log("Using doctor:", doc.name, "(ID:", doc.id, ")");

        // 3. Try insert
        const tests = ['NFS', 'Radiographie'];
        const result = await db.query(
            `INSERT INTO lab_requests (patient_id, doctor_id, doctor_name, laboratory_id, laboratory_name, tests_requested, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [patientId, doc.id, doc.name, null, 'Lab Test', JSON.stringify(tests), 'Notes test']
        );
        console.log("Success! Created lab request:", result.rows[0].id);

    } catch (e) {
        console.error("DB_ERROR:", e.message);
    }
    process.exit(0);
}

testRealInsert();
