const db = require('./db');

async function getConstraints() {
    try {
        console.log('--- Patients Table Foreign Keys ---');
        const res = await db.query(`
            SELECT
                conname AS constraint_name,
                pg_get_constraintdef(c.oid) AS constraint_definition
            FROM pg_constraint c
            JOIN pg_namespace n ON n.oid = c.connamespace
            WHERE n.nspname = 'public' AND contypid = 'patients'::regclass;
        `);
        console.table(res.rows);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
getConstraints();
