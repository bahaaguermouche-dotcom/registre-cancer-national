const db = require('./db');

const PACKAGES = [
    // 1-3 — CANCER DU POUMON
    {
        cancer_nom: "Cancer du Poumon", sous_type: "NSCLC — Adénocarcinome", phase: "initial",
        analyses_obl: ["📡 Radiographie thorax face+profil", "🧪 NFS complète", "🧪 Bilan hépatique (ASAT/ALAT/PAL/GGT)", "🧪 LDH", "🧪 Créatinine + Clairance"],
        analyses_opt: ["📡 Scanner thoracique si radio anormale"],
        note_clinique: "Premier contact : confirmer présence de lésion pulmonaire avant orientation spécialisée"
    },
    {
        cancer_nom: "Cancer du Poumon", sous_type: "NSCLC — Adénocarcinome", phase: "confirmation",
        analyses_obl: ["📡 Scanner thoracique avec injection", "🔬 Bronchoscopie + Biopsie bronchique", "🔬 IHC : TTF-1, Napsin-A, p40, CK7", "🔬 Cytologie LBA (lavage broncho-alvéolaire)"],
        analyses_opt: ["🔬 Biopsie scanno-guidée si lésion périphérique", "🔬 Médiastinoscopie si ADP médiastinales"],
        note_clinique: "Objectif : confirmer le diagnostic histologique et déterminer NSCLC vs SCLC puis sous-type"
    },
    {
        cancer_nom: "Cancer du Poumon", sous_type: "NSCLC — Adénocarcinome", phase: "extension",
        analyses_obl: ["📡 Scanner TAP (thorax-abdomen-pelvis)", "📡 IRM cérébrale avec injection", "🔬 PCR EGFR (exons 18-21)", "🔬 FISH ALK / ROS1", "🔬 PCR BRAF V600E", "🔬 PCR KRAS G12C", "🔬 IHC PDL1 (score TPS)", "🧪 Cyfra 21-1 (J0)", "🧪 CEA (J0)"],
        analyses_opt: ["📡 PET-Scan FDG si résécable", "🔬 NGS panel étendu (NTRK/MET/RET/HER2)", "🧪 ctDNA (biopsie liquide) si biopsie insuffisante"],
        note_clinique: "CRITIQUE : PCR/FISH obligatoires avant tout traitement — déterminent la thérapie ciblée"
    },
    {
        cancer_nom: "Cancer du Poumon", sous_type: "NSCLC — Adénocarcinome", phase: "suivi",
        analyses_obl: ["🧪 NFS (avant chaque cycle)", "🧪 Bilan hépatique (avant chaque cycle)", "🧪 Créatinine (avant chaque cycle)", "🧪 Cyfra 21-1", "🧪 CEA", "📡 Scanner TAP (tous les 2-3 cycles = 6-9 semaines)"],
        analyses_opt: ["📡 IRM cérébrale (si symptômes neurologiques)", "🔬 Rebiopsie + NGS (si progression — recherche résistance T790M/C797S)", "🧪 ctDNA (suivi moléculaire)"],
        note_clinique: "Évaluation RECIST 1.1 — surveillance toxicité et réponse thérapeutique"
    },
    {
        cancer_nom: "Cancer du Sein", sous_type: "Carcinome canalaire invasif", phase: "initial",
        analyses_obl: ["📡 Mammographie bilatérale (classification BIRADS)", "📡 Échographie mammaire + axillaire", "🧪 NFS", "🧪 Bilan hépatique", "🧪 CA 15-3 (J0)", "🧪 ACE (J0)"],
        analyses_opt: ["📡 IRM mammaire si densité élevée ou BRCA"],
        note_clinique: "Mammographie + écho = bilan de 1ère intention. BIRADS 4-5 → biopsie obligatoire"
    },
    {
        cancer_nom: "Cancer du Sein", sous_type: "Carcinome canalaire invasif", phase: "confirmation",
        analyses_obl: ["🔬 Core biopsie écho-guidée +++", "🔬 IHC : RE (score Allred)", "🔬 IHC : RP (score Allred)", "🔬 IHC : HER2 (score 0-3+)", "🔬 IHC : Ki67 (%)", "🔬 FISH HER2 si score IHC 2+"],
        analyses_opt: ["🔬 Biopsie ganglion sentinelle axillaire", "🔬 PCR Oncotype DX (si RE+/HER2-/N0)"],
        note_clinique: "IHC des 4 marqueurs OBLIGATOIRE — définit le sous-type moléculaire et le traitement"
    },
    {
        cancer_nom: "Cancer de la Prostate", sous_type: "Adénocarcinome prostatique", phase: "initial",
        analyses_obl: ["🧪 PSA total + PSA libre", "🧪 Rapport PSA libre/total", "🧪 Créatinine + ECBU", "🧪 NFS", "🧪 PAL (phosphatase alcaline)"],
        analyses_opt: ["🧪 PHI (Prostate Health Index) si PSA 4-10"],
        note_clinique: "PSA + TR (toucher rectal) = dépistage. PSA >4 ng/mL ou TR suspect → IRM prostatique"
    }
];

async function seed() {
    console.log("--- Seeding Bilan Packages (Explicit Integer Conversion) ---");
    try {
        await db.query('DELETE FROM bilan_packages');

        for (const pkg of PACKAGES) {
            const res = await db.query('SELECT id FROM ref_cancer_rules WHERE category ILIKE $1 LIMIT 1', [pkg.cancer_nom.trim()]);

            if (res.rows.length === 0) {
                console.warn(`⚠️ Could not find ID for cancer: "${pkg.cancer_nom}"`);
                continue;
            }

            const typeId = Number(res.rows[0].id);

            await db.query(`
                INSERT INTO bilan_packages (cancer_type_id, cancer_nom, sous_type, phase, analyses_obl, analyses_opt, note_clinique)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [typeId, pkg.cancer_nom, pkg.sous_type, pkg.phase, pkg.analyses_obl, pkg.analyses_opt, pkg.note_clinique]);
        }

        console.log(`✅ Successfully seeded ${PACKAGES.length} packages.`);
    } catch (error) {
        console.error("❌ Seeding Error:", error);
    } finally {
        process.exit();
    }
}

seed();
