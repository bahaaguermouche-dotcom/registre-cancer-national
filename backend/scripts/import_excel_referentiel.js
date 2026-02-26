const xlsx = require('xlsx');
const db = require('../src/config/db');
const path = require('path');

const EXCEL_PATH = path.join(__dirname, '..', '..', 'MYprojet', 'Referentiel_Cancers_v2_Complet.xlsx');

const parseAge = (ageStr) => {
    if (!ageStr) return { min: 0, max: 120 };
    const match = ageStr.match(/(\d+)\D+(\d+)/);
    if (match) return { min: parseInt(match[1]), max: parseInt(match[2]) };
    const singleMatch = ageStr.match(/<|>\s*(\d+)/);
    if (singleMatch) {
        if (ageStr.includes('<')) return { min: 0, max: parseInt(singleMatch[1]) };
        if (ageStr.includes('>')) return { min: parseInt(singleMatch[1]), max: 120 };
    }
    return { min: 0, max: 120 };
};

const parseGender = (genderStr) => {
    if (!genderStr) return null;
    const s = genderStr.toLowerCase();
    if (s.includes('h uniquement') || s.includes('h > f')) return 'Male';
    if (s.includes('f uniquement') || s.includes('f > h') || s.includes('f (99%)')) return 'Female';
    return null; // Both
};

const importData = async () => {
    try {
        console.log('Reading Excel:', EXCEL_PATH);
        const workbook = xlsx.readFile(EXCEL_PATH);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1 });

        // Skip manual headers (found at row 3 in analysis)
        const rows = rawData.slice(3);
        console.log(`Processing ${rows.length} rows...`);

        await db.query('DELETE FROM ref_cancer_rules');

        for (const row of rows) {
            if (!row[1]) continue; // Skip empty rows

            const category = row[1];
            const subType = row[2];
            const icd10 = row[3];
            const gender = parseGender(row[4]);
            const { min: ageMin, max: ageMax } = parseAge(row[5]);
            const specialty = row[6];
            const frequency = row[9];
            const isRare = frequency ? frequency.toLowerCase().includes('rare') : false;

            const query = `
                INSERT INTO ref_cancer_rules (
                    category, sub_type, icd10, allowed_gender, 
                    min_age, max_age, specialty, frequency, is_rare_flag
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `;
            const values = [category, subType, icd10, gender, ageMin, ageMax, specialty, frequency, isRare];
            await db.query(query, values);
        }

        console.log('✅ Success: Cancer reference imported.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Import Failed:', error);
        process.exit(1);
    }
};

importData();
