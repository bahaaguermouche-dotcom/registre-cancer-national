const db = require('./db');

const migrate = async () => {
    try {
        console.log('--- Database Refactor: IARC/CanReg5 Standards ---');

        // 1. Create Tumor Rules Table (Reference)
        console.log('1. Creating ref_cancer_rules table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS ref_cancer_rules (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                cancer_type TEXT NOT NULL,
                icd_o_code TEXT,
                min_age INT DEFAULT 0,
                max_age INT DEFAULT 120,
                allowed_gender VARCHAR(10), -- 'Male', 'Female', or NULL for Both
                specialty TEXT,
                is_rare_flag BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 2. Create Tumors Table
        console.log('2. Creating tumors table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS tumors (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
                doctor_id UUID REFERENCES users(id) ON DELETE SET NULL,
                topography_code TEXT, -- ICD-O-3 code (e.g. C50.9)
                topography_label TEXT,
                morphology_code TEXT, -- Histology (e.g. 8500/3)
                morphology_label TEXT,
                basis_of_diagnosis TEXT, -- Clinical, Histology, etc.
                stage TEXT, -- TNM or general stage
                grade TEXT, 
                date_of_incidence DATE,
                status VARCHAR(20) DEFAULT 'provisional', -- 'provisional', 'completed'
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 3. Add tumor_id to medical_records and diagnostics
        console.log('3. Updating medical_records and diagnostics schema...');
        await db.query(`
            ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS tumor_id UUID REFERENCES tumors(id) ON DELETE SET NULL;
            ALTER TABLE diagnostics ADD COLUMN IF NOT EXISTS tumor_id UUID REFERENCES tumors(id) ON DELETE SET NULL;
        `);

        // 4. Seed basic rules
        console.log('4. Seeding basic cancer rules...');
        const rules = [
            ['Cancer du Sein', 'C50', 15, 120, 'Female', 'Oncologie Sénologique'],
            ['Cancer de la Prostate', 'C61', 40, 120, 'Male', 'Urologie'],
            ['Leucémie Infantile', 'C42', 0, 15, null, 'Hématologie Pédiatrique'],
            ['Cancer du Poumon', 'C34', 18, 120, null, 'Pneumologie'],
        ];

        for (const rule of rules) {
            await db.query(`
                INSERT INTO ref_cancer_rules (cancer_type, icd_o_code, min_age, max_age, allowed_gender, specialty)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT DO NOTHING
            `, rule);
        }

        console.log('✅ Advanced Registry Database Schema Initialized.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration Failed:', error);
        process.exit(1);
    }
};

migrate();
