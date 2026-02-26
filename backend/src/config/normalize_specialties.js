const db = require('./db');

const mapping = {
    'digestif': 'Gastro-entérologie',
    'gastro': 'Gastro-entérologie',
    'pneu': 'Pneumologie',
    'thora': 'Pneumologie', // Or Chirurgie Thoracique but Pneumo is more common for initial assignment
    'sénologue': 'Gynécologie',
    'gyn': 'Gynécologie',
    'uro': 'Urologie',
    'derm': 'Dermatologie',
    'neur': 'Neurologie',
    'hémat': 'Hématologie',
    'pédiat': 'Pédiatrie',
    'orl': 'ORL (Oto-Rhino-Laryngologie)',
    'endocrin': 'Endocrinologie',
    'nasopharynx': 'ORL (Oto-Rhino-Laryngologie)'
};

async function normalize() {
    try {
        console.log('--- Normalizing ref_cancer_rules specialties ---');
        const rules = await db.query('SELECT id, specialty FROM ref_cancer_rules');

        for (const rule of rules.rows) {
            if (!rule.specialty) continue;

            const lowSpec = rule.specialty.toLowerCase();
            let matched = false;

            for (const [key, standard] in Object.entries(mapping)) {
                // We use entries but I need key and standard. Object.entries returns [key, value]
            }

            // Correction of loop
            for (const [key, standard] of Object.entries(mapping)) {
                if (lowSpec.includes(key)) {
                    await db.query('UPDATE ref_cancer_rules SET specialty = $1 WHERE id = $2', [standard, rule.id]);
                    matched = true;
                    break;
                }
            }

            if (!matched) {
                // If no specific match, default to General Oncology
                await db.query('UPDATE ref_cancer_rules SET specialty = $1 WHERE id = $2', ['Oncologie Médicale', rule.id]);
            }
        }

        console.log('✅ Normalization complete.');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

normalize();
