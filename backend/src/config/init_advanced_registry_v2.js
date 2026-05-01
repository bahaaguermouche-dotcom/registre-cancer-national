const db = require('./db');

const migrate = async () => {
    try {
        console.log('--- Database Migration: Enhanced IARC Validation Rules (CIM-O-3) ---');

        // 1. Add validation columns to ref_cancer_rules
        console.log('1. Adding allowed_gender and age limits to ref_cancer_rules...');
        await db.query(`
            ALTER TABLE ref_cancer_rules 
            RENAME COLUMN cancer_type TO category;
        `).catch(() => console.log('Column rename skipped (already done)'));

        await db.query(`
            ALTER TABLE ref_cancer_rules 
            ADD COLUMN IF NOT EXISTS sub_type TEXT,
            ADD COLUMN IF NOT EXISTS topography_code_regex TEXT,
            ADD COLUMN IF NOT EXISTS morphology_code_regex TEXT,
            ADD COLUMN IF NOT EXISTS icd10 TEXT,
            ADD COLUMN IF NOT EXISTS is_rare BOOLEAN DEFAULT FALSE;
        `);

        // 2. Clear and Re-seed with IARC standard rules
        console.log('2. Seeding precise site-specific validation rules...');

        // This is a subset of IARC cross-checks
        const rules = [
            // category, sub_type, icd10, min_age, max_age, allowed_gender, specialty
            ['Sein', 'Adénocarcinome canalaire (NOS)', 'C50.9', 15, 110, 'Female', 'Sénologie'],
            ['Prostate', 'Adénocarcinome prostatique', 'C61.9', 35, 110, 'Male', 'Urologie'],
            ['Col Utérin', 'Carcinome épidermoïde', 'C53.9', 15, 110, 'Female', 'Gynécologie'],
            ['Poumon', 'Carcinome à petites cellules', 'C34.9', 18, 110, null, 'Pneumologie'],
            ['Vessie', 'Carcinome urothélial', 'C67.9', 18, 110, null, 'Urologie'],
            ['Pédiatrie', 'Néphroblastome (Wilms)', 'C64.9', 0, 15, null, 'Oncopédiatrie'],
            ['Pédiatrie', 'Neuroblastome', 'C47.9', 0, 15, null, 'Oncopédiatrie'],
            ['Thyroïde', 'Carcinome papillaire', 'C73.9', 5, 110, null, 'Endocrinologie']
        ];

        // Wipe old rules to avoid duplicates with different schemas
        await db.query('TRUNCATE ref_cancer_rules RESTART IDENTITY');

        for (const rule of rules) {
            await db.query(`
                INSERT INTO ref_cancer_rules (category, sub_type, icd10, min_age, max_age, allowed_gender, specialty)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, rule);
        }

        console.log('✅ CIM-O-3 Validation Rules Initialized.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration Failed:', error);
        process.exit(1);
    }
};

migrate();
