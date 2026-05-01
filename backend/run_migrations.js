const fs = require('fs');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const db = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function runSeed() {
    try {
        console.log("Connecting to DB...");

        let cancersSql = fs.readFileSync(path.resolve(__dirname, '../seed_cancers.sql'), 'utf8');
        cancersSql = cancersSql.replace(/INT PRIMARY KEY AUTO_INCREMENT/g, 'SERIAL PRIMARY KEY');

        console.log("Executing cancer types...");
        await db.query(`DROP TABLE IF EXISTS bilan_packages;`);
        await db.query(`DROP TABLE IF EXISTS cancer_types CASCADE;`);
        await db.query(cancersSql);
        console.log("cancer_types seeded successfully.");

        console.log("Reading packages...");
        let packagesSql = fs.readFileSync(path.resolve(__dirname, '../seed_packages.sql'), 'utf8');
        packagesSql = packagesSql.replace(/INT PRIMARY KEY AUTO_INCREMENT/g, 'SERIAL PRIMARY KEY');
        packagesSql = packagesSql.replace(/ENUM\('initial','confirmation','extension','suivi'\)/g, "VARCHAR(20) CHECK (phase IN ('initial','confirmation','extension','suivi'))");

        packagesSql = packagesSql.replace(/,'\["/g, ",$$$$[\"");
        packagesSql = packagesSql.replace(/"\]',/g, "\"]$$$$,");
        packagesSql = packagesSql.replace(/,\["/g, ",$$$$[\"");
        packagesSql = packagesSql.replace(/"\],/g, "\"]$$$$,");

        console.log("Executing packages...");
        await db.query(packagesSql);
        console.log("bilan_packages seeded successfully.");

        console.log("All seeds completed!");
        process.exit(0);
    } catch (err) {
        console.error("Migration error:");
        console.error(err);
        process.exit(1);
    }
}

runSeed();
