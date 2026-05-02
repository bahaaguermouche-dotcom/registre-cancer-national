const fs = require('fs');
const { Pool } = require('pg');
require('dotenv').config({ path: './backend/.env' });

const db = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function runSeed() {
    try {
        console.log("Connecting to DB...");
        await db.query("SELECT NOW()");

        console.log("Reading cancer types...");
        let cancersSql = fs.readFileSync('seed_cancers.sql', 'utf8');
        cancersSql = cancersSql.replace(/AUTO_INCREMENT/g, 'SERIAL');

        console.log("Executing cancer types...");
        await db.query(`DROP TABLE IF EXISTS bilan_packages;`);
        await db.query(`DROP TABLE IF EXISTS cancer_types CASCADE;`);
        await db.query(cancersSql);
        console.log("cancer_types seeded successfully.");

        console.log("Reading packages...");
        let packagesSql = fs.readFileSync('seed_packages.sql', 'utf8');
        packagesSql = packagesSql.replace(/AUTO_INCREMENT/g, 'SERIAL');
        packagesSql = packagesSql.replace(/ENUM\('initial','confirmation','extension','suivi'\)/g, "VARCHAR(20) CHECK (phase IN ('initial','confirmation','extension','suivi'))");

        console.log("Executing packages...");
        await db.query(packagesSql);
        console.log("bilan_packages seeded successfully.");

        process.exit(0);
    } catch (err) {
        console.error("Migration error:", err);
        process.exit(1);
    }
}

runSeed();
