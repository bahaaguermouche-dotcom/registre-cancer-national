async function testKPIs() {
    try {
        const response = await fetch('http://localhost:5000/api/stats/kpis');
        if (!response.ok) {
            console.error('KPIs Error Status:', response.status);
            const text = await response.text();
            console.error('Error Body:', text);
            return;
        }
        const data = await response.json();
        console.log('KPIs Response:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('KPIs Fetch Error:', error.message);
    }
}

testKPIs();
