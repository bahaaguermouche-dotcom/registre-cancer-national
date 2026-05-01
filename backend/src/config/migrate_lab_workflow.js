const db = require('./db');

async function migrate() {
    console.log("Starting Laboratory Workflow DB Migration...");

    try {
        // 1. Add workplace_type and workplace_id to users table
        console.log("Adding workplace columns to users table...");
        await db.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS workplace_type VARCHAR(50) DEFAULT 'hospital',
            ADD COLUMN IF NOT EXISTS workplace_id UUID REFERENCES users(id) ON DELETE SET NULL;
        `);

        // Update existing users to 'hospital' if they don't have a workplace_type
        // though the default takes care of new ones. Also for 'Laboratoire', their workplace is 'laboratory'.
        await db.query(`
            UPDATE users SET workplace_type = 'laboratory' WHERE role = 'Laboratoire' AND workplace_type = 'hospital';
            UPDATE users SET workplace_type = 'national' WHERE role = 'Administrateur National' AND workplace_type = 'hospital';
        `);

        // 2. Add assignment columns to lab_requests table
        console.log("Adding assignment columns to lab_requests table...");
        await db.query(`
            ALTER TABLE lab_requests 
            ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
            ADD COLUMN IF NOT EXISTS assigned_to_name VARCHAR(255);
        `);

        console.log("Migration completed successfully.");
    } catch (error) {
        console.error("Migration failed:", error);
    } finally {
        process.exit(0);
    }
}

migrate();
