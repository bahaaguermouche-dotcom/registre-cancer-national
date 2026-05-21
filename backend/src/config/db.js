const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const isRemoteDb = process.env.DATABASE_URL && 
    !process.env.DATABASE_URL.includes('localhost') && 
    !process.env.DATABASE_URL.includes('127.0.0.1') &&
    !process.env.DATABASE_URL.includes('db') &&
    !process.env.DATABASE_URL.includes('postgres://postgres:');

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
