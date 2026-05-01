const db = require('./db');
const bcrypt = require('bcryptjs');

async function verifyLabInsertion() {
    console.log("--- Testing Lab Insertion (DB Direct) ---");
    try {
        const email = `test_lab_db_${Date.now()}@sante.dz`;
        const passwordHash = await bcrypt.hash("Password123", 10);

        await db.query(`
            INSERT INTO users (name, email, role, location, status, password_hash, lab_type, lab_activities)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, ["Lab DB Test", email, "Laboratoire", "13 Tlemcen", "pending", passwordHash, "A", ["Biopsie", "IHC"]]);

        const result = await db.query('SELECT lab_type, lab_activities FROM users WHERE email = $1', [email]);
        const user = result.rows[0];

        if (user && user.lab_type === 'A' && user.lab_activities.length === 2) {
            console.log("✅ Lab Metadata Database Verification: SUCCESS");
            console.log("   Stored Type:", user.lab_type);
            console.log("   Stored Activities:", user.lab_activities);
        } else {
            console.error("❌ Lab Metadata Database Verification: FAILED");
        }
    } catch (error) {
        console.error("❌ DB Error:", error);
    } finally {
        process.exit();
    }
}

verifyLabInsertion();
