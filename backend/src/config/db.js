const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

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

const pool = new Pool({
    connectionString: cleanConnectionString,
    ssl: useSSL ? { rejectUnauthorized: false } : false
});

module.exports = {
    query: (text, params) => pool.query(text, params),
};
