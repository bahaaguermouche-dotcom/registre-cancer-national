const db = require('./db');

async function migrate() {
    console.log("--- Starting Lab Metadata Migration ---");
    try {
        await db.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS lab_type TEXT, 
            ADD COLUMN IF NOT EXISTS lab_activities TEXT[];
        `);
        console.log("✅ lab_type and lab_activities columns added successfully.");

        // Update existing lab accounts if any to a default if they exist
        await db.query(`
            UPDATE users 
            SET lab_type = 'B' 
            WHERE role = 'Laboratoire' AND lab_type IS NULL;
        `);
        console.log("✅ Existing lab accounts updated to default Biologie [B].");

    } catch (error) {
        console.error("❌ Migration Error:", error);
    } finally {
        process.exit();
    }
}

migrate();
