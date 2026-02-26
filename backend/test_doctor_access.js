const http = require('http');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const db = require('./src/config/db');
const jwt = require('jsonwebtoken');

console.log("Starting script...");
console.log("DB URL:", process.env.DATABASE_URL ? "Loaded" : "Missing");

async function test() {
    try {
        console.log("Querying for secretary...");
        const res = await db.query("SELECT * FROM users WHERE role = 'Secrétaire' LIMIT 1");

        let token;
        if (res.rows.length === 0) {
            console.log("No doctor found. Exiting test as we expect at least one doctor.");
            process.exit(1);
        } else {
            const doctor = res.rows[0];
            console.log("Found doctor:", doctor.email);
            token = jwt.sign(
                { id: doctor.id, email: doctor.email, role: doctor.role, location: doctor.location },
                process.env.JWT_SECRET || 'super_secret_key_123',
                { expiresIn: '1h' }
            );
            console.log("Generated token.");
        }

        fetchPatients(token);

    } catch (err) {
        console.error("Setup Error:", err);
        process.exit(1);
    }
}

function fetchPatients(token) {
    console.log("Fetching patients...");
    const options = {
        hostname: 'localhost',
        port: 5000,
        path: '/api/patients',
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    };

    const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        res.on('end', () => {
            console.log("API Status:", res.statusCode);
            console.log("API Response:", data);
            process.exit(0);
        });
    });

    req.on('error', (e) => {
        console.error(`Problem with request: ${e.message}`);
        process.exit(1);
    });

    req.end();
}

test();
