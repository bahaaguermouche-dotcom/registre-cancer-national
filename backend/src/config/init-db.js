const db = require('./db');

const initDb = async () => {
    const createUserTableQuery = `
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL,
      location TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

    try {
        console.log('--- Initializing Database ---');
        await db.query(createUserTableQuery);
        console.log('✅ Users table initialized successfully.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error initializing database:', error);
        process.exit(1);
    }
};

initDb();
