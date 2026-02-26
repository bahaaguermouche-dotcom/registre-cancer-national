const axios = require('axios');

async function testQuery() {
    try {
        const res = await axios.get('http://localhost:5000/api/stats/query', {
            params: {
                dataSource: 'cancer_cases',
                groupBy: 'location'
            },
            headers: { Authorization: 'Bearer MOCK_TOKEN_NOT_NEEDED_FOR_LOCAL_JS_IF_I_BYPASS' }
        });
        console.log('Query Result:', JSON.stringify(res.data, null, 2));
    } catch (e) {
        console.error('Error:', e.message);
    }
}

// Instead of actual API call which requires token, let's just run the DB query directly to see types
const db = require('./src/config/db');
async function testDb() {
    const res = await db.query('SELECT hospital_location as label, (count(*))::int as value FROM patients GROUP BY hospital_location');
    console.log('DB result values:');
    res.rows.forEach(r => {
        console.log(`Label: ${r.label}, Value: ${r.value}, Type: ${typeof r.value}`);
    });
    process.exit(0);
}

testDb();
