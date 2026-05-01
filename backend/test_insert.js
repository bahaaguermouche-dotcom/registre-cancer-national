const db = require('./src/config/db');

async function testQuery() {
    try {
        const tests = ['Test1', 'Test2'];
        const result = await db.query(
            `INSERT INTO lab_requests (patient_id, doctor_id, doctor_name, laboratory_id, laboratory_name, tests_requested, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            ['d6ebbedc-5e58-4b2a-8c9e-ec8065b2149b', '538356fd-dc7b-402a-995f-ed3f58eede84', 'Test Doc', null, null, JSON.stringify(tests), 'Some notes']
        );
        console.log("Success:", result.rows[0]);
    } catch (e) {
        console.error("DB_ERROR:", e.message);
    }
    process.exit(0);
}

testQuery();
