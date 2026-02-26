const db = require('./db');

async function migrate() {
    console.log("--- Migrating Patients Table for Extended Registry (Scenario 01) ---");
    try {
        await db.query(`
            ALTER TABLE patients 
            ADD COLUMN IF NOT EXISTS birth_date DATE,
            ADD COLUMN IF NOT EXISTS cnas_number TEXT,
            ADD COLUMN IF NOT EXISTS wilaya_residence TEXT,
            ADD COLUMN IF NOT EXISTS commune_residence TEXT,
            ADD COLUMN IF NOT EXISTS daira TEXT,
            ADD COLUMN IF NOT EXISTS full_address TEXT,
            ADD COLUMN IF NOT EXISTS residence_environment TEXT, -- Urbain / Rural / Semi-urbain
            ADD COLUMN IF NOT EXISTS phone_primary TEXT,
            ADD COLUMN IF NOT EXISTS phone_secondary TEXT,
            ADD COLUMN IF NOT EXISTS email TEXT,
            ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
            ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT,
            ADD COLUMN IF NOT EXISTS profession TEXT,
            ADD COLUMN IF NOT EXISTS education_level TEXT,
            ADD COLUMN IF NOT EXISTS marital_status TEXT,
            ADD COLUMN IF NOT EXISTS consent_status TEXT DEFAULT 'En attente', -- 'Signé', 'Refusé', 'En attente'
            ADD COLUMN IF NOT EXISTS consent_file_path TEXT,
            ADD COLUMN IF NOT EXISTS patient_id_formatted TEXT UNIQUE, -- PAT-2026-XXXXX
            ADD COLUMN IF NOT EXISTS pin_code_hash TEXT; -- Store hashed PIN
        `);

        // Create indexes for deduplication and SIG
        await db.query(`CREATE INDEX IF NOT EXISTS idx_patients_cnas ON patients(cnas_number)`);
        await db.query(`CREATE INDEX IF NOT EXISTS idx_patients_formatted_id ON patients(patient_id_formatted)`);
        await db.query(`CREATE INDEX IF NOT EXISTS idx_patients_location ON patients(wilaya_residence, commune_residence)`);

        console.log("✅ Database migration successful!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Migration failed:", error);
        process.exit(1);
    }
}

migrate();
