const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

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

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: useSSL ? { rejectUnauthorized: false } : false
});

module.exports = {
    query: (text, params) => pool.query(text, params),
};
