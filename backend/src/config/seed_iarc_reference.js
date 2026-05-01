const db = require('./db');

const cancerReference = [
    { id: 1, nom: "Cancer du Poumon", sous_type: "NSCLC — Adénocarcinome", topo: "C34.1", morpho: "M8140/3", comp: "Malin", sexe: "Both", age_min: 50, age_max: 75, spec: "Oncologue thoracique" },
    { id: 2, nom: "Cancer du Poumon", sous_type: "NSCLC — Carcinome épidermoïde", topo: "C34.1", morpho: "M8070/3", comp: "Malin", sexe: "Both", age_min: 55, age_max: 75, spec: "Oncologue thoracique" },
    { id: 3, nom: "Cancer du Poumon", sous_type: "SCLC — Carcinome à petites cellules", topo: "C34.9", morpho: "M8041/3", comp: "Malin", sexe: "Both", age_min: 55, age_max: 70, spec: "Oncologue thoracique" },
    { id: 4, nom: "Cancer du Sein", sous_type: "Carcinome canalaire invasif", topo: "C50.9", morpho: "M8500/3", comp: "Malin", sexe: "F", age_min: 40, age_max: 70, spec: "Oncologue sénologue" },
    { id: 5, nom: "Cancer du Sein", sous_type: "Carcinome lobulaire invasif", topo: "C50.9", morpho: "M8520/3", comp: "Malin", sexe: "F", age_min: 45, age_max: 75, spec: "Oncologue sénologue" },
    { id: 6, nom: "Cancer du Sein", sous_type: "Triple négatif (TNBC)", topo: "C50.9", morpho: "M8500/3", comp: "Malin", sexe: "F", age_min: 30, age_max: 50, spec: "Oncologue sénologue" },
    { id: 7, nom: "Cancer du Côlon", sous_type: "Adénocarcinome colorectal", topo: "C18.9", morpho: "M8140/3", comp: "Malin", sexe: "Both", age_min: 55, age_max: 80, spec: "Oncologue digestif" },
    { id: 8, nom: "Cancer du Rectum", sous_type: "Adénocarcinome rectal", topo: "C20", morpho: "M8140/3", comp: "Malin", sexe: "Both", age_min: 55, age_max: 75, spec: "Oncologue digestif" },
    { id: 9, nom: "Cancer de la Prostate", sous_type: "Adénocarcinome prostatique", topo: "C61", morpho: "M8140/3", comp: "Malin", sexe: "M", age_min: 60, age_max: 80, spec: "Oncologue urologique" },
    { id: 10, nom: "Cancer Col de l'Utérus", sous_type: "Carcinome épidermoïde", topo: "C53.9", morpho: "M8070/3", comp: "Malin", sexe: "F", age_min: 30, age_max: 55, spec: "Gynécologue oncologue" },
    { id: 11, nom: "Cancer de l'Utérus", sous_type: "Carcinome endométrial", topo: "C54.1", morpho: "M8380/3", comp: "Malin", sexe: "F", age_min: 55, age_max: 70, spec: "Gynécologue oncologue" },
    { id: 12, nom: "Cancer de l'Ovaire", sous_type: "Carcinome épithélial ovarien", topo: "C56", morpho: "M8441/3", comp: "Malin", sexe: "F", age_min: 50, age_max: 75, spec: "Gynécologue oncologue" },
    { id: 13, nom: "Cancer du Foie", sous_type: "Carcinome hépatocellulaire (CHC)", topo: "C22.0", morpho: "M8170/3", comp: "Malin", sexe: "Both", age_min: 50, age_max: 70, spec: "Oncologue digestif / Hépatologue" },
    { id: 14, nom: "Cancer de l'Estomac", sous_type: "Adénocarcinome gastrique", topo: "C16.9", morpho: "M8140/3", comp: "Malin", sexe: "Both", age_min: 60, age_max: 80, spec: "Oncologue digestif" },
    { id: 15, nom: "Cancer du Pancréas", sous_type: "Adénocarcinome pancréatique", topo: "C25.9", morpho: "M8140/3", comp: "Malin", sexe: "Both", age_min: 60, age_max: 80, spec: "Oncologue digestif" },
    { id: 16, nom: "Cancer Thyroïde", sous_type: "Carcinome papillaire", topo: "C73", morpho: "M8260/3", comp: "Malin", sexe: "Both", age_min: 20, age_max: 50, spec: "Endocrinologue oncologue" },
    { id: 17, nom: "Cancer Thyroïde", sous_type: "Carcinome anaplasique", topo: "C73", morpho: "M8020/3", comp: "Malin", sexe: "Both", age_min: 60, age_max: 80, spec: "Oncologue endocrinien" },
    { id: 18, nom: "Cancer de la Vessie", sous_type: "Carcinome urothélial", topo: "C67.9", morpho: "M8120/3", comp: "Malin", sexe: "Both", age_min: 60, age_max: 80, spec: "Oncologue urologique" },
    { id: 19, nom: "Cancer du Rein", sous_type: "Carcinome à cellules claires", topo: "C64", morpho: "M8310/3", comp: "Malin", sexe: "Both", age_min: 55, age_max: 75, spec: "Oncologue urologique" },
    { id: 20, nom: "Leucémie", sous_type: "Leucémie lymphoblastique aiguë (LLA)", topo: "C42.1", morpho: "M9835/3", comp: "Malin", sexe: "Both", age_min: 2, age_max: 10, spec: "Oncologue pédiatrique / Hématologue oncologue" },
    { id: 21, nom: "Leucémie", sous_type: "Leucémie myéloïde aiguë (LMA)", topo: "C42.1", morpho: "M9861/3", comp: "Malin", sexe: "Both", age_min: 60, age_max: 75, spec: "Hématologue oncologue" },
    { id: 22, nom: "Leucémie", sous_type: "Leucémie myéloïde chronique (LMC)", topo: "C42.1", morpho: "M9863/3", comp: "Malin", sexe: "Both", age_min: 45, age_max: 65, spec: "Hématologue oncologue" },
    { id: 23, nom: "Leucémie", sous_type: "Leucémie lymphoïde chronique (LLC)", topo: "C42.1", morpho: "M9823/3", comp: "Malin", sexe: "Both", age_min: 65, age_max: 80, spec: "Hématologue oncologue" },
    { id: 24, nom: "Lymphome", sous_type: "Lymphome de Hodgkin", topo: "C77.9", morpho: "M9650/3", comp: "Malin", sexe: "Both", age_min: 15, age_max: 35, spec: "Hématologue oncologue / Oncologue lymphome" },
    { id: 25, nom: "Lymphome", sous_type: "Lymphome diffus grandes cellules B (DLBCL)", topo: "C77.9", morpho: "M9680/3", comp: "Malin", sexe: "Both", age_min: 60, age_max: 75, spec: "Hématologue oncologue / Oncologue lymphome" },
    { id: 26, nom: "Lymphome", sous_type: "Lymphome folliculaire", topo: "C77.9", morpho: "M9690/3", comp: "Malin", sexe: "Both", age_min: 55, age_max: 70, spec: "Hématologue oncologue / Oncologue lymphome" },
    { id: 27, nom: "Myélome Multiple", sous_type: "Myélome à plasmocytes", topo: "C42.1", morpho: "M9732/3", comp: "Malin", sexe: "Both", age_min: 65, age_max: 75, spec: "Hématologue oncologue" },
    { id: 28, nom: "Mélanome", sous_type: "Mélanome malin cutané", topo: "C44.9", morpho: "M8720/3", comp: "Malin", sexe: "Both", age_min: 30, age_max: 60, spec: "Dermatologue oncologue" },
    { id: 29, nom: "Cancer Peau", sous_type: "Carcinome basocellulaire", topo: "C44.9", morpho: "M8090/3", comp: "Malin", sexe: "Both", age_min: 55, age_max: 80, spec: "Dermatologue oncologue" },
    { id: 30, nom: "Cancer Peau", sous_type: "Carcinome épidermoïde cutané", topo: "C44.9", morpho: "M8070/3", comp: "Malin", sexe: "Both", age_min: 60, age_max: 80, spec: "Dermatologue oncologue" },
    { id: 31, nom: "Cancer du Cerveau", sous_type: "Glioblastome (GBM)", topo: "C71.9", morpho: "M9440/3", comp: "Malin", sexe: "Both", age_min: 55, age_max: 70, spec: "Neuro-oncologue" },
    { id: 32, nom: "Cancer du Cerveau", sous_type: "Médulloblastome", topo: "C71.6", morpho: "M9470/3", comp: "Malin", sexe: "Both", age_min: 3, age_max: 10, spec: "Oncologue pédiatrique / Neuro-oncologue" },
    { id: 33, nom: "Cancer du Cerveau", sous_type: "Méningiome", topo: "C70.9", morpho: "M9530/1", comp: "Incertain", sexe: "Both", age_min: 50, age_max: 70, spec: "Neuro-oncologue" },
    { id: 34, nom: "Cancer Testicule", sous_type: "Séminome", topo: "C62.9", morpho: "M9061/3", comp: "Malin", sexe: "M", age_min: 25, age_max: 40, spec: "Oncologue urologique" },
    { id: 35, nom: "Cancer Testicule", sous_type: "Non-séminome (TGNS)", topo: "C62.9", morpho: "M9085/3", comp: "Malin", sexe: "M", age_min: 15, age_max: 35, spec: "Oncologue urologique" },
    { id: 36, nom: "Neuroblastome", sous_type: "Neuroblastome", topo: "C74.9", morpho: "M9500/3", comp: "Malin", sexe: "Both", age_min: 0, age_max: 5, spec: "Oncologue pédiatrique" },
    { id: 37, nom: "Tumeur de Wilms", sous_type: "Néphroblastome", topo: "C64", morpho: "M8960/3", comp: "Malin", sexe: "Both", age_min: 1, age_max: 5, spec: "Oncologue pédiatrique" },
    { id: 38, nom: "Rétinoblastome", sous_type: "Rétinoblastome", topo: "C69.2", morpho: "M9510/3", comp: "Malin", sexe: "Both", age_min: 0, age_max: 5, spec: "Oncologue oculaire" },
    { id: 39, nom: "Sarcome Osseux", sous_type: "Ostéosarcome", topo: "C40.9", morpho: "M9180/3", comp: "Malin", sexe: "Both", age_min: 10, age_max: 25, spec: "Oncologue sarcomes" },
    { id: 40, nom: "Sarcome Osseux", sous_type: "Sarcome d'Ewing", topo: "C41.9", morpho: "M9260/3", comp: "Malin", sexe: "Both", age_min: 10, age_max: 20, spec: "Oncologue sarcomes" },
    { id: 41, nom: "Sarcome Tissus Mous", sous_type: "Sarcome des tissus mous", topo: "C49.9", morpho: "M8800/3", comp: "Malin", sexe: "Both", age_min: 40, age_max: 70, spec: "Oncologue sarcomes" },
    { id: 42, nom: "Cancer Oesophage", sous_type: "Carcinome épidermoïde oesophagien", topo: "C15.9", morpho: "M8070/3", comp: "Malin", sexe: "Both", age_min: 60, age_max: 75, spec: "Oncologue digestif" },
    { id: 43, nom: "Cancer Oesophage", sous_type: "Adénocarcinome oesophagien", topo: "C15.9", morpho: "M8140/3", comp: "Malin", sexe: "Both", age_min: 55, age_max: 75, spec: "Oncologue digestif" },
    { id: 44, nom: "Cancer du Larynx", sous_type: "Carcinome épidermoïde laryngé", topo: "C32.9", morpho: "M8070/3", comp: "Malin", sexe: "Both", age_min: 55, age_max: 70, spec: "ORL oncologue" },
    { id: 45, nom: "Cancer de la Langue", sous_type: "Carcinome épidermoïde lingual", topo: "C02.9", morpho: "M8070/3", comp: "Malin", sexe: "Both", age_min: 50, age_max: 70, spec: "ORL oncologue" },
    { id: 46, nom: "Cancer Nasopharynx", sous_type: "Carcinome du nasopharynx (NPC)", topo: "C11.9", morpho: "M8070/3", comp: "Malin", sexe: "Both", age_min: 30, age_max: 55, spec: "ORL oncologue" },
    { id: 47, nom: "Cancer Glande Salivaire", sous_type: "Carcinome adénoïde kystique", topo: "C07", morpho: "M8200/3", comp: "Malin", sexe: "Both", age_min: 40, age_max: 60, spec: "ORL oncologue" },
    { id: 48, nom: "Cancer Vesicule Biliaire", sous_type: "Adénocarcinome vésiculaire", topo: "C23", morpho: "M8140/3", comp: "Malin", sexe: "Both", age_min: 60, age_max: 80, spec: "Oncologue digestif" },
    { id: 49, nom: "Mesotheliome", sous_type: "Mésothéliome pleural malin", topo: "C45.0", morpho: "M9050/3", comp: "Malin", sexe: "Both", age_min: 60, age_max: 80, spec: "Oncologue thoracique" },
    { id: 50, nom: "Cancer Surrenales", sous_type: "Carcinome corticosurrénalien", topo: "C74.0", morpho: "M8370/3", comp: "Malin", sexe: "Both", age_min: 40, age_max: 60, spec: "Endocrinologue oncologue" },
    { id: 51, nom: "Cancer Anal", sous_type: "Carcinome épidermoïde anal", topo: "C21.1", morpho: "M8070/3", comp: "Malin", sexe: "Both", age_min: 55, age_max: 70, spec: "Oncologue digestif" },
    { id: 52, nom: "Cancer du Penis", sous_type: "Carcinome épidermoïde pénien", topo: "C60.9", morpho: "M8070/3", comp: "Malin", sexe: "M", age_min: 60, age_max: 80, spec: "Oncologue urologique" },
    { id: 53, nom: "Cancer Vaginal", sous_type: "Carcinome épidermoïde vaginal", topo: "C52", morpho: "M8070/3", comp: "Malin", sexe: "F", age_min: 60, age_max: 80, spec: "Gynécologue oncologue" },
    { id: 54, nom: "Cancer Vulvaire", sous_type: "Carcinome épidermoïde vulvaire", topo: "C51.9", morpho: "M8070/3", comp: "Malin", sexe: "F", age_min: 65, age_max: 80, spec: "Gynécologue oncologue" },
    { id: 55, nom: "Tumeur Pineale", sous_type: "Germinome / Pinéalome", topo: "C75.3", morpho: "M9064/3", comp: "Malin", sexe: "Both", age_min: 10, age_max: 25, spec: "Neuro-oncologue" },
    { id: 56, nom: "Tumeur Carcinoide", sous_type: "Tumeur neuroendocrine (TNE)", topo: "C18.9", morpho: "M8240/3", comp: "Malin", sexe: "Both", age_min: 50, age_max: 70, spec: "Oncologue digestif / Endocrinologue" },
    { id: 57, nom: "Cancer Parathyroide", sous_type: "Carcinome parathyroïdien", topo: "C75.0", morpho: "M8140/3", comp: "Malin", sexe: "Both", age_min: 45, age_max: 65, spec: "Endocrinologue oncologue" },
    { id: 58, nom: "Cancer du Thymus", sous_type: "Thymome / Carcinome thymique", topo: "C37", morpho: "M8580/3", comp: "Malin", sexe: "Both", age_min: 40, age_max: 60, spec: "Oncologue thoracique" }
];

async function seed() {
    try {
        console.log("Cleaning old reference rules...");
        await db.query('DELETE FROM ref_cancer_rules');

        console.log(`Seeding ${cancerReference.length} IARC/OMS entries...`);
        for (const entry of cancerReference) {
            await db.query(`
                INSERT INTO ref_cancer_rules (
                    category, sub_type, icdo3_topography, icdo3_morphology, 
                    allowed_gender, min_age, max_age, specialty
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [
                    entry.nom, entry.sous_type, entry.topo, entry.morpho,
                    entry.sexe, entry.age_min, entry.age_max, entry.spec
                ]
            );
        }
        console.log("Seeding completed successfully!");
    } catch (error) {
        console.error("Seeding Error:", error);
    } finally {
        process.exit();
    }
}

seed();
