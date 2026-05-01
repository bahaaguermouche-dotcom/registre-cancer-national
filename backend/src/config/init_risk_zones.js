const db = require('./db');

async function init() {
    console.log("--- Initializing Risk Zones System ---");
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS risk_zones (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                geometry JSONB NOT NULL,
                description TEXT,
                severity INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("✅ Table 'risk_zones' is ready.");
        process.exit(0);
    } catch (error) {
        console.error("❌ Initialization failed:", error);
        process.exit(1);
    }
}

init();
