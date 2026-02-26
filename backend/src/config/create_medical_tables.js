const db = require('./db');

const createTables = async () => {
    try {
        console.log('--- Creating Medical Records Tables ---');

        // 1. Diagnostics Table
        await db.query(`
            CREATE TABLE IF NOT EXISTS diagnostics (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
                doctor_id UUID REFERENCES users(id) ON DELETE SET NULL,
                content TEXT NOT NULL,
                date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('   - Diagnostics table created.');

        // 2. Medical Records (Analyses & Images)
        await db.query(`
            CREATE TABLE IF NOT EXISTS medical_records (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
                doctor_id UUID REFERENCES users(id) ON DELETE SET NULL,
                type VARCHAR(50) NOT NULL, -- 'analysis' or 'image'
                description TEXT,
                file_path TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('   - Medical records table created.');

        console.log('✅ Tables Created Successfully.');
        process.exit(0);

    } catch (error) {
        console.error('❌ Table Creation Failed:', error);
        process.exit(1);
    }
};

createTables();
