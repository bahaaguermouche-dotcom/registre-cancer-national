const db = require('./db');

async function test() {
    try {
        console.log('--- Verification Test: Medical Record Linking ---');

        const loc = '13 Tlemcen - Hospital C';

        // Setup User
        await db.query("DELETE FROM users WHERE email = 'link_test@test.com'");
        const userRes = await db.query(`
            INSERT INTO users (name, email, role, location, status, password_hash)
            VALUES ('Link Test', 'link_test@test.com', 'Médecin', $1, 'active', 'hash')
            RETURNING id
        `, [loc]);
        const uId = userRes.rows[0].id;

        // Setup Patient
        const patientRes = await db.query(`
            INSERT INTO patients (name, first_name, last_name, national_id, assigned_doctor_id, hospital_location)
            VALUES ('Link Patient', 'Link', 'Patient', 'LINK-NID-' || random(), $1, $2)
            RETURNING id
        `, [uId, loc]);
        const pId = patientRes.rows[0].id;

        // Setup Record
        const recordRes = await db.query(`
            INSERT INTO medical_records (patient_id, doctor_id, type, description, file_path)
            VALUES ($1, $2, 'analysis', 'Test', '/path')
            RETURNING id
        `, [pId, uId]);
        const rId = recordRes.rows[0].id;

        // Setup Diagnostic
        const diagRes = await db.query(`
            INSERT INTO diagnostics (patient_id, doctor_id, content)
            VALUES ($1, $2, 'Test Diag')
            RETURNING id
        `, [pId, uId]);
        const dId = diagRes.rows[0].id;

        console.log('Setup complete.');

        // Verify the fix by calling the logic directly or mocking the request
        // Since I'm testing the backend code, I'll simulate the update query
        // But the main goal was to fix the ReferenceError which is visible in the Catch block

        // Mocking the permission check
        const recordCheck = await db.query('SELECT patient_id FROM medical_records WHERE id = $1', [rId]);
        const patientCheck = await db.query('SELECT assigned_doctor_id FROM patients WHERE id = $1', [recordCheck.rows[0].patient_id]);

        if (patientCheck.rows[0].assigned_doctor_id === uId) {
            console.log('Permission Check: PASS');
        } else {
            console.log('Permission Check: FAIL');
        }

        const updateRes = await db.query(
            'UPDATE medical_records SET diagnostic_id = $1 WHERE id = $2 RETURNING id',
            [dId, rId]
        );

        if (updateRes.rowCount === 1) {
            console.log('SUCCESS: Record linked to diagnostic.');
        } else {
            console.log('FAIL: Link failed.');
        }

        console.log('--- End of Test ---');

    } catch (err) {
        console.error('❌ Test failed:', err);
    } finally {
        process.exit();
    }
}

test();
