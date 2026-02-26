const db = require('./db');

async function migrate() {
    console.log('--- Starting Clinical History Migration ---');
    try {
        // Update diagnostics table
        console.log('Updating diagnostics table...');
        await db.query(`
            ALTER TABLE diagnostics 
            ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'diagnosis',
            ADD COLUMN IF NOT EXISTS stage VARCHAR(50),
            ADD COLUMN IF NOT EXISTS grade VARCHAR(50),
            ADD COLUMN IF NOT EXISTS treatment_type VARCHAR(100),
            ADD COLUMN IF NOT EXISTS cycle VARCHAR(50),
            ADD COLUMN IF NOT EXISTS outcome VARCHAR(100),
            ADD COLUMN IF NOT EXISTS next_appointment TIMESTAMP;
        `);

        // Update patients table
        console.log('Updating patients table...');
        await db.query(`
            ALTER TABLE patients 
            ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Active',
            ADD COLUMN IF NOT EXISTS date_of_birth DATE;
        `);

        console.log('Migration successful!');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        process.exit();
    }
}

migrate();
