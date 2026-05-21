const db = require('./db');

const forceInit = async () => {
    try {
        console.log('--- Force Initializing Patients & Tumors ---');
        
        // 1. Extension UUID
        await db.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

        // 2. Table Patients
        await db.query(`
            CREATE TABLE IF NOT EXISTS patients (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name TEXT NOT NULL,
                first_name TEXT,
                last_name TEXT,
                age INTEGER,
                gender TEXT,
                national_id TEXT UNIQUE,
                assigned_doctor_id UUID REFERENCES users(id) ON DELETE SET NULL,
                hospital_location TEXT,
                status TEXT DEFAULT 'Active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Patients table ready.');

        // 3. Table Tumors
        await db.query(`
            CREATE TABLE IF NOT EXISTS tumors (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
                doctor_id UUID REFERENCES users(id) ON DELETE SET NULL,
                topography_code TEXT,
                topography_label TEXT,
                morphology_code TEXT,
                morphology_label TEXT,
                date_of_incidence DATE,
                status VARCHAR(20) DEFAULT 'provisional',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Tumors table ready.');

        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
};

forceInit();
