const db = require('./db');

const PACKAGES = [
    {
        cancer_nom: "Cancer du Poumon", sous_type: "NSCLC — Adénocarcinome", phase: "initial",
        analyses_obl: ["📡 Radiographie thorax face+profil", "🧪 NFS complète", "🧪 Bilan hépatique (ASAT/ALAT/PAL/GGT)", "🧪 LDH", "🧪 Créatinine + Clairance"],
        analyses_opt: ["📡 Scanner thoracique si radio anormale"],
        note_clinique: "Premier contact : confirmer présence de lésion pulmonaire avant orientation spécialisée"
    }
];

async function seed() {
    console.log("--- Debug Seeding ---");
    try {
        const cancersRes = await db.query('SELECT id, category FROM ref_cancer_rules');
        const cancerMap = {};
        cancersRes.rows.forEach(c => {
            cancerMap[c.category] = c.id;
        });

        for (const pkg of PACKAGES) {
            const typeId = cancerMap[pkg.cancer_nom];
            console.log(`Debug: Inserting for ${pkg.cancer_nom}, typeId: ${typeId} (${typeof typeId})`);

            const values = [
                typeId,
                pkg.cancer_nom,
                pkg.sous_type,
                pkg.phase,
                JSON.stringify(pkg.analyses_obl),
                JSON.stringify(pkg.analyses_opt),
                pkg.note_clinique
            ];

            console.log("Debug: Values array:", values.map(v => `${v} (${typeof v})`));

            await db.query(`
                INSERT INTO bilan_packages (cancer_type_id, cancer_nom, sous_type, phase, analyses_obl, analyses_opt, note_clinique)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, values);
        }

    } catch (error) {
        console.error("❌ Debug Error:", error);
    } finally {
        process.exit();
    }
}

seed();
