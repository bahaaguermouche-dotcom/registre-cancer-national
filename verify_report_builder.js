const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';
// We need a valid token. Since this is a test environment, 
// we'll assume we can get one or the user can provide one.
// For automated verification, we'll try to log in first.

async function verify() {
    console.log("--- Verifying Custom Report Builder Backend ---");
    try {
        // 1. Login to get token
        const loginRes = await axios.post(`${BASE_URL}/login`, {
            email: 'admin@registry.dz',
            password: 'admin'
        });
        const token = loginRes.data.token;
        const headers = { Authorization: `Bearer ${token}` };

        // 2. Test KPIs
        console.log("Testing GET /api/stats/kpis...");
        const kpiRes = await axios.get(`${BASE_URL}/stats/kpis`, { headers });
        console.log("KPIS:", kpiRes.data);

        // 3. Test Dynamic Query
        console.log("Testing GET /api/stats/query...");
        const queryRes = await axios.get(`${BASE_URL}/stats/query`, {
            params: { dataSource: 'cancer_cases', groupBy: 'location' },
            headers
        });
        console.log("Query Result Length:", queryRes.data.length);

        // 4. Test Saved Reports
        console.log("Testing Saved Reports CRUD...");
        const saveRes = await axios.post(`${BASE_URL}/stats/saved-reports`,
            { name: 'Test Report', config: { dataSource: 'cancer_cases', groupBy: 'gender' } },
            { headers }
        );
        console.log("Saved Report ID:", saveRes.data.id);

        const listRes = await axios.get(`${BASE_URL}/stats/saved-reports`, { headers });
        console.log("Saved Reports Found:", listRes.data.length);

        await axios.delete(`${BASE_URL}/stats/saved-reports/${saveRes.data.id}`, { headers });
        console.log("Deleted Saved Report successfully.");

        console.log("✅ Backend verification complete.");
    } catch (error) {
        console.error("❌ Verification failed:", error.response?.data || error.message);
    }
}

verify();
