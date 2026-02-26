const db = require('./db');

async function migrate() {
    console.log('--- Fixing User Deletion Constraints ---');
    try {
        // 1. Identify the constraint name (it's usually patients_assigned_doctor_id_fkey)
        // 2. Drop it
        // 3. Re-create it with ON DELETE SET NULL

        console.log('Updating foreign key: patients_assigned_doctor_id_fkey...');

        await db.query(`
            ALTER TABLE patients 
            DROP CONSTRAINT IF EXISTS patients_assigned_doctor_id_fkey;
        `);

        await db.query(`
            ALTER TABLE patients
            ADD CONSTRAINT patients_assigned_doctor_id_fkey 
            FOREIGN KEY (assigned_doctor_id) 
            REFERENCES users(id) 
            ON DELETE SET NULL;
        `);

        console.log('✅ Foreign key updated to ON DELETE SET NULL.');

        // Also check diagnostics table as it might block deletion too
        console.log('Updating foreign key: diagnostics_doctor_id_fkey...');
        await db.query(`
            ALTER TABLE diagnostics 
            DROP CONSTRAINT IF EXISTS diagnostics_doctor_id_fkey;
        `);
        await db.query(`
            ALTER TABLE diagnostics
            ADD CONSTRAINT diagnostics_doctor_id_fkey 
            FOREIGN KEY (doctor_id) 
            REFERENCES users(id) 
            ON DELETE SET NULL;
        `);
        console.log('✅ Diagnostics foreign key updated.');

        // And medical_records
        console.log('Updating foreign key: medical_records_doctor_id_fkey...');
        await db.query(`
            ALTER TABLE medical_records 
            DROP CONSTRAINT IF EXISTS medical_records_doctor_id_fkey;
        `);
        await db.query(`
            ALTER TABLE medical_records
            ADD CONSTRAINT medical_records_doctor_id_fkey 
            FOREIGN KEY (doctor_id) 
            REFERENCES users(id) 
            ON DELETE SET NULL;
        `);
        console.log('✅ Medical Records foreign key updated.');

        // And rcp_messages
        console.log('Updating foreign key: rcp_messages_doctor_id_fkey...');
        await db.query(`
            ALTER TABLE rcp_messages 
            DROP CONSTRAINT IF EXISTS rcp_messages_doctor_id_fkey;
        `);
        await db.query(`
            ALTER TABLE rcp_messages
            ADD CONSTRAINT rcp_messages_doctor_id_fkey 
            FOREIGN KEY (doctor_id) 
            REFERENCES users(id) 
            ON DELETE SET NULL;
        `);
        console.log('✅ RCP Messages foreign key updated.');

    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        process.exit();
    }
}

migrate();
