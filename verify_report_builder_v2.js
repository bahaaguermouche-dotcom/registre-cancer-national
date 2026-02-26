const http = require('http');

const options = (method, path, data = null, token = null) => {
    const opts = {
        hostname: 'localhost',
        port: 5000,
        path: `/api${path}`,
        method: method,
        headers: {
            'Content-Type': 'application/json'
        }
    };
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    return opts;
};

const request = (opts, data = null) => {
    return new Promise((resolve, reject) => {
        const req = http.request(opts, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const parsed = body ? JSON.parse(body) : {};
                    if (res.statusCode >= 400) reject({ status: res.statusCode, data: parsed });
                    else resolve(parsed);
                } catch (e) {
                    reject({ status: res.statusCode, body });
                }
            });
        });
        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
};

async function verify() {
    console.log("--- Verifying Custom Report Builder Backend (HTTP) ---");
    try {
        // 1. Login
        console.log("Logging in...");
        const loginRes = await request(options('POST', '/login'), { email: 'admin@registry.dz', password: 'admin' });
        const token = loginRes.token;

        // 2. Test KPIs
        console.log("Testing KPIs...");
        const kpis = await request(options('GET', '/stats/kpis', null, token));
        console.log("KPI Result:", kpis);

        // 3. Test Query
        console.log("Testing Query...");
        const query = await request(options('GET', '/stats/query?dataSource=cancer_cases&groupBy=location', null, token));
        console.log("Query Results:", query.length);

        console.log("✅ Verification successful!");
    } catch (error) {
        console.error("❌ Verification failed:", error);
    }
}

verify();
