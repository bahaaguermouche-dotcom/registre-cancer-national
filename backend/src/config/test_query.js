const db = require('./db');

const test = async () => {
    try {
        console.log('Testing raw query...');
        const query = 'SELECT p.*, u.name as doctor_name FROM patients p LEFT JOIN users u ON p.assigned_doctor_id = u.id';
        const res = await db.query(query);
        console.log('Query Success. Count:', res.rowCount);
        process.exit(0);
    } catch (err) {
        console.error('Query Error:', err);
        process.exit(1);
    }
};

test();
