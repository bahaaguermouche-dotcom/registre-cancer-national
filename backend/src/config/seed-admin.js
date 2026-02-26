const db = require('./db');
const bcrypt = require('bcryptjs');

const seedAdmin = async () => {
    const adminEmail = 'admin@sante.dz';
    const adminPassword = 'Admin@2026';
    const saltRounds = 10;

    try {
        console.log('--- Seeding Admin Account ---');

        // Check if admin already exists
        const checkResult = await db.query('SELECT id FROM users WHERE email = $1', [adminEmail]);

        if (checkResult.rows.length > 0) {
            console.log('ℹ️ Admin account already exists.');
            process.exit(0);
        }

        const passwordHash = await bcrypt.hash(adminPassword, saltRounds);

        const insertQuery = `
            INSERT INTO users (name, email, role, location, status, password_hash)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, name, email;
        `;

        const values = [
            'Administrateur National',
            adminEmail,
            'Administrateur National',
            'Alger (Siège National)',
            'active',
            passwordHash
        ];

        const result = await db.query(insertQuery, values);
        console.log('✅ Admin account seeded successfully:', result.rows[0]);
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding admin account:', error);
        process.exit(1);
    }
};

seedAdmin();
