const db = require('./db');

async function inspect() {
    try {
        console.log('--- Users Table Schema ---');
        const usersCols = await db.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users';
        `);
        console.table(usersCols.rows);

        console.log('\n--- Patients Table Schema ---');
        const patientsCols = await db.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'patients';
        `);
        console.table(patientsCols.rows);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
inspect();
