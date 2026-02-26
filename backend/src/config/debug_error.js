const run = async () => {
    try {
        console.log('Logging in...');
        const loginRes = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@sante.dz', password: 'Admin@2026' })
        });
        const loginData = await loginRes.json();

        if (!loginRes.ok) {
            console.error('Login Failed:', loginData);
            return;
        }

        const token = loginData.token;
        console.log('Token obtained.');

        console.log('Fetching patients...');
        const res = await fetch('http://localhost:5000/api/patients', {
            headers: { Authorization: `Bearer ${token}` }
        });

        const data = await res.json();
        if (!res.ok) {
            console.error('Error Status:', res.status);
            console.error('Error Data:', data);
        } else {
            console.log('Success:', data);
        }
    } catch (error) {
        console.error('Fetch Error:', error);
    }
};

run();
