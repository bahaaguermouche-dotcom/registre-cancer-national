const db = require('./db');

const WILAYA_CENTROIDS = {
    'Adrar': [27.87, -0.29],
    'Chlef': [36.16, 1.33],
    'Laghouat': [33.80, 2.87],
    'Oum El Bouaghi': [35.87, 7.11],
    'Batna': [35.55, 6.17],
    'Béjaïa': [36.75, 5.06],
    'Biskra': [34.85, 5.73],
    'Béchar': [31.62, -2.22],
    'Blida': [36.47, 2.83],
    'Bouira': [36.37, 3.90],
    'Tamanrasset': [22.78, 5.52],
    'Tébessa': [35.40, 8.12],
    'Tlemcen': [34.88, -1.31],
    'Tiaret': [35.37, 1.32],
    'Tizi Ouzou': [36.71, 4.05],
    'Alger': [36.75, 3.06],
    'Djelfa': [34.67, 3.25],
    'Jijel': [36.81, 5.77],
    'Sétif': [36.19, 5.41],
    'Saïda': [34.83, 0.15],
    'Skikda': [36.88, 6.91],
    'Sidi Bel Abbès': [35.19, -0.63],
    'Annaba': [36.90, 7.76],
    'Guelma': [36.46, 7.43],
    'Constantine': [36.37, 6.61],
    'Médéa': [36.26, 2.75],
    'Mostaganem': [35.93, 0.09],
    'M’Sila': [35.70, 4.54],
    'Mascara': [35.40, 0.14],
    'Ouargla': [31.95, 5.33],
    'Oran': [35.70, -0.63],
    'El Bayadh': [33.68, 1.02],
    'Illizi': [26.48, 8.47],
    'Bordj Bou Arreridj': [36.07, 4.76],
    'Boumerdès': [36.76, 3.47],
    'El Tarf': [36.77, 8.31],
    'Tindouf': [27.67, -8.13],
    'Tissemsilt': [35.61, 1.81],
    'El Oued': [33.37, 6.87],
    'Khenchela': [35.43, 7.14],
    'Souk Ahras': [36.28, 7.95],
    'Tipaza': [36.59, 2.44],
    'Mila': [36.45, 6.26],
    'Aïn Defla': [36.26, 1.97],
    'Naâma': [33.27, -0.31],
    'Aïn Témouchent': [35.30, -1.14],
    'Ghardaïa': [32.49, 3.67],
    'Relizane': [35.74, 0.55],
    'Timimoun': [29.26, 0.23],
    'Bordj Badji Mokhtar': [21.33, 0.95],
    'Ouled Djellal': [34.42, 5.06],
    'Béni Abbès': [30.13, -2.17],
    'In Salah': [27.19, 2.48],
    'In Guezzam': [19.57, 5.77],
    'Touggourt': [33.10, 6.06],
    'Djanet': [24.55, 9.48],
    'El M\'Ghair': [33.95, 5.92],
    'El Meniaa': [30.58, 2.88]
};

async function seed() {
    try {
        console.log('--- Seeding Patient Coordinates ---');
        const patientsRes = await db.query('SELECT id, wilaya_residence FROM patients WHERE latitude IS NULL');
        
        if (patientsRes.rowCount === 0) {
            console.log('ℹ️ No patients without coordinates found.');
            return;
        }

        for (const patient of patientsRes.rows) {
            const centroid = WILAYA_CENTROIDS[patient.wilaya_residence] || [36.0, 3.0]; // Default to center of Algeria if unknown
            
            // Add a small random jitter (approx 10-20km)
            const lat = centroid[0] + (Math.random() - 0.5) * 0.2;
            const lng = centroid[1] + (Math.random() - 0.5) * 0.2;
            
            await db.query('UPDATE patients SET latitude = $1, longitude = $2 WHERE id = $3', [lat, lng, patient.id]);
        }
        
        console.log(`✅ Seeded ${patientsRes.rowCount} patients.`);
    } catch (err) {
        console.error("❌ Seeding failed:", err);
    }
}

module.exports = seed;
