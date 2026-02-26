const db = require('./db');
const test = async () => {
    try {
        const res = await db.query('SELECT id, name FROM patients');
        console.log('--- Patients List ---');
        console.log(JSON.stringify(res.rows, null, 2));
        console.log('----------------------');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};
test();
