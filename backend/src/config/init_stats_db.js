const db = require('./db');

async function init() {
    console.log("--- Initializing Stats System ---");
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS saved_reports (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                config JSONB NOT NULL,
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("✅ Table 'saved_reports' is ready.");

        // Ensure index for performance
        await db.query(`CREATE INDEX IF NOT EXISTS idx_saved_reports_user ON saved_reports(user_id)`);

        process.exit(0);
    } catch (error) {
        console.error("❌ Initialization failed:", error);
        process.exit(1);
    }
}

init();
