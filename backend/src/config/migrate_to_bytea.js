const db = require('./db');
const fs = require('fs');
const path = require('path');

const migrate = async () => {
    try {
        console.log('--- Starting Migration to BYTEA ---');

        // 1. Add columns if they don't exist
        console.log('1. Checking database schema...');
        await db.query(`
            ALTER TABLE medical_records 
            ADD COLUMN IF NOT EXISTS file_data BYTEA,
            ADD COLUMN IF NOT EXISTS file_mimetype TEXT;
        `);
        console.log('   - Columns file_data and file_mimetype ensured.');

        // 2. Fetch records that have a file_path but no file_data
        const records = await db.query(`
            SELECT id, file_path FROM medical_records 
            WHERE file_data IS NULL AND file_path IS NOT NULL;
        `);

        console.log(`2. Found ${records.rowCount} records to migrate.`);

        for (const record of records.rows) {
            // file_path looks like "/uploads/filename.ext"
            // We need to map it to local path
            const filename = record.file_path.split('/').pop();
            const localPath = path.join(__dirname, '../../uploads', filename);

            if (fs.existsSync(localPath)) {
                console.log(`   - Migrating: ${filename}`);
                const fileBuffer = fs.readFileSync(localPath);

                // Very basic mimetype detection based on extension
                const ext = path.extname(filename).toLowerCase();
                let mimetype = 'application/octet-stream';
                if (ext === '.jpg' || ext === '.jpeg') mimetype = 'image/jpeg';
                else if (ext === '.png') mimetype = 'image/png';
                else if (ext === '.pdf') mimetype = 'application/pdf';

                await db.query(
                    'UPDATE medical_records SET file_data = $1, file_mimetype = $2 WHERE id = $3',
                    [fileBuffer, mimetype, record.id]
                );
            } else {
                console.warn(`   - [WARN] File not found on disk: ${localPath}`);
            }
        }

        console.log('✅ Migration Composed Successfully.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration Failed:', error);
        process.exit(1);
    }
};

migrate();
