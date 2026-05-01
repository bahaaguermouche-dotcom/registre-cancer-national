const db = require('./db');

const getUsers = async () => {
    try {
        const res = await db.query('SELECT name, email, role FROM users');
        console.log('USERS_LIST:', JSON.stringify(res.rows));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

getUsers();
