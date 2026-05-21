const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

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

const db = new Pool({
    connectionString: cleanConnectionString,
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
