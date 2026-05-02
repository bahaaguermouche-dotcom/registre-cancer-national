const db = require('./backend/src/config/db');

async function checkSchema() {
    try {
        const res = await db.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'bilan_packages';
        `);
        console.log('Columns in bilan_packages:', res.rows);
        
        const countRes = await db.query('SELECT COUNT(*) FROM bilan_packages');
        console.log('Total rows in bilan_packages:', countRes.rows[0].count);
        
        process.exit(0);
    } catch (err) {
        console.error('Error checking schema:', err);
        process.exit(1);
    }
}

checkSchema();
