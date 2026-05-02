const { Client } = require('pg');

async function testMap() {
    const client = new Client({
        connectionString: 'postgresql://postgres:BAHA2005@localhost:5433/registry_db'
    });
    try {
        await client.connect();
        
        // Mock the map query
        const query = `
            SELECT 
                COALESCE(wilaya_residence, hospital_location) as wilaya,
                count(*)::int as count
            FROM patients 
            WHERE 1=1
            GROUP BY 1
        `;
        const result = await client.query(query);
        console.log('Raw Map Data:', result.rows);

        const enhanced = await Promise.all(result.rows.map(async (row) => {
            const cleanWilaya = row.wilaya ? row.wilaya.replace(/\(\d+\)/, '').trim() : '';
            const popRes = await client.query(
                "SELECT total_population FROM population_datasets WHERE name ILIKE $1 OR name ILIKE $2 LIMIT 1", 
                [`%${cleanWilaya}%`, `%${row.wilaya}%`]
            );
            
            const pop = popRes.rows[0]?.total_population || 0;
            const rate = pop > 0 ? (row.count / pop) * 100000 : 0;
            return {
                ...row,
                cleanWilaya,
                pop,
                incidence: parseFloat(rate.toFixed(2))
            };
        }));
        console.log('Enhanced Map Data:', enhanced);

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

testMap();
