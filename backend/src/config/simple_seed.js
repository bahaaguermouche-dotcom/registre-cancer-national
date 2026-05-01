const db = require('./db');

async function seed() {
    try {
        await db.query('DELETE FROM bilan_packages');

        // Use hardcoded values for a few records to confirm it works
        const sql = `
            INSERT INTO bilan_packages (cancer_type_id, cancer_nom, sous_type, phase, analyses_obl, analyses_opt, note_clinique)
            VALUES 
            (1, 'Cancer du Poumon', 'NSCLC', 'initial', '["📡 Radiographie thorax", "🧪 NFS"]'::json, '[]'::json, 'Note'),
            (1, 'Cancer du Poumon', 'NSCLC', 'confirmation', '["📡 Scanner", "🔬 Biopsie"]'::json, '[]'::json, 'Note'),
            (4, 'Cancer du Sein', 'CCI', 'initial', '["📡 Mammographie"]'::json, '[]'::json, 'Note')
        `;

        await db.query(sql);
        console.log("✅ Seed successful");
    } catch (e) {
        console.error("❌ Seed failed:", e);
    } finally {
        process.exit();
    }
}

seed();
