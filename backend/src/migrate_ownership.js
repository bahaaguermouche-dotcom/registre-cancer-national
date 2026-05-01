const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const client = new Client({
    connectionString: process.env.DATABASE_URL
});

async function migrate() {
    try {
        await client.connect();
        console.log('Connected to database for ownership migration...');

        await client.query('BEGIN');

        // Add owner_hospital_id to diagnostics
        console.log('Adding owner_hospital_id to diagnostics table...');
        await client.query(`
            ALTER TABLE diagnostics ADD COLUMN IF NOT EXISTS owner_hospital_id UUID;
        `);

        // Add owner_hospital_id to lab_requests
        console.log('Adding owner_hospital_id to lab_requests table...');
        await client.query(`
            ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS owner_hospital_id UUID;
        `);

        // Backfill owner_hospital_id from doctor's workplace_id (if possible)
        // This is complex because we don't store doctor's hospital in the table directly.
        // For existing records, we can try to join with users table.
        console.log('Backfilling owner_hospital_id from users table...');
        await client.query(`
            UPDATE diagnostics d
            SET owner_hospital_id = u.workplace_id
            FROM users u
            WHERE d.doctor_id = u.id AND d.owner_hospital_id IS NULL;
        `);

        await client.query(`
            UPDATE lab_requests lr
            SET owner_hospital_id = u.workplace_id
            FROM users u
            WHERE lr.doctor_id = u.id AND lr.owner_hospital_id IS NULL;
        `);

        await client.query(`
            UPDATE tumors t
            SET owner_hospital_id = u.workplace_id
            FROM users u
            WHERE t.doctor_id = u.id AND t.owner_hospital_id IS NULL;
        `);

        await client.query('COMMIT');
        console.log('Ownership migration completed successfully.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', err);
    } finally {
        await client.end();
    }
}

migrate();
