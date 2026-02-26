const db = require('./db');

async function diagnose() {
    try {
        console.log('--- Public Tables ---');
        const tables = await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        console.table(tables.rows);

        for (const row of tables.rows) {
            const table = row.table_name;
            console.log(`\n--- Constraints for ${table} ---`);
            const constraints = await db.query(`
                SELECT
                    tc.constraint_name, 
                    tc.table_name, 
                    kcu.column_name, 
                    ccu.table_name AS foreign_table_name,
                    ccu.column_name AS foreign_column_name 
                FROM 
                    information_schema.table_constraints AS tc 
                    JOIN information_schema.key_column_usage AS kcu
                      ON tc.constraint_name = kcu.constraint_name
                      AND tc.table_schema = kcu.table_schema
                    JOIN information_schema.constraint_column_usage AS ccu
                      ON ccu.constraint_name = tc.constraint_name
                      AND ccu.table_schema = tc.table_schema
                WHERE tc.table_name = $1;
            `, [table]);
            console.table(constraints.rows);
        }

        console.log('\n--- Triggers ---');
        const triggers = await db.query("SELECT trigger_name, event_manipulation, event_object_table, action_statement FROM information_schema.triggers");
        console.table(triggers.rows);

        console.log('\n--- Users Count by Role ---');
        const userStats = await db.query("SELECT role, COUNT(*) FROM users GROUP BY role");
        console.table(userStats.rows);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
diagnose();
