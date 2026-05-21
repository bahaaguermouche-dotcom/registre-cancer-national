/**
 * Migration: Cross-Hospital Patient Deduplication
 * Run: node backend/src/config/migrate_cross_hospital.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { Pool } = require('pg');

let isRemoteDb = false;
let cleanConnectionString = process.env.DATABASE_URL;

if (process.env.DATABASE_URL) {
    try {
        const parsed = new URL(process.env.DATABASE_URL);
        const host = parsed.hostname;
        isRemoteDb = host && 
            host !== 'localhost' && 
            host !== '127.0.0.1' && 
            host !== 'db' && 
            host !== 'postgres' &&
            host.includes('.');
            
        if (parsed.searchParams.has('sslmode')) {
            parsed.searchParams.delete('sslmode');
            cleanConnectionString = parsed.toString();
        }
    } catch (e) {
        isRemoteDb = !process.env.DATABASE_URL.includes('localhost') && 
                     !process.env.DATABASE_URL.includes('127.0.0.1');
    }
}

const useSSL = process.env.NODE_ENV === 'production' || 
    process.env.DB_SSL === 'true' || 
    isRemoteDb;

if (useSSL) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const pool = new Pool({
    connectionString: cleanConnectionString,
    ssl: useSSL ? { rejectUnauthorized: false } : false
});

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
