const db = require('./db');

const migrate = async () => {
    try {
        console.log('--- Database Refinement: Hierarchical Cancer Reference ---');

        // 1. Update ref_cancer_rules column structure
        console.log('1. Modifying ref_cancer_rules table...');
        await db.query(`
            ALTER TABLE ref_cancer_rules 
            RENAME COLUMN cancer_type TO category;
            
            ALTER TABLE ref_cancer_rules 
            ADD COLUMN IF NOT EXISTS sub_type TEXT,
            ADD COLUMN IF NOT EXISTS icd10 TEXT,
            ADD COLUMN IF NOT EXISTS icdo3_topography TEXT,
            ADD COLUMN IF NOT EXISTS icdo3_morphology TEXT,
            ADD COLUMN IF NOT EXISTS frequency TEXT;
        `);

        // 2. Ensure tumors table uses the new hierarchy
        console.log('2. Updating tumors table structure...');
        await db.query(`
            ALTER TABLE tumors 
            ADD COLUMN IF NOT EXISTS category TEXT,
            ADD COLUMN IF NOT EXISTS sub_type TEXT,
            ADD COLUMN IF NOT EXISTS icd10 TEXT;
        `);

        console.log('✅ Database schema updated for hierarchical reference.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration Failed:', error);
        process.exit(1);
    }
};

migrate();
