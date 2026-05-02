const { Client } = require('pg');

async function checkPop() {
    const client = new Client({
        connectionString: 'postgresql://postgres:BAHA2005@localhost:5433/registry_db'
    });
    try {
        await client.connect();
        const res = await client.query('SELECT * FROM population_datasets');
        console.log('Population Datasets:', res.rows);
        
        const patients = await client.query('SELECT DISTINCT wilaya_residence FROM patients');
        console.log('Patient Wilayas:', patients.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

checkPop();
