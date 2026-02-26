const db = require('./db');

async function test() {
    try {
        console.log('--- Verification Test: Visibility & Deletion ---');

        // 1. Setup: Create 2 Doctors and 1 Secretary in the same hospital
        const loc = '13 Tlemcen - Test Hospital';

        await db.query("DELETE FROM users WHERE location = $1", [loc]); // Cleanup

        const doc1 = await db.query(`
            INSERT INTO users (name, email, role, location, status, password_hash)
            VALUES ('Dr One', 'dr1@test.com', 'Médecin', $1, 'active', 'hash')
            RETURNING id
        `, [loc]);

        const doc2 = await db.query(`
            INSERT INTO users (name, email, role, location, status, password_hash)
            VALUES ('Dr Two', 'dr2@test.com', 'Médecin', $1, 'active', 'hash')
            RETURNING id
        `, [loc]);

        const sec = await db.query(`
            INSERT INTO users (name, email, role, location, status, password_hash)
            VALUES ('Sec One', 'sec1@test.com', 'Secrétaire', $1, 'active', 'hash')
            RETURNING id
        `, [loc]);

        const d1Id = doc1.rows[0].id;
        const d2Id = doc2.rows[0].id;

        // 2. Create Patient assigned to Doc 1
        const patient = await db.query(`
            INSERT INTO patients (name, first_name, last_name, national_id, assigned_doctor_id, hospital_location, rcp_active)
            VALUES ($1, $2, $3, $4, $5, $6, FALSE)
            RETURNING id
        `, ['Test Patient', 'Test', 'Patient', 'TEST-NID-001' + Math.random(), d1Id, loc]);
        const pId = patient.rows[0].id;

        console.log('Setup complete.');

        // 3. Test Visibility (Mocking query logic directly)

        // Mocking Médecin List query for Doc 2
        let q = 'SELECT id FROM patients WHERE (assigned_doctor_id = $1 OR (rcp_active = true AND hospital_location ILIKE $2))';
        let res = await db.query(q, [d2Id, `%${loc}%`]);
        console.log('Doc 2 visibility (RCP inactive):', res.rowCount === 0 ? 'FAIL (expected 0)' : 'SUCCESS (0 found)');

        // Set RCP Active
        await db.query('UPDATE patients SET rcp_active = TRUE WHERE id = $1', [pId]);
        res = await db.query(q, [d2Id, `%${loc}%`]);
        console.log('Doc 2 visibility (RCP active):', res.rowCount === 1 ? 'SUCCESS (1 found)' : 'FAIL (0 found)');

        // 4. Test Deletion
        console.log('Attempting to delete Doctor 1 (owner of patient)...');
        // Our constraint fix should allow this
        await db.query('DELETE FROM users WHERE id = $1', [d1Id]);
        console.log('Doctor 1 deleted.');

        // Check patient status
        res = await db.query('SELECT assigned_doctor_id FROM patients WHERE id = $1', [pId]);
        if (res.rowCount > 0 && res.rows[0].assigned_doctor_id === null) {
            console.log('SUCCESS: Patient preserved and unassigned.');
        } else {
            console.log('FAIL: Patient deleted or still assigned.');
        }

        console.log('--- End of Test ---');

    } catch (err) {
        console.error('❌ Test failed:', err);
    } finally {
        process.exit();
    }
}

test();
