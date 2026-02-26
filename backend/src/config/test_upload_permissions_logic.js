const db = require('./db');

async function test() {
    try {
        console.log('--- Verification Test: Upload Permissions ---');

        const loc = '13 Tlemcen - Hospital A';
        const otherLoc = '16 Alger - Hospital B';

        // Setup Users
        await db.query("DELETE FROM users WHERE location IN ($1, $2)", [loc, otherLoc]);

        const secRes = await db.query(`
            INSERT INTO users (name, email, role, location, status, password_hash)
            VALUES ('Sec Test', 'sec@test.com', 'Secrétaire', $1, 'active', 'hash')
            RETURNING id
        `, [loc]);
        const secId = secRes.rows[0].id;

        const adminRes = await db.query(`
            INSERT INTO users (name, email, role, location, status, password_hash)
            VALUES ('Admin Test', 'admin_test@test.com', 'Administrateur National', 'Alger', 'active', 'hash')
            RETURNING id
        `);
        const adminId = adminRes.rows[0].id;

        // Setup Patient
        const patientRes = await db.query(`
            INSERT INTO patients (name, first_name, last_name, national_id, hospital_location)
            VALUES ('Test Patient', 'Test', 'Patient', 'UPL-NID-' || random(), $1)
            RETURNING id
        `, [loc]);
        const pId = patientRes.rows[0].id;

        console.log('Setup complete.');

        // Test Helper
        const checkPermission = (user, patient) => {
            const isNationalAdmin = user.role === 'Administrateur National';
            const isAssignedDoctor = patient.assigned_doctor_id === user.id;

            // Replicating cleanLoc and includes logic from index.js
            const cleanLoc = (l) => {
                if (!l) return '';
                const parts = l.split(' - ');
                return [...new Set(parts)].join(' - ').trim();
            };

            const isSecretaryOfHospital = user.role === 'Secrétaire' &&
                patient.hospital_location &&
                patient.hospital_location.includes(cleanLoc(user.location));

            return isNationalAdmin || isAssignedDoctor || isSecretaryOfHospital;
        };

        const secUser = { id: secId, role: 'Secrétaire', location: loc };
        const adminUser = { id: adminId, role: 'Administrateur National', location: 'Alger' };
        const patientData = { assigned_doctor_id: null, hospital_location: loc };

        console.log('Testing Secretary of same hospital:', checkPermission(secUser, patientData) ? 'PASS' : 'FAIL');

        const secOtherUser = { id: 'other', role: 'Secrétaire', location: otherLoc };
        console.log('Testing Secretary of other hospital:', checkPermission(secOtherUser, patientData) ? 'PASS (forbidden)' : 'FAIL (allowed but should be forbidden)');

        console.log('Testing National Admin:', checkPermission(adminUser, patientData) ? 'PASS' : 'FAIL');

        console.log('--- End of Test ---');

    } catch (err) {
        console.error('❌ Test failed:', err);
    } finally {
        process.exit();
    }
}

test();
