const http = require('http');

const test = async () => {
    try {
        const db = require('./config/db');
        const patientRes = await db.query('SELECT id FROM patients LIMIT 1');
        if (patientRes.rowCount === 0) {
            console.log("No patients found in DB.");
            return;
        }
        const patientId = patientRes.rows[0].id;
        console.log(`Testing with Patient ID: ${patientId}`);

        http.get(`http://localhost:5000/api/patients/${patientId}`, (res) => {
            console.log(`STATUS: ${res.statusCode}`);
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                console.log('BODY:', data);
                process.exit(0);
            });
        }).on('error', (err) => {
            console.error('Error:', err.message);
            process.exit(1);
        });

    } catch (err) {
        console.error("Setup FAILED!", err.message);
        process.exit(1);
    }
};

test();
