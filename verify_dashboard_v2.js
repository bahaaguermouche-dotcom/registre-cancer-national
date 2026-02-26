const db = require('./backend/src/config/db');
const bcrypt = require('bcryptjs');

async function verify() {
    try {
        console.log('--- Dashboard Stats Implementation Verification ---');

        // 1. Reset Admin password for testing
        const hash = await bcrypt.hash('password123', 10);
        await db.query('UPDATE users SET password_hash = $1 WHERE email = $2', [hash, 'admin@sante.dz']);
        console.log('[DEBUG] Admin password reset to "password123"');

        // 2. Query DB directly for expected values
        const expected = {
            totalPatients: parseInt((await db.query('SELECT count(*) FROM patients')).rows[0].count),
            activeCenters: parseInt((await db.query('SELECT count(DISTINCT hospital_location) FROM patients')).rows[0].count),
            totalUsers: parseInt((await db.query('SELECT count(*) FROM users')).rows[0].count),
            pendingApprovals: parseInt((await db.query('SELECT count(*) FROM users WHERE status = \'pending\'')).rows[0].count)
        };

        console.log('[EXPECTED] DB Totals:', JSON.stringify(expected, null, 2));

        // 3. Test API Authentication & Response
        console.log('\nTesting API integration...');
        const loginRes = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@sante.dz', password: 'password123' })
        });

        if (!loginRes.ok) throw new Error(`Login failed with status ${loginRes.status}`);
        const { token } = await loginRes.json();

        const statsRes = await fetch('http://localhost:5000/api/dashboard/stats', {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!statsRes.ok) throw new Error(`Stats fetch failed with status ${statsRes.status}`);
        const stats = await statsRes.json();

        console.log('[ACTUAL] API response (Admin):', JSON.stringify(stats, null, 2));

        // 4. Comparison
        const match = JSON.stringify(expected) === JSON.stringify(stats);
        if (match) {
            console.log('\n✅ VERIFICATION SUCCESS: API stats match database counts exactly.');
        } else {
            console.error('\n❌ VERIFICATION FAILURE: Mismatch between DB and API values.');
        }

    } catch (e) {
        console.error('\n❌ Error during verification:', e.message);
    } finally {
        process.exit();
    }
}

verify();
