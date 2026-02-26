const db = require('./db');

async function check() {
    try {
        const users = await db.query('SELECT name, role, location, specialty FROM users');
        console.log('--- EXACT LOCATION DATA ---');
        users.rows.forEach(u => {
            console.log(`- [${u.role}] ${u.name} | Location: '${u.location}' | Specialty: ${u.specialty}`);
        });
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
