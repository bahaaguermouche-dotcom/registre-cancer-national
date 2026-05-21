const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

let isRemoteDb = false;
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
    } catch (e) {
        isRemoteDb = !process.env.DATABASE_URL.includes('localhost') && 
                     !process.env.DATABASE_URL.includes('127.0.0.1');
    }
}

const useSSL = process.env.NODE_ENV === 'production' || 
    process.env.DB_SSL === 'true' || 
    isRemoteDb;

const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: useSSL ? { rejectUnauthorized: false } : false
});

async function runSeed() {
    try {
        console.log("Connecting to DB...");

        await db.query(`DROP TABLE IF EXISTS lab_tests_catalogue CASCADE;`);
        await db.query(`
            CREATE TABLE lab_tests_catalogue (
                id SERIAL PRIMARY KEY,
                category VARCHAR(100) NOT NULL,
                name VARCHAR(255) NOT NULL UNIQUE,
                icon VARCHAR(10),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("Created lab_tests_catalogue table.");

        console.log("Extracting unique tests from bilan_packages...");
        const res = await db.query(`SELECT analyses_obl, analyses_opt FROM bilan_packages;`);

        let uniqueTests = new Set();

        res.rows.forEach(row => {
            if (row.analyses_obl) {
                row.analyses_obl.forEach(t => uniqueTests.add(t.trim()));
            }
            if (row.analyses_opt) {
                row.analyses_opt.forEach(t => uniqueTests.add(t.trim()));
            }
        });

        console.log(`Found ${uniqueTests.size} unique tests.`);

        let inserts = [];
        for (let testName of uniqueTests) {
            let category = 'Général';
            let icon = '';

            if (testName.startsWith('📡')) {
                category = 'Imagerie / Radiologie';
                icon = '📡';
            } else if (testName.startsWith('🧪')) {
                category = 'Biologie / Marqueurs';
                icon = '🧪';
            } else if (testName.startsWith('🔬')) {
                category = 'Anatomopathologie / Génétique';
                icon = '🔬';
            } else if (testName.startsWith('📊')) {
                category = 'Marqueurs Tumoraux';
                icon = '📊';
            }

            // remove prefix from name if desired, or keep it. Let's keep it complete.
            const cleanName = testName.replace(/'/g, "''");
            inserts.push(`('${category}', '${cleanName}', '${icon}')`);
        }

        if (inserts.length > 0) {
            const query = `INSERT INTO lab_tests_catalogue (category, name, icon) VALUES ${inserts.join(',\n')} ON CONFLICT (name) DO NOTHING;`;
            await db.query(query);
            console.log("lab_tests_catalogue seeded successfully.");
        }

        console.log("All seeds completed!");
        process.exit(0);
    } catch (err) {
        console.error("Migration error:");
        console.error(err);
        process.exit(1);
    }
}

runSeed();
