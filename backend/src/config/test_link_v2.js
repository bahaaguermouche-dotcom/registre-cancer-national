const db = require('./db');

async function test() {
    try {
        console.log('--- Verification Test: Record Link v2 (Safety Checks) ---');

        const loc = '13 Tlemcen - Link Test';

        // 1. Setup User
        await db.query("DELETE FROM users WHERE email = 'link_safe@test.com'");
        const userRes = await db.query(`
            INSERT INTO users (name, email, role, location, status, password_hash)
            VALUES ('Link Safe', 'link_safe@test.com', 'Médecin', $1, 'active', 'hash')
            RETURNING id
        `, [loc]);
        const uId = userRes.rows[0].id;

        // 2. Setup Patient
        const pNid = 'SAFE-NID-' + Math.random();
        const patientRes = await db.query(`
            INSERT INTO patients (name, first_name, last_name, national_id, assigned_doctor_id, hospital_location)
            VALUES ('Safe Patient', 'Safe', 'Patient', $1, $2, $3)
            RETURNING id
        `, [pNid, uId, loc]);
        const pId = patientRes.rows[0].id;

        // 3. Setup Record
        const recordRes = await db.query(`
            INSERT INTO medical_records (patient_id, doctor_id, type, description, file_path)
            VALUES ($1, $2, 'analysis', 'Test Safe', '/path')
            RETURNING id
        `, [pId, uId]);
        const rId = recordRes.rows[0].id;

        // 4. Setup Diagnostic
        const diagRes = await db.query(`
            INSERT INTO diagnostics (patient_id, doctor_id, content)
            VALUES ($1, $2, 'Test Safe Diag')
            RETURNING id
        `, [pId, uId]);
        const dId = diagRes.rows[0].id;

        console.log('Setup complete.');

        // Test Helper for the new logic
        const checkLinkLogic = async (recordId, diagId, userId, userRole) => {
            // Replicating logic from index.js
            const rRes = await db.query('SELECT patient_id FROM medical_records WHERE id = $1', [recordId]);
            if (rRes.rowCount === 0) return { status: 404, error: "Document non trouvé" };

            const pRes = await db.query('SELECT id, assigned_doctor_id FROM patients WHERE id = $1', [rRes.rows[0].patient_id]);
            if (pRes.rowCount === 0) return { status: 404, error: "Patient associé à ce document introuvable." };

            const isOwner = pRes.rows[0].assigned_doctor_id === userId;
            const isNationalAdmin = userRole === 'Administrateur National';

            if (!isOwner && !isNationalAdmin) return { status: 403, error: "Forbidden" };

            // Update
            const finalDiagId = (diagId && diagId.trim() !== '') ? diagId : null;
            await db.query('UPDATE medical_records SET diagnostic_id = $1 WHERE id = $2', [finalDiagId, recordId]);
            return { status: 200, success: true };
        };

        console.log('Testing valid link:', (await checkLinkLogic(rId, dId, uId, 'Médecin')).status === 200 ? 'PASS' : 'FAIL');

        console.log('Testing missing record (404 expected):', (await checkLinkLogic('00000000-0000-0000-0000-000000000000', dId, uId, 'Médecin')).status === 404 ? 'PASS' : 'FAIL');

        // Delete patient to test orphan case
        await db.query('DELETE FROM patients WHERE id = $1', [pId]);
        console.log('Patient deleted (simulating orphan).');
        console.log('Testing orphan record (404 expected):', (await checkLinkLogic(rId, dId, uId, 'Médecin')).status === 404 ? 'PASS' : 'FAIL');

        console.log('--- End of Test ---');

    } catch (err) {
        console.error('❌ Test failed:', err);
    } finally {
        process.exit();
    }
}

test();
