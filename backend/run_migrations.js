const fs = require('fs');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

let isRemoteDb = false;
let cleanConnectionString = process.env.DATABASE_URL;

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
            
        if (parsed.searchParams.has('sslmode')) {
            parsed.searchParams.delete('sslmode');
            cleanConnectionString = parsed.toString();
        }
    } catch (e) {
        isRemoteDb = !process.env.DATABASE_URL.includes('localhost') && 
                     !process.env.DATABASE_URL.includes('127.0.0.1');
    }
}

const useSSL = process.env.NODE_ENV === 'production' || 
    process.env.DB_SSL === 'true' || 
    isRemoteDb;

if (useSSL) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const db = new Pool({
    connectionString: cleanConnectionString,
    ssl: useSSL ? { rejectUnauthorized: false } : false
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
