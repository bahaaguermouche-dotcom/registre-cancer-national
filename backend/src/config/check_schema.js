const db = require('./db');

const checkSchema = async () => {
    try {
        console.log('--- Checking Patients Table Schema ---');
        const res = await db.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'patients' AND column_name = 'assigned_doctor_id';
        `);
        console.log(JSON.stringify(res.rows, null, 2));
        process.exit(0);
    } catch (error) {
        console.error('Error checking schema:', error);
        process.exit(1);
    }
};

checkSchema();
