const db = require('./db');

const migrate = async () => {
    try {
        console.log('--- Database Migration: Population Datasets (IARC/CanReg5 Standards) ---');

        // Create Population Datasets table
        console.log('1. Creating population_datasets table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS population_datasets (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(255) NOT NULL, -- e.g. "Tlemcen, 2023"
                year INT NOT NULL,
                source TEXT,             -- e.g. "Government Census"
                standard_population VARCHAR(100) DEFAULT 'World Standard Population',
                
                -- Male Population by Age Group
                male_0_4 INT DEFAULT 0,
                male_5_9 INT DEFAULT 0,
                male_10_14 INT DEFAULT 0,
                male_15_19 INT DEFAULT 0,
                male_20_24 INT DEFAULT 0,
                male_25_29 INT DEFAULT 0,
                male_30_34 INT DEFAULT 0,
                male_35_39 INT DEFAULT 0,
                male_40_44 INT DEFAULT 0,
                male_45_49 INT DEFAULT 0,
                male_50_54 INT DEFAULT 0,
                male_55_59 INT DEFAULT 0,
                male_60_64 INT DEFAULT 0,
                male_65_69 INT DEFAULT 0,
                male_70_74 INT DEFAULT 0,
                male_75_79 INT DEFAULT 0,
                male_80_plus INT DEFAULT 0,
                total_male INT DEFAULT 0,

                -- Female Population by Age Group
                female_0_4 INT DEFAULT 0,
                female_5_9 INT DEFAULT 0,
                female_10_14 INT DEFAULT 0,
                female_15_19 INT DEFAULT 0,
                female_20_24 INT DEFAULT 0,
                female_25_29 INT DEFAULT 0,
                female_30_34 INT DEFAULT 0,
                female_35_39 INT DEFAULT 0,
                female_40_44 INT DEFAULT 0,
                female_45_49 INT DEFAULT 0,
                female_50_54 INT DEFAULT 0,
                female_55_59 INT DEFAULT 0,
                female_60_64 INT DEFAULT 0,
                female_65_69 INT DEFAULT 0,
                female_70_74 INT DEFAULT 0,
                female_75_79 INT DEFAULT 0,
                female_80_plus INT DEFAULT 0,
                total_female INT DEFAULT 0,

                total_population INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Check if we need to seed an empty 2024 dataset for Tlemcen
        const checkSeed = await db.query('SELECT count(*) FROM population_datasets WHERE year = 2024');
        if (parseInt(checkSeed.rows[0].count) === 0) {
            console.log('2. Seeding initial 2024 Tlemcen empty dataset...');
            await db.query(`
                INSERT INTO population_datasets (
                    name, year, source, standard_population,
                    total_male, total_female, total_population
                ) VALUES (
                    'Wilaya de Tlemcen, 2024 (Estimation)', 2024, 'Recensement National/Estimation', 'World Standard Population',
                    550000, 560000, 1110000
                )
            `);
        } else {
            console.log('2. Seed dataset already exists, skipping seed.');
        }

        console.log('✅ Population Datasets Module Initialized Successfully.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration Failed:', error);
        process.exit(1);
    }
};

migrate();
