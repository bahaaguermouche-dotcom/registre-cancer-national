const db = require('./db');

const migrate = async () => {
    try {
        await db.query(`
            ALTER TABLE medical_records 
            ADD COLUMN diagnostic_id UUID REFERENCES diagnostics(id) ON DELETE SET NULL;
        `);
        console.log("Migration successful: added diagnostic_id to medical_records.");
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
};

migrate();
