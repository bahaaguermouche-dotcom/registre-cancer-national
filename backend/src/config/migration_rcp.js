const db = require('./db');

async function migrate() {
    console.log('--- Starting RCP & Chat Migration ---');
    try {
        // 1. Add rcp_active to patients
        console.log('Adding rcp_active column to patients table...');
        await db.query(`
            ALTER TABLE patients 
            ADD COLUMN IF NOT EXISTS rcp_active BOOLEAN DEFAULT FALSE;
        `);

        // 2. Create rcp_messages table
        console.log('Creating rcp_messages table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS rcp_messages (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
                doctor_id UUID REFERENCES users(id) ON DELETE SET NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log('✅ RCP & Chat migration successful!');
    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        process.exit();
    }
}

migrate();
