const bcrypt = require('bcryptjs');
const db = require('./db');

async function resetPasswords() {
    try {
        const hash = await bcrypt.hash('password123', 10);
        await db.query('UPDATE users SET password_hash = $1', [hash]);
        console.log('All passwords successfully reset to: password123');
        process.exit(0);
    } catch (error) {
        console.error('Failed to reset passwords:', error);
        process.exit(1);
    }
}

resetPasswords();
