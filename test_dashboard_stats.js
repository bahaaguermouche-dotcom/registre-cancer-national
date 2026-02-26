const API_URL = 'http://localhost:5000/api';

async function testStats() {
    console.log('--- Testing Dashboard Stats ---');

    const usersToTest = [
        { email: 'admin@sante.dz', password: 'password123', label: 'National Admin' },
        { email: 'dr2@test.com', password: 'password123', label: 'Médecin' },
        { email: 'sec@test.com', password: 'password123', label: 'Secrétaire' },
        { email: 'bahaaguermouche@gmail.com', password: 'password123', label: 'Directeur Hopital' }
    ];

    for (const user of usersToTest) {
        console.log(`\nLogging in as ${user.label} (${user.email})...`);
        try {
            const loginRes = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: user.email, password: user.password })
            });

            if (!loginRes.ok) {
                console.error(`Login failed with status ${loginRes.status}`);
                continue;
            }

            const { token } = await loginRes.json();

            if (token) {
                console.log('Success. Fetching stats...');
                const statsRes = await fetch(`${API_URL}/dashboard/stats`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (!statsRes.ok) {
                    console.error(`Stats fetch failed with status ${statsRes.status}`);
                    continue;
                }

                const stats = await statsRes.json();
                console.log(`${user.label} Stats:`, JSON.stringify(stats, null, 2));
            } else {
                console.error('No token received.');
            }
        } catch (error) {
            console.error(`Error testing ${user.label}:`, error.message);
        }
    }

    console.log('\n--- Test Completed ---');
}

testStats().catch(console.error);
