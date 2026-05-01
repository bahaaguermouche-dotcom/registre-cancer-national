const db = require('./src/config/db');

async function seedStandard() {
    try {
        console.log("--- Seeding WHO World Standard Population ---");
        const name = "WHO World Standard Population (2000-2025)";
        const year = 2000;
        const source = "WHO";
        const standard_population = "WHO_WORLD";
        
        // WHO weights per 100,000 (roughly)
        const male_data = [8860, 8690, 8600, 8470, 8220, 7930, 7610, 7150, 6590, 6040, 5370, 4550, 3720, 2960, 2210, 1520, 1510];
        const female_data = [8860, 8690, 8600, 8470, 8220, 7930, 7610, 7150, 6590, 6040, 5370, 4550, 3720, 2960, 2210, 1520, 1510];
        const total_male = 100000;
        const total_female = 100000;
        const total_population = 200000;

        await db.query(`
            INSERT INTO population_datasets (
                name, year, source, standard_population,
                male_0_4, male_5_9, male_10_14, male_15_19, male_20_24, male_25_29, male_30_34, male_35_39, male_40_44, male_45_49, male_50_54, male_55_59, male_60_64, male_65_69, male_70_74, male_75_79, male_80_plus,
                female_0_4, female_5_9, female_10_14, female_15_19, female_20_24, female_25_29, female_30_34, female_35_39, female_40_44, female_45_49, female_50_54, female_55_59, female_60_64, female_65_69, female_70_74, female_75_79, female_80_plus,
                total_male, total_female, total_population
            ) VALUES (
                $1, $2, $3, $4,
                $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21,
                $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38,
                $39, $40, $41
            ) ON CONFLICT DO NOTHING
        `, [
            name, year, source, standard_population,
            ...male_data, ...female_data,
            total_male, total_female, total_population
        ]);
        console.log("✅ Seeded successfully");
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
seedStandard();
