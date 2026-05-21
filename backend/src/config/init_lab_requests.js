const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const isRemoteDb = process.env.DATABASE_URL && 
    !process.env.DATABASE_URL.includes('localhost') && 
    !process.env.DATABASE_URL.includes('127.0.0.1') &&
    !process.env.DATABASE_URL.includes('db') &&
    !process.env.DATABASE_URL.includes('postgres://postgres:');

const useSSL = process.env.NODE_ENV === 'production' || 
    process.env.DB_SSL === 'true' || 
    isRemoteDb;

const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: useSSL ? { rejectUnauthorized: false } : false
});

async function runMigration() {
    try {
        console.log("Connecting to DB for lab_requests schema...");

        await db.query(`
            CREATE TABLE IF NOT EXISTS lab_requests (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
                doctor_id UUID REFERENCES users(id) ON DELETE CASCADE,
                doctor_name TEXT NOT NULL,
                laboratory_id UUID REFERENCES users(id) ON DELETE SET NULL,
                laboratory_name TEXT,
                tests_requested JSONB NOT NULL,
                status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
                notes TEXT,
                results_file_path TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("Created lab_requests table successfully.");

        process.exit(0);
    } catch (err) {
        console.error("Migration error:", err);
        process.exit(1);
    }
}

runMigration();
