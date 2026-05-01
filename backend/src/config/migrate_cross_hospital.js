/**
 * Migration: Cross-Hospital Patient Deduplication
 * Run: node backend/src/config/migrate_cross_hospital.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
    const client = await pool.connect();
    console.log('🚀 Starting cross-hospital deduplication migration...');
    try {
        await client.query('BEGIN');

        // 1. Add primary_hospital_id to patients (UUID of the hospital user account)
        await client.query(`
            ALTER TABLE patients
            ADD COLUMN IF NOT EXISTS primary_hospital_id UUID;
        `);
        console.log('✅ Added primary_hospital_id to patients');

        // 2. Add owner_hospital_id to tumors
        await client.query(`
            ALTER TABLE tumors
            ADD COLUMN IF NOT EXISTS owner_hospital_id UUID;
        `);
        console.log('✅ Added owner_hospital_id to tumors');

        // 3. Create patient_hospital_links junction table
        await client.query(`
            CREATE TABLE IF NOT EXISTS patient_hospital_links (
                id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                patient_id       UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
                hospital_id      UUID NOT NULL,
                hospital_name    TEXT,
                hospital_location TEXT,
                cancer_type      TEXT NOT NULL,
                doctor_id        UUID,
                doctor_name      TEXT,
                created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE (patient_id, cancer_type)
            );
        `);
        console.log('✅ Created patient_hospital_links table');

        await client.query('COMMIT');
        console.log('🎉 Migration completed successfully!');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', err.message);
        throw err;
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
