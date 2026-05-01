require('dotenv').config();
const pgp = require('pg-promise')();

const db = pgp({
    connectionString: process.env.DATABASE_URL
});

async function migrate() {
    try {
        console.log("Starting migration for Structured Lab Results...");

        await db.none(`
            CREATE TABLE IF NOT EXISTS lab_result_entries (
                id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                lab_request_id  UUID NOT NULL REFERENCES lab_requests(id) ON DELETE CASCADE,
                test_name       TEXT NOT NULL,
                template_id     TEXT NOT NULL,
                template_variant TEXT,
                result_data     JSONB NOT NULL DEFAULT '{}',
                status          TEXT DEFAULT 'draft',
                filled_by       UUID REFERENCES users(id),
                filled_by_name  TEXT,
                created_at      TIMESTAMPTZ DEFAULT NOW(),
                updated_at      TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        console.log("Table lab_result_entries created or already exists.");

    } catch (error) {
        console.error("Migration error:", error);
    } finally {
        pgp.end();
    }
}

migrate();
