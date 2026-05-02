
const { Client } = require('pg');

const db = new Client({
    connectionString: "postgresql://postgres:postgres@localhost:5432/cancer_registry"
});

async function checkData() {
    try {
        await db.connect();
        const res = await db.query("SELECT wilaya_residence, hospital_location, count(*) FROM patients GROUP BY wilaya_residence, hospital_location");
        console.log("Patient Distribution:");
        console.table(res.rows);
        
        const pop = await db.query("SELECT name FROM population_datasets");
        console.log("\nPopulation Datasets:");
        console.table(pop.rows);
        
        await db.end();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkData();
