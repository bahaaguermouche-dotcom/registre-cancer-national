const db = require('./src/config/db');
const bcrypt = require('bcryptjs');

const HOSPITALS = [
    { name: 'CHU Tlemcen', wilaya: '13 Tlemcen' },
    { name: 'CHU Oran', wilaya: '31 Oran' },
    { name: 'CHU Mustapha Bacha', wilaya: '16 Alger' },
    { name: 'CAC Constantine', wilaya: '25 Constantine' }
];

const SPECIALTIES = [
    { name: 'Gastro-entérologie', cancer: 'Cancer du Côlon' },
    { name: 'Pneumologie', cancer: 'Cancer du Poumon' },
    { name: 'Gynécologie', cancer: 'Cancer du Sein' },
    { name: 'Urologie', cancer: 'Cancer de la Prostate' }
];

const seedData = async () => {
    const saltRounds = 10;
    const commonPassword = await bcrypt.hash('Algeria@2026', saltRounds);

    try {
        console.log('--- Starting Comprehensive Data Seeding ---');

        for (const hospital of HOSPITALS) {
            const location = `${hospital.wilaya} - ${hospital.name}`;
            console.log(`\nProcessing Hospital: ${location}`);

            // 1. Create Director
            const directorEmail = `directeur.${hospital.name.toLowerCase().replace(/\s+/g, '')}@sante.dz`;
            await db.query(`
                INSERT INTO users (name, email, role, location, status, password_hash)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (email) DO NOTHING
            `, [`Directeur ${hospital.name}`, directorEmail, 'Directeur Hopital', location, 'active', commonPassword]);
            console.log(`   - Director created: ${directorEmail}`);

            // 2. Create Secretary
            const secretaryEmail = `secretariat.${hospital.name.toLowerCase().replace(/\s+/g, '')}@sante.dz`;
            await db.query(`
                INSERT INTO users (name, email, role, location, status, password_hash)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (email) DO NOTHING
            `, [`Séc. ${hospital.name}`, secretaryEmail, 'Secrétaire', location, 'active', commonPassword]);
            console.log(`   - Secretary created: ${secretaryEmail}`);

            // 3. Create Doctors & Patients
            for (const spec of SPECIALTIES) {
                const doctorName = `Dr. ${spec.name.split('-')[0]} ${hospital.name.split(' ')[1] || ''}`;
                const doctorEmail = `dr.${spec.name.toLowerCase().split('-')[0].replace(/\s+/g, '')}.${hospital.name.toLowerCase().replace(/\s+/g, '')}@sante.dz`;

                const docRes = await db.query(`
                    INSERT INTO users (name, email, role, location, status, password_hash, specialty)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    ON CONFLICT (email) DO UPDATE SET specialty = $7
                    RETURNING id
                `, [doctorName, doctorEmail, 'Médecin', location, 'active', commonPassword, spec.name]);

                const doctorId = docRes.rows[0].id;
                console.log(`   - Doctor created: ${doctorEmail} (${spec.name})`);

                // Create 2 Patients for each doctor
                for (let i = 1; i <= 2; i++) {
                    const patientName = `Patient ${spec.cancer.split(' ')[2]} ${hospital.name.split(' ')[1] || ''} ${i}`;
                    const nationalId = Math.floor(Math.random() * 900000000000000).toString().padStart(15, '0');

                    const patientRes = await db.query(`
                        INSERT INTO patients (
                            national_id, first_name, last_name, age, gender, 
                            assigned_doctor_id, hospital_location, cancer_type
                        )
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                        RETURNING id
                    `, [
                        nationalId,
                        `Prénom${i}`,
                        `Patient${i}_${spec.name}`,
                        45 + (i * 5),
                        i === 1 ? 'Homme' : 'Femme',
                        doctorId,
                        location,
                        spec.cancer
                    ]);

                    const patientId = patientRes.rows[0].id;

                    // Create a tumor record for the standard
                    await db.query(`
                        INSERT INTO tumors (patient_id, doctor_id, topography_label, status)
                        VALUES ($1, $2, $3, 'provisional')
                    `, [patientId, doctorId, spec.cancer]);
                }
                console.log(`     -> 2 Patients created for ${doctorName}`);
            }
        }

        console.log('\n✅ Seeding complete! All hospital environments are ready.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding Failed:', error);
        process.exit(1);
    }
};

seedData();
