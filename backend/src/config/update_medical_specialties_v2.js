const db = require('./db');

async function updateSpecialties() {
    console.log("--- Updating Medical Specialties Taxonomy (v3) ---");
    try {
        const mappings = [
            // Hematology
            ["Hématologue oncologue", ["Leucémie", "Lymphome", "Myélome Multiple"]],
            // Digestive
            ["Oncologue digestif / Gastro-oncologue", ["Cancer du Côlon", "Cancer du Rectum", "Cancer de l'Estomac", "Cancer du Foie", "Cancer du Pancréas", "Cancer Œsophage", "Cancer Vésicule Biliaire"]],
            // Urology
            ["Oncologue urologique / Uo-oncologue", ["Cancer de la Prostate", "Cancer de la Vessie", "Cancer du Rein", "Cancer Testicule", "Cancer du Pénis"]],
            // Breast
            ["Oncologue sénologue", ["Cancer du Sein"]],
            // Gynecology
            ["Gynécologue oncologue", ["Cancer Col de l'Utérus", "Cancer de l'Ovaire", "Cancer de l'Utérus", "Cancer Vulvaire", "Cancer Vaginal"]],
            // Thoracic
            ["Oncologue thoracique / Pneumo-oncologue", ["Cancer du Poumon", "Mésothéliome", "Cancer du Thymus"]],
            // ORL
            ["ORL oncologue", ["Cancer du Larynx", "Cancer Nasopharynx", "Cancer de la Langue", "Cancer Glande Salivaire"]],
            // Dermato
            ["Dermatologue oncologue", ["Mélanome", "Cancer Peau"]],
            // Neuro
            ["Neuro-oncologue", ["Cancer du Cerveau", "Tumeur Pinéale"]],
            // Pediatric
            ["Oncologue pédiatrique", ["Neuroblastome", "Tumeur de Wilms", "Rétinoblastome"]],
            // Sarcoma
            ["Oncologue sarcomes", ["Sarcome Osseux", "Sarcome Tissus Mous"]],
            // Endocrine
            ["Endocrinologue oncologue", ["Cancer Thyroïde", "Cancer Parathyroïde", "Cancer Surrénales"]]
        ];

        // 1. Update rules based on categories
        for (const [newVal, categories] of mappings) {
            await db.query("UPDATE ref_cancer_rules SET specialty = $1 WHERE category = ANY($2)", [newVal, categories]);
        }

        // 2. Default remaining to Oncologue médical
        await db.query("UPDATE ref_cancer_rules SET specialty = 'Oncologue médical' WHERE specialty IS NULL OR specialty = ''");

        // 3. Update existing doctor specialties to new professional titles
        const doctorMappings = [
            ["Oncologue médical", "Oncologie Médicale"],
            ["Radiothérapeute (Radio-oncologue)", "Oncologie Radiothérapie"],
            ["Chirurgien oncologue", "Chirurige Oncologique"],
            ["Hématologue oncologue", "Hématologie"],
            ["Oncologue thoracique / Pneumo-oncologue", "Pneumologie"],
            ["Oncologue digestif / Gastro-oncologue", "Gastro-entérologie"],
            ["Gynécologue oncologue", "Gynécologie"],
            ["Oncologue urologique / Uro-oncologue", "Urologie"],
            ["Dermatologue oncologue", "Dermatologie"],
            ["Neuro-oncologue", "Neurologie"],
            ["Oncologue pédiatrique", "Pédiatrie"],
            ["ORL oncologue", "ORL (Oto-Rhino-Laryngologie)"],
            ["Endocrinologue oncologue", "Endocrinologie"],
            ["Médecin nucléaire", "Médecine Nucléaire"]
        ];

        for (const [newVal, oldVal] of doctorMappings) {
            await db.query("UPDATE users SET specialty = $1 WHERE specialty = $2", [newVal, oldVal]);
        }

        console.log("✅ Specialties taxonomy (v3) updated successfully!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Update failed:", error);
        process.exit(1);
    }
}

updateSpecialties();
