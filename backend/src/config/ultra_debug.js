const db = require('./db');

async function debug() {
    try {
        console.log("--- Ultra Debug ---");
        const res = await db.query("SELECT id, category FROM ref_cancer_rules WHERE category ILIKE 'Cancer du Poumon' LIMIT 1");
        console.log("Found ID:", res.rows[0]?.id, "Type:", typeof res.rows[0]?.id);

        const typeId = res.rows[0]?.id;
        if (typeId === undefined) {
            console.error("ID IS UNDEFINED");
            return;
        }

        const analyses_obl = ["test"];
        const analyses_opt = ["test"];
        const note = "test";

        console.log("Attempting insert with ID:", typeId);

        await db.query(`
            INSERT INTO bilan_packages (cancer_type_id, cancer_nom, sous_type, phase, analyses_obl, analyses_opt, note_clinique)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [typeId, "Test Cancer", "Test Sub", "initial", JSON.stringify(analyses_obl), JSON.stringify(analyses_opt), note]);

        console.log("✅ Success!");
    } catch (e) {
        console.error("❌ Error:", e);
    } finally {
        process.exit();
    }
}

debug();
