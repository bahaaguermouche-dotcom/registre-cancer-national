const db = require('./db');

const migrate = async () => {
    try {
        console.log('--- Starting System Migration & Cleanup ---');

        // 1. Clean Database (Preserve Admin)
        console.log('🧹 Cleaning database...');

        // Delete all patients
        await db.query('DELETE FROM patients');
        console.log('   - Patients deleted.');

        // Delete users except National Admin
        // Assuming Admin email is strict. 
        await db.query("DELETE FROM users WHERE role != 'Administrateur National'");
        console.log('   - Non-admin users deleted.');

        // 2. Update Users Table (Specialty)
        console.log('🏗️  Updating Users Schema...');
        try {
            await db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS specialty VARCHAR(255)');
            console.log('   - Added specialty column to users.');
        } catch (e) {
            console.log('   ! Specialty column might already exist.');
        }

        // 3. Update Patients Table (NID, Blood Type, Cancer Type)
        console.log('🏗️  Updating Patients Schema...');
        const patientColumns = [
            'ALTER TABLE patients ADD COLUMN IF NOT EXISTS national_id VARCHAR(50) UNIQUE',
            'ALTER TABLE patients ADD COLUMN IF NOT EXISTS first_name VARCHAR(100)',
            'ALTER TABLE patients ADD COLUMN IF NOT EXISTS last_name VARCHAR(100)',
            'ALTER TABLE patients ADD COLUMN IF NOT EXISTS blood_type VARCHAR(10)',
            'ALTER TABLE patients ADD COLUMN IF NOT EXISTS cancer_type VARCHAR(255)', // Will store "Code - Name"
            'ALTER TABLE patients ADD COLUMN IF NOT EXISTS cancer_code VARCHAR(50)'   // Store code separately for easier filtering
        ];

        for (const query of patientColumns) {
            await db.query(query);
        }
        console.log('   - Added new patient columns.');

        console.log('✅ Migration Completed Successfully.');
        process.exit(0);

    } catch (error) {
        console.error('❌ Migration Failed:', error);
        process.exit(1);
    }
};

migrate();
