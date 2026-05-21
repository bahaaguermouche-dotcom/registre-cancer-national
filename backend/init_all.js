const { execSync } = require('child_process');
const path = require('path');

console.log('🏁 Starting Unified Database Initialization...\n');

const scripts = [
    { name: 'Users Table', cmd: 'node src/config/init-db.js' },
    { name: 'Patients & Tumors', cmd: 'node src/config/force_init.js' },
    { name: 'Medical Records', cmd: 'node src/config/create_medical_tables.js' },
    { name: 'Advanced Registry Schema', cmd: 'node src/config/init_advanced_registry.js' },
    { name: 'Population Datasets', cmd: 'node src/config/init_population.js' },
    { name: 'Cancer Seeds & Billing Packages', cmd: 'node run_migrations.js' },
    { name: 'Specialty Migration', cmd: 'node src/config/migrate-specialties.js' },
    { name: 'Lab Config Migration', cmd: 'node src/config/migrate_lab_config.js' },
    { name: 'Lab Requests Schema', cmd: 'node src/config/init_lab_requests.js' },
    { name: 'Lab Workflow Migration', cmd: 'node src/config/migrate_lab_workflow.js' },
    { name: 'Cross-Hospital Migration', cmd: 'node src/config/migrate_cross_hospital.js' },
    { name: 'Extended Registry Migration', cmd: 'node src/config/migration_v2_extended_registry.js' },
    { name: 'Structured Lab Results Migration', cmd: 'node src/config/migrate_lab_results.js' },
    { name: 'Clinical History Migration', cmd: 'node src/config/migrate_clinical_history.js' },
    { name: 'Diag Links Migration', cmd: 'node src/config/migrate_diag_links.js' },
    { name: 'Hierarchical Reference Migration', cmd: 'node src/config/migrate_hierarchical_ref.js' },
    { name: 'BYTEA Migration', cmd: 'node src/config/migrate_to_bytea.js' },
    { name: 'RCP & Chat Migration', cmd: 'node src/config/migration_rcp.js' }
];

for (const script of scripts) {
    try {
        console.log(`⏳ Running: ${script.name}...`);
        const output = execSync(script.cmd, { cwd: __dirname, stdio: 'pipe' });
        console.log(output.toString().trim());
        console.log(`✅ ${script.name} completed successfully.\n`);
    } catch (error) {
        console.error(`❌ Failed to run ${script.name}:`);
        if (error.stderr) {
            console.error(error.stderr.toString());
        } else {
            console.error(error.message);
        }
        process.exit(1);
    }
}

console.log('🎉 Database initialized and seeded successfully in all aspects!');
