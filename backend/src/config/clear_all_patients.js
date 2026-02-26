const db = require('./db');

async function clearPatients() {
    try {
        console.log('--- Clearing All Patients and Related Data ---');

        // Count before
        const before = await db.query('SELECT count(*) FROM patients');
        console.log(`Current patients count: ${before.rows[0].count}`);

        // Deletion (Cascades to tumors, diagnostics, medical_records)
        console.log('Deleting all patients (CASCADE)...');
        await db.query('DELETE FROM patients');

        // Verify
        const after = await db.query('SELECT count(*) FROM patients');
        console.log(`Final patients count: ${after.rows[0].count}`);

        console.log('✅ All patient data has been successfully cleared.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error clearing patients:', err);
        process.exit(1);
    }
}

clearPatients();
