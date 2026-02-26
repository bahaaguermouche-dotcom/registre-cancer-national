const crypto = require('crypto');

const run = async () => {
    const emailSuffix = crypto.randomBytes(4).toString('hex');
    const secEmail = `sec_${emailSuffix}@test.com`;
    const docEmail = `doc_${emailSuffix}@test.com`;

    try {
        console.log('--- Registering Users ---');
        // Register Secretary
        await fetch('http://localhost:5000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Secretary Test',
                email: secEmail,
                password: 'password123',
                role: 'Secrétaire',
                location: '13 Tlemcen - hopital__tlemcen'
            })
        });

        // Register Doctor
        await fetch('http://localhost:5000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Doctor Test',
                email: docEmail,
                password: 'password123',
                role: 'Médecin',
                location: '13 Tlemcen - hopital__tlemcen',
                specialty: 'Cardiologie'
            })
        });

        console.log('--- Approving Users as Admin ---');
        const usersRes = await fetch('http://localhost:5000/api/users');
        const users = await usersRes.json();

        for (const user of users) {
            if (user.email === secEmail || user.email === docEmail) {
                console.log(`Approving ${user.email}...`);
                await fetch(`http://localhost:5000/api/users/${user.id}/approve`, { method: 'PATCH' });
            }
        }

        console.log('--- Testing Fetch Patients ---');
        // Test as Secretary
        const secLoginRes = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: secEmail, password: 'password123' })
        });
        const secData = await secLoginRes.json();
        const secToken = secData.token;

        const secRes = await fetch('http://localhost:5000/api/patients', {
            headers: { Authorization: `Bearer ${secToken}` }
        });
        console.log('Secretary Fetch Status:', secRes.status);
        if (!secRes.ok) console.log('Error:', await secRes.json()); else console.log('Success (Secretary)');

        // Test as Doctor
        const docLoginRes = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: docEmail, password: 'password123' })
        });
        const docData = await docLoginRes.json();
        const docToken = docData.token;

        const docRes = await fetch('http://localhost:5000/api/patients', {
            headers: { Authorization: `Bearer ${docToken}` }
        });
        console.log('Doctor Fetch Status:', docRes.status);
        if (!docRes.ok) console.log('Error:', await docRes.json()); else console.log('Success (Doctor)');

    } catch (error) {
        console.error('Test Failed:', error);
    }
};

run();
