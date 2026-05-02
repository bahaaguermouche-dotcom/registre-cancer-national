const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from backend/.env
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function fixSchema() {
    try {
        console.log("Checking database schema...");

        // 1. Add owner_hospital_id to medical_records if missing
        await pool.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='medical_records' AND column_name='owner_hospital_id') THEN
                    ALTER TABLE medical_records ADD COLUMN owner_hospital_id UUID;
                    RAISE NOTICE 'Added owner_hospital_id to medical_records';
                END IF;
            END $$;
        `);

        // 2. Add owner_hospital_id to diagnostics if missing (double check)
        await pool.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='diagnostics' AND column_name='owner_hospital_id') THEN
                    ALTER TABLE diagnostics ADD COLUMN owner_hospital_id UUID;
                    RAISE NOTICE 'Added owner_hospital_id to diagnostics';
                END IF;
            END $$;
        `);

        // 3. Backfill existing records with patient's primary_hospital_id if they are NULL
        // This is a best effort to make existing data visible in the "primary" sector
        await pool.query(`
            UPDATE medical_records m
            SET owner_hospital_id = p.primary_hospital_id
            FROM patients p
            WHERE m.patient_id = p.id AND m.owner_hospital_id IS NULL AND p.primary_hospital_id IS NOT NULL;
        `);

        await pool.query(`
            UPDATE diagnostics d
            SET owner_hospital_id = p.primary_hospital_id
            FROM patients p
            WHERE d.patient_id = p.id AND d.owner_hospital_id IS NULL AND p.primary_hospital_id IS NOT NULL;
        `);

        // 4. Also backfill lab_requests owner_hospital_id if missing (though code seems to set it)
        await pool.query(`
            UPDATE lab_requests r
            SET owner_hospital_id = p.primary_hospital_id
            FROM patients p
            WHERE r.patient_id = p.id AND r.owner_hospital_id IS NULL AND p.primary_hospital_id IS NOT NULL;
        `);

        console.log("✅ Schema check and data backfill completed.");
    } catch (err) {
        console.error("❌ Error fixing schema:", err);
    } finally {
        await pool.end();
    }
}

fixSchema();
