// Force IPv4 globally — Render free tier blocks outbound IPv6 connections
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

// Bypasses self-signed certificate issues for remote DBs (like Supabase) in production
if (process.env.DATABASE_URL && 
    !process.env.DATABASE_URL.includes('localhost') && 
    !process.env.DATABASE_URL.includes('127.0.0.1')) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./config/db');
const { sendInvitationEmail, sendLabResultNotification } = require('./services/mailService');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

console.log('--- Config Check ---');
console.log(`Port: ${PORT}`);
console.log(`JWT Secret Loaded: ${JWT_SECRET !== 'fallback_secret' ? 'YES (Masked: ' + JWT_SECRET.substring(0, 3) + '...)' : 'NO (Using Fallback)'}`);
console.log('--------------------');

// Middleware
app.use(helmet({
    crossOriginResourcePolicy: false,
}));
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// --- AUDIT & RISK ZONES SYSTEM ---
(async () => {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id SERIAL PRIMARY KEY,
                user_id UUID,
                user_name VARCHAR(255),
                user_role VARCHAR(100),
                action VARCHAR(255) NOT NULL,
                resource_type VARCHAR(100),
                resource_id VARCHAR(100),
                details JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        await db.query(`
            CREATE TABLE IF NOT EXISTS risk_zones (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                geometry JSONB NOT NULL,
                description TEXT,
                severity INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Migration for patient coordinates
        await db.query(`
            ALTER TABLE patients 
            ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
            ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION
        `);

        // Trigger coordinate seeding
        const seedCoordinates = require('./config/seed_patient_coordinates');
        await seedCoordinates();

        await db.query(`
            CREATE TABLE IF NOT EXISTS ignored_duplicates (
                id SERIAL PRIMARY KEY,
                patient_id_1 UUID NOT NULL,
                patient_id_2 UUID NOT NULL,
                ignored_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                ignored_by UUID,
                UNIQUE(patient_id_1, patient_id_2)
            );
        `);

        // Fix for Merge Conflict: Ensure the index for ON CONFLICT exists
        await db.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS idx_phl_unique_patient_hosp_cancer 
            ON patient_hospital_links (patient_id, hospital_id, LOWER(cancer_type));
        `);

        // --- CANCER DIAGNOSIS & BODY MAP TABLES ---
        await db.query(`
            CREATE TABLE IF NOT EXISTS ref_topography_map (
                id SERIAL PRIMARY KEY,
                topography_code VARCHAR(10) UNIQUE NOT NULL,
                label_fr VARCHAR(200) NOT NULL,
                body_region VARCHAR(50) NOT NULL,
                organ VARCHAR(100) NOT NULL,
                organ_zone VARCHAR(100),
                side VARCHAR(20) DEFAULT 'both'
            );
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS cancer_diagnoses (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
                topography_code VARCHAR(10),
                morphology_code VARCHAR(10),
                tnm_t VARCHAR(10),
                tnm_n VARCHAR(10),
                tnm_m VARCHAR(10),
                stade_global VARCHAR(10),
                grade VARCHAR(50),
                lateralite VARCHAR(20),
                body_region VARCHAR(50),
                organ VARCHAR(100),
                organ_zone VARCHAR(100),
                diagnosed_by UUID REFERENCES users(id),
                diagnosis_date DATE DEFAULT CURRENT_DATE,
                notes TEXT,
                lab_request_id UUID REFERENCES lab_requests(id) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Seed basic topography maps if empty
        const mapCheck = await db.query('SELECT count(*) FROM ref_topography_map');
        if (parseInt(mapCheck.rows[0].count) === 0) {
            await db.query(`
                INSERT INTO ref_topography_map (topography_code, label_fr, body_region, organ, organ_zone, side) VALUES
                ('C34', 'Poumon, SAI', 'thorax', 'poumon', NULL, 'both'),
                ('C34.1', 'Lobe supérieur du poumon', 'thorax', 'poumon', 'lobe_superieur', 'both'),
                ('C34.2', 'Lobe moyen du poumon', 'thorax', 'poumon', 'lobe_moyen', 'right'),
                ('C34.3', 'Lobe inférieur du poumon', 'thorax', 'poumon', 'lobe_inferieur', 'both'),
                ('C50', 'Sein, SAI', 'thorax', 'sein', NULL, 'both'),
                ('C50.4', 'Quadrant supéro-externe du sein', 'thorax', 'sein', 'quadrant_supero_externe', 'both'),
                ('C18', 'Côlon', 'abdomen', 'colon', NULL, 'na'),
                ('C18.2', 'Côlon ascendant', 'abdomen', 'colon', 'colon_ascendant', 'na'),
                ('C61', 'Prostate', 'pelvis', 'prostate', NULL, 'na'),
                ('C73', 'Glande thyroïde', 'tete_cou', 'thyroide', NULL, 'na'),
                ('C16', 'Estomac', 'abdomen', 'estomac', NULL, 'na')
            `);
        }

        // Ensure ref_cancer_rules exists and seed it with IARC rules if empty
        await db.query(`
            CREATE TABLE IF NOT EXISTS ref_cancer_rules (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                category TEXT NOT NULL,
                icd_o_code TEXT,
                min_age INT DEFAULT 0,
                max_age INT DEFAULT 120,
                allowed_gender VARCHAR(10),
                specialty TEXT,
                is_rare_flag BOOLEAN DEFAULT FALSE,
                sub_type TEXT,
                icd10 TEXT,
                icdo3_topography TEXT,
                icdo3_morphology TEXT,
                frequency TEXT,
                topography_code_regex TEXT,
                morphology_code_regex TEXT,
                is_rare BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        const rulesCheck = await db.query('SELECT count(*) FROM ref_cancer_rules');
        if (parseInt(rulesCheck.rows[0].count) === 0) {
            console.log("Seeding ref_cancer_rules with 58 IARC oncology rules...");
            const cancerReference = [
                { nom: "Cancer du Poumon", sous_type: "NSCLC — Adénocarcinome", topo: "C34.1", morpho: "M8140/3", comp: "Malin", sexe: "Both", age_min: 50, age_max: 75, spec: "Oncologue thoracique" },
                { nom: "Cancer du Poumon", sous_type: "NSCLC — Carcinome épidermoïde", topo: "C34.1", morpho: "M8070/3", comp: "Malin", sexe: "Both", age_min: 55, age_max: 75, spec: "Oncologue thoracique" },
                { nom: "Cancer du Poumon", sous_type: "SCLC — Carcinome à petites cellules", topo: "C34.9", morpho: "M8041/3", comp: "Malin", sexe: "Both", age_min: 55, age_max: 70, spec: "Oncologue thoracique" },
                { nom: "Cancer du Sein", sous_type: "Carcinome canalaire invasif", topo: "C50.9", morpho: "M8500/3", comp: "Malin", sexe: "F", age_min: 40, age_max: 70, spec: "Oncologue sénologue" },
                { nom: "Cancer du Sein", sous_type: "Carcinome lobulaire invasif", topo: "C50.9", morpho: "M8520/3", comp: "Malin", sexe: "F", age_min: 45, age_max: 75, spec: "Oncologue sénologue" },
                { nom: "Cancer du Sein", sous_type: "Triple négatif (TNBC)", topo: "C50.9", morpho: "M8500/3", comp: "Malin", sexe: "F", age_min: 30, age_max: 50, spec: "Oncologue sénologue" },
                { nom: "Cancer du Côlon", sous_type: "Adénocarcinome colorectal", topo: "C18.9", morpho: "M8140/3", comp: "Malin", sexe: "Both", age_min: 55, age_max: 80, spec: "Oncologue digestif" },
                { nom: "Cancer du Rectum", sous_type: "Adénocarcinome rectal", topo: "C20", morpho: "M8140/3", comp: "Malin", sexe: "Both", age_min: 55, age_max: 75, spec: "Oncologue digestif" },
                { nom: "Cancer de la Prostate", sous_type: "Adénocarcinome prostatique", topo: "C61", morpho: "M8140/3", comp: "Malin", sexe: "M", age_min: 60, age_max: 80, spec: "Oncologue urologique" },
                { nom: "Cancer Col de l'Utérus", sous_type: "Carcinome épidermoïde", topo: "C53.9", morpho: "M8070/3", comp: "Malin", sexe: "F", age_min: 30, age_max: 55, spec: "Gynécologue oncologue" },
                { nom: "Cancer de l'Utérus", sous_type: "Carcinome endométrial", topo: "C54.1", morpho: "M8380/3", comp: "Malin", sexe: "F", age_min: 55, age_max: 70, spec: "Gynécologue oncologue" },
                { nom: "Cancer de l'Ovaire", sous_type: "Carcinome épithélial ovarien", topo: "C56", morpho: "M8441/3", comp: "Malin", sexe: "F", age_min: 50, age_max: 75, spec: "Gynécologue oncologue" },
                { nom: "Cancer du Foie", sous_type: "Carcinome hépatocellulaire (CHC)", topo: "C22.0", morpho: "M8170/3", comp: "Malin", sexe: "Both", age_min: 50, age_max: 70, spec: "Oncologue digestif / Hépatologue" },
                { nom: "Cancer de l'Estomac", sous_type: "Adénocarcinome gastrique", topo: "C16.9", morpho: "M8140/3", comp: "Malin", sexe: "Both", age_min: 60, age_max: 80, spec: "Oncologue digestif" },
                { nom: "Cancer du Pancréas", sous_type: "Adénocarcinome pancréatique", topo: "C25.9", morpho: "M8140/3", comp: "Malin", sexe: "Both", age_min: 60, age_max: 80, spec: "Oncologue digestif" },
                { nom: "Cancer Thyroïde", sous_type: "Carcinome papillaire", topo: "C73", morpho: "M8260/3", comp: "Malin", sexe: "Both", age_min: 20, age_max: 50, spec: "Endocrinologue oncologue" },
                { nom: "Cancer Thyroïde", sous_type: "Carcinome anaplasique", topo: "C73", morpho: "M8020/3", comp: "Malin", sexe: "Both", age_min: 60, age_max: 80, spec: "Oncologue endocrinien" },
                { nom: "Cancer de la Vessie", sous_type: "Carcinome urothélial", topo: "C67.9", morpho: "M8120/3", comp: "Malin", sexe: "Both", age_min: 60, age_max: 80, spec: "Oncologue urologique" },
                { nom: "Cancer du Rein", sous_type: "Carcinome à cellules claires", topo: "C64", morpho: "M8310/3", comp: "Malin", sexe: "Both", age_min: 55, age_max: 75, spec: "Oncologue urologique" },
                { nom: "Leucémie", sous_type: "Leucémie lymphoblastique aiguë (LLA)", topo: "C42.1", morpho: "M9835/3", comp: "Malin", sexe: "Both", age_min: 2, age_max: 10, spec: "Oncologue pédiatrique / Hématologue oncologue" },
                { nom: "Leucémie", sous_type: "Leucémie myéloïde aiguë (LMA)", topo: "C42.1", morpho: "M9861/3", comp: "Malin", sexe: "Both", age_min: 60, age_max: 75, spec: "Hématologue oncologue" },
                { nom: "Leucémie", sous_type: "Leucémie myéloïde chronique (LMC)", topo: "C42.1", morpho: "M9863/3", comp: "Malin", sexe: "Both", age_min: 45, age_max: 65, spec: "Hématologue oncologue" },
                { nom: "Leucémie", sous_type: "Leucémie lymphoïde chronique (LLC)", topo: "C42.1", morpho: "M9823/3", comp: "Malin", sexe: "Both", age_min: 65, age_max: 80, spec: "Hématologue oncologue" },
                { nom: "Lymphome", sous_type: "Lymphome de Hodgkin", topo: "C77.9", morpho: "M9650/3", comp: "Malin", sexe: "Both", age_min: 15, age_max: 35, spec: "Hématologue oncologue / Oncologue lymphome" },
                { nom: "Lymphome", sous_type: "Lymphome diffus grandes cellules B (DLBCL)", topo: "C77.9", morpho: "M9680/3", comp: "Malin", sexe: "Both", age_min: 60, age_max: 75, spec: "Hématologue oncologue / Oncologue lymphome" },
                { nom: "Lymphome", sous_type: "Lymphome folliculaire", topo: "C77.9", morpho: "M9690/3", comp: "Malin", sexe: "Both", age_min: 55, age_max: 70, spec: "Hématologue oncologue / Oncologue lymphome" },
                { nom: "Myélome Multiple", sous_type: "Myélome à plasmocytes", topo: "C42.1", morpho: "M9732/3", comp: "Malin", sexe: "Both", age_min: 65, age_max: 75, spec: "Hématologue oncologue" },
                { nom: "Mélanome", sous_type: "Mélanome malin cutané", topo: "C44.9", morpho: "M8720/3", comp: "Malin", sexe: "Both", age_min: 30, age_max: 60, spec: "Dermatologue oncologue" },
                { nom: "Cancer Peau", sous_type: "Carcinome basocellulaire", topo: "C44.9", morpho: "M8090/3", comp: "Malin", sexe: "Both", age_min: 55, age_max: 80, spec: "Dermatologue oncologue" },
                { nom: "Cancer Peau", sous_type: "Carcinome épidermoïde cutané", topo: "C44.9", morpho: "M8070/3", comp: "Malin", sexe: "Both", age_min: 60, age_max: 80, spec: "Dermatologue oncologue" },
                { nom: "Cancer du Cerveau", sous_type: "Glioblastome (GBM)", topo: "C71.9", morpho: "M9440/3", comp: "Malin", sexe: "Both", age_min: 55, age_max: 70, spec: "Neuro-oncologue" },
                { nom: "Cancer du Cerveau", sous_type: "Médulloblastome", topo: "C71.6", morpho: "M9470/3", comp: "Malin", sexe: "Both", age_min: 3, age_max: 10, spec: "Oncologue pédiatrique / Neuro-oncologue" },
                { nom: "Cancer du Cerveau", sous_type: "Méningiome", topo: "C70.9", morpho: "M9530/1", comp: "Incertain", sexe: "Both", age_min: 50, age_max: 70, spec: "Neuro-oncologue" },
                { nom: "Cancer Testicule", sous_type: "Séminome", topo: "C62.9", morpho: "M9061/3", comp: "Malin", sexe: "M", age_min: 25, age_max: 40, spec: "Oncologue urologique" },
                { nom: "Cancer Testicule", sous_type: "Non-séminome (TGNS)", topo: "C62.9", morpho: "M9085/3", comp: "Malin", sexe: "M", age_min: 15, age_max: 35, spec: "Oncologue urologique" },
                { nom: "Neuroblastome", sous_type: "Neuroblastome", topo: "C74.9", morpho: "M9500/3", comp: "Malin", sexe: "Both", age_min: 0, age_max: 5, spec: "Oncologue pédiatrique" },
                { nom: "Tumeur de Wilms", sous_type: "Néphroblastome", topo: "C64", morpho: "M8960/3", comp: "Malin", sexe: "Both", age_min: 1, age_max: 5, spec: "Oncologue pédiatrique" },
                { nom: "Rétinoblastome", sous_type: "Rétinoblastome", topo: "C69.2", morpho: "M9510/3", comp: "Malin", sexe: "Both", age_min: 0, age_max: 5, spec: "Oncologue oculaire" },
                { nom: "Sarcome Osseux", sous_type: "Ostéosarcome", topo: "C40.9", morpho: "M9180/3", comp: "Malin", sexe: "Both", age_min: 10, age_max: 25, spec: "Oncologue sarcomes" },
                { nom: "Sarcome Osseux", sous_type: "Sarcome d'Ewing", topo: "C41.9", morpho: "M9260/3", comp: "Malin", sexe: "Both", age_min: 10, age_max: 20, spec: "Oncologue sarcomes" },
                { nom: "Sarcome Tissus Mous", sous_type: "Sarcome des tissus mous", topo: "C49.9", morpho: "M8800/3", comp: "Malin", sexe: "Both", age_min: 40, age_max: 70, spec: "Oncologue sarcomes" },
                { nom: "Cancer Oesophage", sous_type: "Carcinome épidermoïde oesophagien", topo: "C15.9", morpho: "M8070/3", comp: "Malin", sexe: "Both", age_min: 60, age_max: 75, spec: "Oncologue digestif" },
                { nom: "Cancer Oesophage", sous_type: "Adénocarcinome oesophagien", topo: "C15.9", morpho: "M8140/3", comp: "Malin", sexe: "Both", age_min: 55, age_max: 75, spec: "Oncologue digestif" },
                { nom: "Cancer du Larynx", sous_type: "Carcinome épidermoïde laryngé", topo: "C32.9", morpho: "M8070/3", comp: "Malin", sexe: "Both", age_min: 55, age_max: 70, spec: "ORL oncologue" },
                { nom: "Cancer de la Langue", sous_type: "Carcinome épidermoïde lingual", topo: "C02.9", morpho: "M8070/3", comp: "Malin", sexe: "Both", age_min: 50, age_max: 70, spec: "ORL oncologue" },
                { nom: "Cancer Nasopharynx", sous_type: "Carcinome du nasopharynx (NPC)", topo: "C11.9", morpho: "M8070/3", comp: "Malin", sexe: "Both", age_min: 30, age_max: 55, spec: "ORL oncologue" },
                { nom: "Cancer Glande Salivaire", sous_type: "Carcinome adénoïde kystique", topo: "C07", morpho: "M8200/3", comp: "Malin", sexe: "Both", age_min: 40, age_max: 60, spec: "ORL oncologue" },
                { nom: "Cancer Vesicule Biliaire", sous_type: "Adénocarcinome vésiculaire", topo: "C23", morpho: "M8140/3", comp: "Malin", sexe: "Both", age_min: 60, age_max: 80, spec: "Oncologue digestif" },
                { nom: "Mesotheliome", sous_type: "Mésothéliome pleural malin", topo: "C45.0", morpho: "M9050/3", comp: "Malin", sexe: "Both", age_min: 60, age_max: 80, spec: "Oncologue thoracique" },
                { nom: "Cancer Surrenales", sous_type: "Carcinome corticosurrénalien", topo: "C74.0", morpho: "M8370/3", comp: "Malin", sexe: "Both", age_min: 40, age_max: 60, spec: "Endocrinologue oncologue" },
                { nom: "Cancer Anal", sous_type: "Carcinome épidermoïde anal", topo: "C21.1", morpho: "M8070/3", comp: "Malin", sexe: "Both", age_min: 55, age_max: 70, spec: "Oncologue digestif" },
                { nom: "Cancer du Penis", sous_type: "Carcinome épidermoïde pénien", topo: "C60.9", morpho: "M8070/3", comp: "Malin", sexe: "M", age_min: 60, age_max: 80, spec: "Oncologue urologique" },
                { nom: "Cancer Vaginal", sous_type: "Carcinome épidermoïde vaginal", topo: "C52", morpho: "M8070/3", comp: "Malin", sexe: "F", age_min: 60, age_max: 80, spec: "Gynécologue oncologue" },
                { nom: "Cancer Vulvaire", sous_type: "Carcinome épidermoïde vulvaire", topo: "C51.9", morpho: "M8070/3", comp: "Malin", sexe: "F", age_min: 65, age_max: 80, spec: "Gynécologue oncologue" },
                { nom: "Tumeur Pineale", sous_type: "Germinome / Pinéalome", topo: "C75.3", morpho: "M9064/3", comp: "Malin", sexe: "Both", age_min: 10, age_max: 25, spec: "Neuro-oncologue" },
                { nom: "Tumeur Carcinoide", sous_type: "Tumeur neuroendocrine (TNE)", topo: "C18.9", morpho: "M8240/3", comp: "Malin", sexe: "Both", age_min: 50, age_max: 70, spec: "Oncologue digestif / Endocrinologue" },
                { nom: "Cancer Parathyroide", sous_type: "Carcinome parathyroïdien", topo: "C75.0", morpho: "M8140/3", comp: "Malin", sexe: "Both", age_min: 45, age_max: 65, spec: "Endocrinologue oncologue" },
                { nom: "Cancer du Thymus", sous_type: "Thymome / Carcinome thymique", topo: "C37", morpho: "M8580/3", comp: "Malin", sexe: "Both", age_min: 40, age_max: 60, spec: "Oncologue thoracique" }
            ];

            for (const entry of cancerReference) {
                let allowed_gender = null;
                if (entry.sexe === 'M') {
                    allowed_gender = 'Male';
                } else if (entry.sexe === 'F') {
                    allowed_gender = 'Female';
                }
                const specialty = JSON.stringify(entry.spec.split(' / ').map(s => s.trim()));
                
                await db.query(`
                    INSERT INTO ref_cancer_rules (
                        category, sub_type, topography_code_regex, morphology_code_regex, 
                        icd10, min_age, max_age, allowed_gender, specialty, is_rare
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                `, [
                    entry.nom, entry.sous_type, entry.topo, entry.morpho, 
                    entry.topo, entry.age_min, entry.age_max, allowed_gender, specialty, false
                ]);
            }
            console.log("✅ Successfully seeded 58 IARC reference cancer rules!");
        }

        console.log("✅ Systèmes de Sécurité, Zones à Risque, Géolocalisation, Doublons et Body Map Prêts");
    } catch (err) {
        console.error("Initialization failed", err);
    }
})();

const logAudit = async (userId, userName, userRole, action, resourceType, resourceId, details) => {
    try {
        await db.query(`
            INSERT INTO audit_logs (user_id, user_name, user_role, action, resource_type, resource_id, details)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [userId, userName, userRole, action, resourceType, resourceId, JSON.stringify(details || {})]);
    } catch (err) {
        console.error("Failed to write audit log:", err);
    }
};
// --------------------------

// Multer Storage Configuration - Using Memory Storage for BYTEA migration
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 } // 20MB limit
});

// Auth & Registration Routes
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email et mot de passe requis." });
    }

    try {
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({ error: "Identifiants invalides." });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({ error: "Identifiants invalides." });
        }

        if (user.status === 'pending') {
            return res.status(403).json({ error: "Votre compte est en attente d'approbation par l'administrateur." });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, location: user.location, name: user.name, workplace_id: user.workplace_id, workplace_type: user.workplace_type },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        // LOG ACTION
        await logAudit(user.id, user.name, user.role, 'LOGIN', 'SYSTEM', null, { ip: req.ip });

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                location: user.location,
                workplace_id: user.workplace_id,
                workplace_type: user.workplace_type
            }
        });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ error: "Erreur lors de la connexion." });
    }
});

app.post('/api/auth/register', async (req, res) => {
    const { name, email, phone, password, role, location, hospitalName, specialty, lab_type, lab_activities, workplaceId, workplaceType } = req.body;

    if (!name || !email || !password || !role || !location) {
        return res.status(400).json({ error: "Tous les champs obligatoires sont requis." });
    }

    try {
        const passwordHash = await bcrypt.hash(password, 10);

        // Avoid duplicate hospital name if already present in location
        let finalLocation = location;
        if (hospitalName && !location.includes(hospitalName)) {
            finalLocation = `${location} - ${hospitalName}`;
        }

        const query = `
            INSERT INTO users (name, email, role, location, status, password_hash, specialty, lab_type, lab_activities, workplace_id, workplace_type)
            VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7, $8, $9, $10)
            RETURNING id, name, email, role;
        `;

        // Handle specialty: if array, stringify for DB or store as JSONB if supported
        const finalSpecialty = Array.isArray(specialty) ? JSON.stringify(specialty) : specialty;

        const values = [
            name,
            email,
            role,
            finalLocation.trim(),
            passwordHash,
            finalSpecialty || null,
            role === 'Laboratoire' ? lab_type : null,
            role === 'Laboratoire' ? lab_activities : null,
            workplaceId || null,
            workplaceType || 'hospital'
        ];

        const result = await db.query(query, values);
        res.status(201).json({ success: true, user: result.rows[0] });
    } catch (error) {
        console.error("Registration Error:", error);
        if (error.code === '23505') {
            return res.status(400).json({ error: "Cet email est déjà utilisé." });
        }
        res.status(500).json({ error: "Erreur lors de l'inscription." });
    }
});

// GET /api/audit-logs - Security Audit Trail endpoint
app.get('/api/audit-logs', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Non autorisé" });

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        // Only National Admin or Director can view logs
        if (!decoded.role.includes('Administrateur National') && !decoded.role.includes('Directeur')) {
            return res.status(403).json({ error: "Accès refusé. Niveau d'habilitation insuffisant." });
        }

        const result = await db.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 200');
        res.json(result.rows);
    } catch (error) {
        console.error("Fetch Audit Logs Error:", error);
        res.status(500).json({ error: "Erreur serveur lors de la récupération de la trace d'audit." });
    }
});

// User Management Routes
app.get('/api/users', async (req, res) => {
    try {
        const result = await db.query('SELECT id, name, email, role, location, status, specialty, lab_type, lab_activities, workplace_id, workplace_type, created_at FROM users ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        console.error("Fetch Users Error:", error);
        res.status(500).json({ error: "Erreur lors de la récupération des utilisateurs." });
    }
});

app.patch('/api/users/:id/approve', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query('UPDATE users SET status = \'active\' WHERE id = $1 RETURNING id, name, status', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Utilisateur non trouvé." });
        }
        res.json({ success: true, user: result.rows[0] });
    } catch (error) {
        console.error("Approval Error:", error);
        res.status(500).json({ error: "Erreur lors de l'approbation." });
    }
});

app.delete('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ error: "Non autorisé." });
    }

    const token = authHeader.split(' ')[1];
    try {
        let decoded;
        try {
            decoded = jwt.verify(token, JWT_SECRET);
        } catch (jwtError) {
            console.error("JWT Verify Error:", jwtError);
            return res.status(401).json({ error: "Session expirée ou invalide. Veuillez vous reconnecter." });
        }

        const isNationalAdmin = decoded.role === 'Administrateur National';
        const isDirector = decoded.role === 'Directeur Hopital';
        const isSecretary = decoded.role === 'Secrétaire';

        if (!isNationalAdmin && !isDirector && !isSecretary) {
            return res.status(403).json({ error: "Privilèges insuffisants pour supprimer des comptes." });
        }

        const { id } = req.params;

        // If not National Admin, we must verify the location match
        if (!isNationalAdmin) {
            const targetUserRes = await db.query('SELECT location, role FROM users WHERE id = $1', [id]);
            if (targetUserRes.rowCount === 0) {
                return res.status(404).json({ error: "Utilisateur cible non trouvé." });
            }

            const targetUser = targetUserRes.rows[0];

            // Check location match with tolerance for formatting/concatenation issues
            const requesterLoc = (decoded.location || '').trim();
            const targetLoc = (targetUser.location || '').trim();

            if (requesterLoc !== targetLoc && !targetLoc.includes(requesterLoc) && !requesterLoc.includes(targetLoc)) {
                return res.status(403).json({ error: "Vous ne pouvez supprimer que les membres de votre propre établissement." });
            }

            // Optional: Prevent Secretary from deleting Director? 
            // The prompt says "delete for supervisor and secretary", 
            // usually directors/secretaries delete doctors/staff.
            if (isSecretary && targetUser.role === 'Directeur Hopital') {
                return res.status(403).json({ error: "Une secrétaire ne peut pas supprimer un Directeur." });
            }
        }

        const result = await db.query('DELETE FROM users WHERE id = $1', [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Utilisateur non trouvé." });
        }

        res.json({ success: true, message: "Utilisateur supprimé avec succès." });
    } catch (error) {
        console.error("Database Delete Error:", error);
        res.status(500).json({ error: "Erreur technique lors de la suppression : " + error.message });
    }
});

// Invitation Route
app.post('/api/invitations/send', async (req, res) => {
    const { email, role, location, labType, workplaceId, workplaceType } = req.body;

    if (!email || !role || !location) {
        return res.status(400).json({ error: "Tous les champs sont requis." });
    }

    try {
        const info = await sendInvitationEmail(email, role, location, labType, workplaceId, workplaceType);
        console.log("Email status:", info.sent ? `sent (${info.messageId})` : "simulated/failed");

        res.json({ 
            success: true, 
            sent: info.sent,
            registrationLink: info.registrationLink,
            message: info.sent ? "Invitation envoyée avec succès !" : "Invitation générée avec succès (l'envoi de l'e-mail a échoué)."
        });
    } catch (error) {
        console.error("Mail Route Error:", error);
        res.status(500).json({ error: "Erreur lors de la génération de l'invitation." });
    }
});

// Basic Route
app.get('/', (req, res) => {
    res.json({ message: "Serveur Registre Cancer - API Opérationnelle" });
});

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'up', timestamp: new Date() });
});

// Start Server
// --- Patient Management Routes ---

// Helper to clean location strings
const cleanLoc = (loc) => {
    if (!loc) return '';
    const parts = loc.split(' - ');
    return [...new Set(parts)].join(' - ').trim();
};

// GET /api/patients - Returns patients for the current hospital
app.get('/api/patients', async (req, res) => {
    const authHeader = req.headers.authorization;
    console.log("GET /api/patients Auth Header:", authHeader ? "Present" : "Missing");

    if (!authHeader) {
        return res.status(401).json({ error: "Non autorisé" });
    }

    try {
        const token = authHeader.split(' ')[1];
        fs.appendFileSync('debug.log', `Raw Auth Header: [${authHeader}]\n`);
        fs.appendFileSync('debug.log', `Extracted Token: [${token}]\n`);
        const decoded = jwt.verify(token, JWT_SECRET);
        fs.appendFileSync('debug.log', `Decoded Token: ${JSON.stringify(decoded)}\n`);

        let query = `
            SELECT DISTINCT p.*, u.name as doctor_name 
            FROM patients p 
            LEFT JOIN users u ON p.assigned_doctor_id = u.id
            LEFT JOIN patient_hospital_links phl ON p.id = phl.patient_id
        `;
        let values = [];

        if (decoded.role === 'Médecin') {
            const userLoc = cleanLoc(decoded.location);
            query += ' WHERE (p.assigned_doctor_id = $1 OR phl.doctor_id = $1 OR (p.rcp_active = true AND p.hospital_location ILIKE $2))';
            values = [decoded.id, `%${userLoc}%`];
        } else if (decoded.role !== 'Administrateur National') {
            const userLoc = cleanLoc(decoded.location);
            query += ' WHERE (p.hospital_location ILIKE $1 OR phl.hospital_id = $2)';
            values = [`%${userLoc}%`, decoded.id];
        }

        fs.appendFileSync('debug.log', `Executing Query: ${query}\n`);
        fs.appendFileSync('debug.log', `Values: ${JSON.stringify(values)}\n`);

        const result = await db.query(query, values);
        res.json(result.rows);
    } catch (error) {
        fs.appendFileSync('debug.log', `GET /api/patients Error: ${error.stack}\n`);
        console.error("GET /api/patients Full Error:", error);
        res.status(500).json({
            error: error.message,
            stack: error.stack,
            context: "GET /api/patients"
        });
    }
});

// POST /api/patients/check-duplicates – Cross-hospital aware duplicate/merge detection
app.post('/api/patients/check-duplicates', async (req, res) => {
    const { national_id, first_name, last_name, cnas_number, cancer_type } = req.body;
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Non autorisé" });

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        const currentHospitalId = decoded.id;   // hospital user's UUID

        let exactMatch = false;
        let sameCancerAtOtherHospital = false;
        let conflictingHospital = null;
        let existingPatient = null;             // patient row if found by NIN
        let existingCancers = [];              // other cancers already registered
        let matches = [];

        // ── 1. Check by NIN (most reliable)
        if (national_id) {
            const res1 = await db.query(
                `SELECT p.id, p.name, p.first_name, p.last_name, p.national_id,
                        p.birth_date, p.gender, p.blood_type, p.hospital_location,
                        p.age, p.cnas_number, p.phone_primary
                 FROM patients p WHERE p.national_id = $1`, [national_id]
            );
            if (res1.rowCount > 0) {
                exactMatch = true;
                existingPatient = res1.rows[0];
                matches = [{ name: existingPatient.name, loc: existingPatient.hospital_location }];

                // Check if this cancer_type is already registered anywhere
                if (cancer_type) {
                    const linkRes = await db.query(
                        `SELECT phl.*, u.name as hosp_name
                         FROM patient_hospital_links phl
                         LEFT JOIN users u ON phl.hospital_id = u.id
                         WHERE phl.patient_id = $1 AND LOWER(phl.cancer_type) = LOWER($2)`,
                        [existingPatient.id, cancer_type]
                    );
                    if (linkRes.rowCount > 0) {
                        sameCancerAtOtherHospital = true;
                        conflictingHospital = linkRes.rows[0].hospital_name || linkRes.rows[0].hosp_name || 'un autre hôpital';
                    }
                }

                // Fetch all existing cancer links for this patient
                const allLinks = await db.query(
                    `SELECT cancer_type, hospital_name FROM patient_hospital_links WHERE patient_id = $1`,
                    [existingPatient.id]
                );
                existingCancers = allLinks.rows.map(r => ({ cancer_type: r.cancer_type, hospital: r.hospital_name }));
            }
        }

        // ── 2. Check by CNAS if NIN didn't find anything
        if (!exactMatch && cnas_number) {
            const res2 = await db.query('SELECT name, hospital_location FROM patients WHERE cnas_number = $1', [cnas_number]);
            if (res2.rowCount > 0) {
                matches = [...matches, ...res2.rows.map(r => ({ name: r.name, loc: r.hospital_location }))];
                exactMatch = true;
            }
        }

        // ── 3. Fuzzy name check (soft match, non-blocking)
        if (!exactMatch && first_name && last_name) {
            const res3 = await db.query(
                'SELECT name, hospital_location FROM patients WHERE (first_name ILIKE $1 AND last_name ILIKE $2) OR (first_name ILIKE $2 AND last_name ILIKE $1)',
                [first_name, last_name]
            );
            matches = [...matches, ...res3.rows.map(r => ({ name: r.name, loc: r.hospital_location }))];
        }

        return res.json({
            exact_match: exactMatch,
            same_cancer_conflict: sameCancerAtOtherHospital,   // TRUE = hard block
            conflicting_hospital: conflictingHospital,
            existing_patient: exactMatch ? existingPatient : null,  // pre-fill data for merge flow
            existing_cancers: existingCancers,
            matches
        });
    } catch (e) {
        console.error('check-duplicates error:', e);
        res.status(500).json({ error: "Erreur vérification" });
    }
});

// GET /api/patients/duplicates/potential – List suspected duplicate patient records
app.get('/api/patients/duplicates/potential', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Non autorisé" });

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        if (decoded.role !== 'Administrateur National' && decoded.role !== 'Directeur Hopital') {
            return res.status(403).json({ error: "Accès réservé aux administrateurs." });
        }

        // Potential duplicates based on:
        // 1. Same NIN (if not null)
        // 2. Same CNAS (if not null)
        // 3. Same (First Name + Last Name + Birth Date)
        // Excluding already ignored pairs
        const query = `
            WITH Suspects AS (
                -- Same NIN (ignoring empty/placeholders)
                SELECT p1.id as id1, p2.id as id2, 'Identifiant National identique' as reason
                FROM patients p1
                JOIN patients p2 ON p1.national_id = p2.national_id AND p1.id < p2.id
                WHERE p1.national_id IS NOT NULL 
                  AND p1.national_id != '' 
                  AND p1.national_id != '---'
                  AND LENGTH(TRIM(p1.national_id)) > 3
                
                UNION
                
                -- Same CNAS (ignoring empty/placeholders)
                SELECT p1.id as id1, p2.id as id2, 'Numéro CNAS identique' as reason
                FROM patients p1
                JOIN patients p2 ON p1.cnas_number = p2.cnas_number AND p1.id < p2.id
                WHERE p1.cnas_number IS NOT NULL 
                  AND p1.cnas_number != '' 
                  AND p1.cnas_number != '---'
                  AND LENGTH(TRIM(p1.cnas_number)) > 3
                
                UNION
                
                -- Same Name + Birth Date
                SELECT p1.id as id1, p2.id as id2, 'Nom, Prénom et Date de naissance identiques' as reason
                FROM patients p1
                JOIN patients p2 ON 
                    LOWER(p1.first_name) = LOWER(p2.first_name) AND 
                    LOWER(p1.last_name) = LOWER(p2.last_name) AND 
                    p1.birth_date = p2.birth_date AND 
                    p1.id < p2.id
                WHERE p1.first_name IS NOT NULL AND p1.first_name != ''
            )
            SELECT s.*, 
                   p1.name as name1, p1.hospital_location as loc1, p1.created_at as date1,
                   p2.name as name2, p2.hospital_location as loc2, p2.created_at as date2
            FROM Suspects s
            JOIN patients p1 ON s.id1 = p1.id
            JOIN patients p2 ON s.id2 = p2.id
            LEFT JOIN ignored_duplicates i ON 
                (i.patient_id_1 = s.id1 AND i.patient_id_2 = s.id2) OR 
                (i.patient_id_1 = s.id2 AND i.patient_id_2 = s.id1)
            WHERE i.id IS NULL
            ORDER BY s.reason;
        `;

        const result = await db.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error("Fetch Potential Duplicates Error:", error);
        res.status(500).json({ error: "Erreur lors de la détection des doublons." });
    }
});

// POST /api/patients/merge – Fusionner deux dossiers patients
app.post('/api/patients/merge', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Non autorisé" });

    const { master_id, slave_id, kept_data } = req.body;

    if (!master_id || !slave_id) {
        return res.status(400).json({ error: "Identifiants master et slave requis." });
    }

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        if (decoded.role !== 'Administrateur National' && decoded.role !== 'Directeur Hopital') {
            return res.status(403).json({ error: "Accès réservé aux administrateurs." });
        }

        // Start Transaction
        await db.query('BEGIN');

        // 1. Update slave data into master if requested (kept_data contains field names)
        if (kept_data && Object.keys(kept_data).length > 0) {
            const updates = [];
            const values = [];
            let i = 1;
            for (const [field, value] of Object.entries(kept_data)) {
                updates.push(`${field} = $${i++}`);
                values.push(value);
            }
            values.push(master_id);
            await db.query(`UPDATE patients SET ${updates.join(', ')} WHERE id = $${i}`, values);
        }

        // 2. Re-parent all related records
        const tablesToUpdate = [
            { name: 'diagnostics', col: 'patient_id' },
            { name: 'medical_records', col: 'patient_id' },
            { name: 'tumors', col: 'patient_id' },
            { name: 'patient_hospital_links', col: 'patient_id' },
            { name: 'lab_requests', col: 'patient_id' },
            { name: 'rcp_messages', col: 'patient_id' }
        ];

        for (const table of tablesToUpdate) {
            // Special handling for patient_hospital_links to avoid unique constraint violations
            if (table.name === 'patient_hospital_links') {
                // Only move links if the master doesn't have a link for that hospital+cancer yet
                // For simplicity, we move everything and let the unique constraint error if it exists, 
                // but we should probably handle it gracefully.
                await db.query(`
                    INSERT INTO patient_hospital_links (patient_id, hospital_id, hospital_name, hospital_location, cancer_type, doctor_id, doctor_name, created_at)
                    SELECT $1, hospital_id, hospital_name, hospital_location, cancer_type, doctor_id, doctor_name, created_at
                    FROM patient_hospital_links WHERE patient_id = $2
                    ON CONFLICT (patient_id, hospital_id, LOWER(cancer_type)) DO NOTHING
                `, [master_id, slave_id]);
                await db.query(`DELETE FROM patient_hospital_links WHERE patient_id = $1`, [slave_id]);
            } else {
                await db.query(`UPDATE ${table.name} SET ${table.col} = $1 WHERE ${table.col} = $2`, [master_id, slave_id]);
            }
        }

        // 3. Delete slave patient
        await db.query('DELETE FROM patients WHERE id = $1', [slave_id]);

        // 4. Log Audit
        await logAudit(decoded.id, decoded.name, decoded.role, 'MERGE', 'patients', master_id, {
            slave_id: slave_id,
            master_id: master_id,
            reason: "Fusion de doublons manuelle"
        });

        await db.query('COMMIT');
        res.json({ success: true, message: "Fusion effectuée avec succès." });

    } catch (error) {
        await db.query('ROLLBACK');
        console.error("Merge Patients Error:", error);
        res.status(500).json({ error: "Erreur lors de la fusion des patients : " + error.message });
    }
});

// POST /api/patients/duplicates/ignore – Marquer un couple comme non-doublon
app.post('/api/patients/duplicates/ignore', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Non autorisé" });

    const { patient_id_1, patient_id_2 } = req.body;

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        await db.query(
            'INSERT INTO ignored_duplicates (patient_id_1, patient_id_2, ignored_by) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
            [patient_id_1, patient_id_2, decoded.id]
        );

        res.json({ success: true });
    } catch (error) {
        console.error("Ignore Duplicate Error:", error);
        res.status(500).json({ error: "Erreur lors de l'opération." });
    }
});



// POST /api/patients – Register a new patient OR link an existing one (cross-hospital merge)
app.post('/api/patients', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Non autorisé" });

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        const {
            national_id, first_name, last_name, age, gender, blood_type,
            cancer_type, cancer_code, doctor_id,
            birth_date, cnas_number, wilaya_residence, commune_residence, daira,
            full_address, residence_environment, phone_primary, profession,
            consent_status,
            // merge mode: if true, patient record already exists, we only create a link + tumor
            merge_mode, existing_patient_id
        } = req.body;

        const hospital_location = cleanLoc(decoded.location);
        const hospitalId = decoded.id;
        const hospitalName = decoded.name || decoded.location;

        // Securely handle doctor_id (must be a valid UUID format)
        let doctorName = null;
        let validDoctorId = (doctor_id && doctor_id.length > 20) ? doctor_id : null;
        
        if (validDoctorId) {
            try {
                const docRes = await db.query('SELECT name FROM users WHERE id = $1', [validDoctorId]);
                if (docRes.rowCount > 0) doctorName = docRes.rows[0].name;
                else validDoctorId = null; // Reset if not found
            } catch (e) {
                console.warn("Invalid doctor_id provided:", validDoctorId);
                validDoctorId = null;
            }
        }

        let patientId;
        let responseData;

        // Clean string fields
        const safe_last = (last_name || '').toString().trim();
        const safe_first = (first_name || '').toString().trim();
        const full_name = `${safe_last.toUpperCase()} ${safe_first}`.trim();

        if (merge_mode && existing_patient_id) {
            // ── MERGE MODE: patient already exists, just add new link
            const existingRes = await db.query('SELECT * FROM patients WHERE id = $1', [existing_patient_id]);
            if (existingRes.rowCount === 0) return res.status(404).json({ error: 'Patient non trouvé.' });
            patientId = existing_patient_id;
            responseData = existingRes.rows[0];
        } else {
            // ── NEW PATIENT MODE
            const year = new Date().getFullYear();
            const prefix = `PAT-${year}-`;
            const maxRes = await db.query(
                "SELECT MAX(CAST(SUBSTRING(patient_id_formatted FROM 10) AS INTEGER)) as max_val " +
                "FROM patients WHERE patient_id_formatted LIKE $1",
                [prefix + '%']
            );
            const nextId = (maxRes.rows[0].max_val || 0) + 1;
            const patient_id_formatted = `${prefix}${nextId.toString().padStart(5, '0')}`;
            const pin_code = Math.floor(100000 + Math.random() * 900000).toString();
            // REMOVED unsafe full_name redefinition. Using safe version from line 514.

            const insertResult = await db.query(`
                INSERT INTO patients (
                    national_id, name, first_name, last_name, age, gender, blood_type,
                    cancer_type, cancer_code, assigned_doctor_id, hospital_location,
                    birth_date, cnas_number, wilaya_residence, commune_residence, daira,
                    full_address, residence_environment, phone_primary, profession,
                    consent_status, patient_id_formatted, pin_code_hash, primary_hospital_id
                )
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
                RETURNING *;
            `, [
                national_id || null, 
                full_name || null, 
                safe_first || null, 
                safe_last || null, 
                (age && !isNaN(age)) ? parseInt(age) : null,
                gender || null, 
                blood_type || null,
                cancer_type || null, 
                cancer_code || null, 
                validDoctorId, // used cleaned version
                hospital_location,
                birth_date || null, 
                cnas_number || null, 
                wilaya_residence || null, 
                commune_residence || null, 
                daira || null,
                full_address || null, 
                residence_environment || null, 
                phone_primary || null, 
                profession || null,
                consent_status || null, 
                patient_id_formatted, 
                pin_code, 
                hospitalId
            ]);

            patientId = insertResult.rows[0].id;
            responseData = { ...insertResult.rows[0], pin_code };
        }

        // ── Always create/update the hospital link record
        if (cancer_type) {
            // Check for existing same-cancer link to prevent silent overwrite and enforce hard block
            const existingLink = await db.query(
                'SELECT hospital_name FROM patient_hospital_links WHERE patient_id = $1 AND LOWER(cancer_type) = LOWER($2)',
                [patientId, cancer_type]
            );

            if (existingLink.rowCount > 0) {
                return res.status(409).json({
                    error: `Conflit : Ce patient est déjà suivi pour ${cancer_type} à ${existingLink.rows[0].hospital_name}.`,
                    conflicting_hospital: existingLink.rows[0].hospital_name
                });
            }

            await db.query(`
                INSERT INTO patient_hospital_links
                    (patient_id, hospital_id, hospital_name, hospital_location, cancer_type, doctor_id, doctor_name)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [patientId, hospitalId, hospitalName, hospital_location, cancer_type, validDoctorId, doctorName]);
        }

        await logAudit(decoded.id, decoded.name, decoded.role, 'CREATE', 'patients', patientId, { 
            merge_mode: merge_mode || false, 
            cancer_type: cancer_type || 'N/A' 
        });

        res.status(201).json(responseData);
    } catch (error) {
        fs.appendFileSync('debug.log', `POST /api/patients Error: ${error.stack}\n`);
        console.error('Patient Registration Detailed Error:', error);
        res.status(500).json({ 
            error: "Erreur lors de l'enregistrement du patient.",
            details: error.message,
            code: error.code,
            stack: error.stack
        });
    }
});

// GET /api/patients/:id/hospital-links – List all hospital partnerships for a patient
app.get('/api/patients/:id/hospital-links', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Non autorisé" });
    try {
        const result = await db.query(
            `SELECT phl.*, u.name as hospital_user_name
             FROM patient_hospital_links phl
             LEFT JOIN users u ON phl.hospital_id = u.id
             WHERE phl.patient_id = $1
             ORDER BY phl.created_at ASC`,
            [req.params.id]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Get Hospital Links Error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});


// DELETE /api/patients/:id - Delete a patient record
app.delete('/api/patients/:id', async (req, res) => {
    const { id } = req.params;
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Non autorisé" });

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        // Role Check: Secretary or National Admin
        if (decoded.role !== 'Secrétaire' && decoded.role !== 'Administrateur National') {
            return res.status(403).json({ error: "Privilèges insuffisants pour supprimer des dossiers patients." });
        }

        // Fetch patient to check existence
        const checkResult = await db.query('SELECT name FROM patients WHERE id = $1', [id]);
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: "Patient non trouvé." });
        }

        const patientName = checkResult.rows[0].name;

        // Perform deletion
        // Note: CASCADE should handle related records if FKs are set to ON DELETE CASCADE
        // Otherwise, manually delete diagnostics, etc. if needed.
        await db.query('DELETE FROM patients WHERE id = $1', [id]);
        
        await logAudit(decoded.id, decoded.name, decoded.role, 'DELETE', 'patients', id, { 
            patient_name: patientName,
            deleted_by: decoded.name,
            reason: "Demande utilisateur : Suppression par secrétaire" 
        });

        res.json({ success: true, message: "Dossier patient supprimé avec succès." });

    } catch (error) {
        console.error("Delete Patient Error:", error);
        res.status(500).json({ error: "Erreur lors de la suppression du dossier patient. " + error.message });
    }
});

// --- New Medical Management Routes ---

// GET /api/patients/:id - Get patient details with diagnostics, records, and tumors
app.get('/api/patients/:id', async (req, res) => {
    const { id } = req.params;
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Non autorisé" });

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        // Fetch patient basic info
        const patientRes = await db.query('SELECT p.*, u.name as doctor_name FROM patients p LEFT JOIN users u ON p.assigned_doctor_id = u.id WHERE p.id = $1', [id]);
        if (patientRes.rowCount === 0) return res.status(404).json({ error: "Patient non trouvé" });

        const patient = patientRes.rows[0];

        // Check multi-hospital links
        const linksRes = await db.query('SELECT * FROM patient_hospital_links WHERE patient_id = $1', [id]);
        const links = linksRes.rows;
        const isAttachedToWorkplace = links.some(l => l.hospital_id === decoded.workplace_id);

        if (decoded.role !== 'Administrateur National') {
            const userLoc = cleanLoc(decoded.location);
            const isDirectOwner = patient.assigned_doctor_id === decoded.id;
            const isRcpActive = patient.rcp_active === true;

            if (!isDirectOwner && !isRcpActive && !isAttachedToWorkplace && (!patient.hospital_location || !patient.hospital_location.includes(userLoc))) {
                return res.status(403).json({ error: "Accès refusé : Ce patient n'est pas sous votre responsabilité." });
            }
        }

        // Diagnostics, Medical Records, and Tumors
        let diagnostics = [];
        let medical_records = [];
        let tumors = [];

        if (decoded.role !== 'Secrétaire') {
            const diagsRes = await db.query('SELECT d.*, u.name as doctor_name FROM diagnostics d LEFT JOIN users u ON d.doctor_id = u.id WHERE d.patient_id = $1 ORDER BY d.date DESC', [id]);
            const recsRes = await db.query('SELECT r.*, u.name as doctor_name FROM medical_records r LEFT JOIN users u ON r.doctor_id = u.id WHERE r.patient_id = $1 ORDER BY r.created_at DESC', [id]);
            const tumorsRes = await db.query('SELECT t.*, u.name as doctor_name FROM tumors t LEFT JOIN users u ON t.doctor_id = u.id WHERE t.patient_id = $1 ORDER BY t.created_at DESC', [id]);

            diagnostics = diagsRes.rows;
            medical_records = recsRes.rows;
            tumors = tumorsRes.rows;
        }

        res.json({
            patient: patient,
            diagnostics: diagnostics,
            medical_records: medical_records,
            tumors: tumors,
            isOwner: patient.assigned_doctor_id === decoded.id || isAttachedToWorkplace
        });
    } catch (error) {
        console.error("Fetch Patient Details Error:", error);
        res.status(500).json({ error: "Erreur lors de la récupération des détails du patient" });
    }
});

// POST /api/diagnostics - Add new diagnostic
app.post('/api/diagnostics', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Non autorisé" });

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        const {
            patient_id, content, type, stage, grade,
            treatment_type, cycle, outcome, next_appointment
        } = req.body;

        // Verify patient ownership (relaxed for multi-hospital)
        const patientRes = await db.query('SELECT assigned_doctor_id FROM patients WHERE id = $1', [patient_id]);
        if (patientRes.rowCount === 0) return res.status(404).json({ error: "Patient non trouvé" });

        const linksRes = await db.query('SELECT * FROM patient_hospital_links WHERE patient_id = $1 AND hospital_id = $2', [patient_id, decoded.workplace_id]);
        const isLinked = linksRes.rowCount > 0;

        if (patientRes.rows[0].assigned_doctor_id !== decoded.id && !isLinked && decoded.role !== 'Administrateur National') {
            return res.status(403).json({ error: "Action interdite : Votre établissement n'est pas lié à ce patient." });
        }

        const result = await db.query(
            `INSERT INTO diagnostics (
                patient_id, doctor_id, content, type, stage, grade, 
                treatment_type, cycle, outcome, next_appointment, owner_hospital_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
            [
                patient_id, decoded.id, content, type || 'diagnosis', stage, grade,
                treatment_type, cycle, outcome, next_appointment || null, decoded.workplace_id
            ]
        );
        const newDiag = result.rows[0];
        
        await logAudit(decoded.id, decoded.name, decoded.role, 'CREATE', 'diagnostics', newDiag.id, { 
            patient_id, type: type || 'diagnosis' 
        });

        res.status(201).json(newDiag);
    } catch (error) {
        console.error("Add Diagnostic Error:", error);
        res.status(500).json({ error: "Erreur lors de l'ajout du diagnostic" });
    }
});

// PATCH /api/diagnostics/:id - Update diagnostic
app.patch('/api/diagnostics/:id', async (req, res) => {
    const { id } = req.params;
    const {
        content, type, stage, grade,
        treatment_type, cycle, outcome, next_appointment
    } = req.body;
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Non autorisé" });

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        // VerifyOwnership
        const diagRes = await db.query('SELECT doctor_id FROM diagnostics WHERE id = $1', [id]);
        if (diagRes.rowCount === 0) return res.status(404).json({ error: "Diagnostic non trouvé" });
        if (diagRes.rows[0].doctor_id !== decoded.id) {
            return res.status(403).json({ error: "Action interdite : Seul l'auteur de ce diagnostic peut le modifier." });
        }

        const result = await db.query(
            `UPDATE diagnostics SET 
                content = $1, type = $2, stage = $3, grade = $4, 
                treatment_type = $5, cycle = $6, outcome = $7, 
                next_appointment = $8, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $9 RETURNING *`,
            [
                content, type, stage, grade, treatment_type,
                cycle, outcome, next_appointment || null, id
            ]
        );
        const updatedDiag = result.rows[0];
        
        await logAudit(decoded.id, decoded.name, decoded.role, 'UPDATE', 'diagnostics', updatedDiag.id, { 
            stage, grade 
        });

        res.json(updatedDiag);
    } catch (error) {
        console.error("Update Diagnostic Error:", error);
        res.status(500).json({ error: "Erreur lors de la modification du diagnostic" });
    }
});

// POST /api/medical-records - Upload analysis or image
app.post('/api/medical-records', upload.single('file'), async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Non autorisé" });

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        const { patient_id, type, description, diagnostic_id } = req.body;

        // Verify permissions
        const patientRes = await db.query('SELECT assigned_doctor_id, hospital_location FROM patients WHERE id = $1', [patient_id]);
        if (patientRes.rowCount === 0) return res.status(404).json({ error: "Patient non trouvé" });

        const patient = patientRes.rows[0];
        const isNationalAdmin = decoded.role === 'Administrateur National';
        const isAssignedDoctor = patient.assigned_doctor_id === decoded.id;
        const isSecretaryOfHospital = decoded.role === 'Secrétaire' &&
            patient.hospital_location &&
            patient.hospital_location.includes(cleanLoc(decoded.location));

        if (!isNationalAdmin && !isAssignedDoctor && !isSecretaryOfHospital) {
            return res.status(403).json({ error: "Action interdite : Vous n'avez pas les permissions pour ajouter des documents à ce patient." });
        }

        // For BYTEA migration, we save the buffer and mimetype directly
        const result = await db.query(
            'INSERT INTO medical_records (patient_id, doctor_id, type, description, diagnostic_id, file_data, file_mimetype, file_path, owner_hospital_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id',
            [patient_id, decoded.id, type, description, diagnostic_id || null, req.file.buffer, req.file.mimetype, `db_v2_stored_${Date.now()}`, decoded.workplace_id]
        );
        const newRecord = result.rows[0];
        
        await logAudit(decoded.id, decoded.name, decoded.role, 'CREATE', 'medical_records', newRecord.id, { 
            patient_id, type 
        });

        res.status(201).json(newRecord);
    } catch (error) {
        console.error("Upload Record Error:", error);
        res.status(500).json({ error: "Erreur lors de l'ajout du document médical" });
    }
});

// GET /api/medical-records/:id/view - Serve file from DB (BYTEA)
app.get('/api/medical-records/:id/view', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query('SELECT file_data, file_mimetype FROM medical_records WHERE id = $1', [id]);

        if (result.rowCount === 0 || !result.rows[0].file_data) {
            return res.status(404).json({ error: "Fichier non trouvé ou non migré." });
        }

        const { file_data, file_mimetype } = result.rows[0];

        // Set security headers to prevent sniffing
        res.setHeader('Content-Type', file_mimetype || 'application/octet-stream');
        res.setHeader('Content-Security-Policy', "default-src 'self'");
        res.setHeader('X-Content-Type-Options', 'nosniff');

        res.send(file_data);
    } catch (error) {
        console.error("View Record Error:", error);
        res.status(500).json({ error: "Erreur lors de la lecture du fichier." });
    }
});

// PATCH /api/medical-records/:id - Update record (linking to diagnostic)
app.patch('/api/medical-records/:id', async (req, res) => {
    const { id } = req.params;
    const { diagnostic_id } = req.body;
    const authHeader = req.headers.authorization;

    if (!authHeader) return res.status(401).json({ error: "Non autorisé" });

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        // 1. Fetch record and check if exists
        const recordRes = await db.query('SELECT patient_id FROM medical_records WHERE id = $1', [id]);
        if (recordRes.rowCount === 0) return res.status(404).json({ error: "Document non trouvé" });
        const record = recordRes.rows[0];

        // 2. Fetch patient and check if exists
        const patientRes = await db.query('SELECT id, assigned_doctor_id FROM patients WHERE id = $1', [record.patient_id]);
        if (patientRes.rowCount === 0) {
            return res.status(404).json({ error: "Patient associé à ce document introuvable." });
        }
        const patient = patientRes.rows[0];

        // 3. Permission Check (Owner or Admin)
        const isOwner = patient.assigned_doctor_id === decoded.id;
        const isNationalAdmin = decoded.role === 'Administrateur National';

        if (!isOwner && !isNationalAdmin) {
            return res.status(403).json({ error: "Seul le médecin responsable ou un administrateur peut modifier ce document." });
        }

        // 4. Validate diagnostic_id if provided (must be UUID or null)
        let finalDiagId = (diagnostic_id && diagnostic_id.trim() !== '') ? diagnostic_id : null;

        const result = await db.query(
            'UPDATE medical_records SET diagnostic_id = $1 WHERE id = $2 RETURNING *',
            [finalDiagId, id]
        );
        res.json(result.rows[0]);

    } catch (error) {
        console.error("Link Record Full Error:", error);
        res.status(500).json({
            error: "Erreur lors de l'association du document",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// --- RCP & Chat Endpoints ---

// Toggle RCP Status
app.patch('/api/patients/:id/rcp', async (req, res) => {
    const { id } = req.params;
    const { active } = req.body;
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Non autorisé" });

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        // Verify ownership
        const patientRes = await db.query('SELECT assigned_doctor_id FROM patients WHERE id = $1', [id]);
        if (patientRes.rowCount === 0) return res.status(404).json({ error: "Patient non trouvé" });
        if (patientRes.rows[0].assigned_doctor_id !== decoded.id) {
            return res.status(403).json({ error: "Seul le médecin responsable peut activer/désactiver le mode RCP." });
        }

        await db.query('UPDATE patients SET rcp_active = $1 WHERE id = $2', [active, id]);
        res.json({ success: true, rcp_active: active });
    } catch (error) {
        console.error("RCP Toggle Error:", error);
        res.status(500).json({ error: "Erreur lors du changement de mode RCP" });
    }
});

// Get Chat Messages
app.get('/api/patients/:id/chats', async (req, res) => {
    const { id } = req.params;
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Non autorisé" });

    try {
        const result = await db.query(
            'SELECT m.*, u.name as doctor_name FROM rcp_messages m JOIN users u ON m.doctor_id = u.id WHERE m.patient_id = $1 ORDER BY m.created_at ASC',
            [id]
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Fetch Chats Error:", error);
        res.status(500).json({ error: "Erreur lors de la récupération des messages" });
    }
});

// Post Chat Message
app.post('/api/rcp-chats', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Non autorisé" });

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        const { patient_id, content } = req.body;

        const result = await db.query(
            'INSERT INTO rcp_messages (patient_id, doctor_id, content) VALUES ($1, $2, $3) RETURNING *',
            [patient_id, decoded.id, content]
        );
        const msg = result.rows[0];
        msg.doctor_name = decoded.name; // For immediate UI update
        res.status(201).json(msg);
    } catch (error) {
        console.error("Post Chat Error:", error);
        res.status(500).json({ error: "Erreur lors de l'envoi du message" });
    }
});

// POST /api/tumors - Record clinical tumor data (Doctor only)
app.post('/api/tumors', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Non autorisé" });

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        if (decoded.role !== 'Médecin' && decoded.role !== 'Administrateur National') {
            return res.status(403).json({ error: "Seuls les médecins peuvent enregistrer des données cliniques." });
        }

        const {
            patient_id, topography_code, topography_label,
            morphology_code, morphology_label, basis_of_diagnosis,
            stage, grade, date_of_incidence
        } = req.body;

        // 1. Fetch Patient Info for validation
        const patientRes = await db.query('SELECT gender, age FROM patients WHERE id = $1', [patient_id]);
        if (patientRes.rowCount === 0) return res.status(404).json({ error: "Patient non trouvé" });
        const patient = patientRes.rows[0];

        // 2. Fetch IARC Validation Rules for this site (topography)
        const ruleRes = await db.query('SELECT * FROM ref_cancer_rules WHERE icd10 = $1', [topography_code]);
        if (ruleRes.rowCount > 0) {
            const rule = ruleRes.rows[0];

            // Check A: Gender Mismatch
            if (rule.allowed_gender && rule.allowed_gender !== patient.gender) {
                return res.status(400).json({
                    error: `Erreur IARC : Le code topographique [${topography_code}] (${topography_label}) est incompatible avec le sexe du patient (${patient.gender}).`
                });
            }

            // Check B: Age Mismatch
            if (patient.age < rule.min_age || patient.age > rule.max_age) {
                return res.status(400).json({
                    error: `Avertissement IARC : L'âge du patient (${patient.age} ans) est inhabituel pour ce type de cancer (Tranche normale : ${rule.min_age}-${rule.max_age} ans).`
                });
            }
        }

        // 3. Morphology Check (NOS codes vs Precise Diagnosis)
        // If basis of diagnosis is histology (7), reject generic morphology 8000/3
        if (basis_of_diagnosis === '7' && (morphology_code === '8000/3' || morphology_code === '8010/3')) {
            return res.status(400).json({
                error: "Drapeau Rouge IARC : Un diagnostic basé sur l'histologie (Code 7) nécessite une morphologie plus précise que 'NOS'."
            });
        }

        const query = `
            INSERT INTO tumors (
                patient_id, doctor_id, topography_code, topography_label, 
                morphology_code, morphology_label, basis_of_diagnosis,
                stage, grade, date_of_incidence, status, owner_hospital_id
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *;
        `;
        const values = [
            patient_id, decoded.id, topography_code, topography_label,
            morphology_code, morphology_label, basis_of_diagnosis,
            stage, grade, date_of_incidence || new Date(), 'completed',
            decoded.workplace_id
        ];

        const result = await db.query(query, values);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error("Tumor Registration Error:", error);
        res.status(500).json({ error: "Erreur lors de l'enregistrement de la tumeur." });
    }
});

// GET /api/reference/cancer-rules - Get all validation rules
app.get('/api/reference/cancer-rules', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM ref_cancer_rules ORDER BY category, sub_type');
        res.json(result.rows);
    } catch (error) {
        console.error("Fetch Rules Error:", error);
        res.status(500).json({ error: "Erreur lors de la récupération des règles." });
    }
});

// GET /api/reference/cancer-categories - Get unique list of cancer organs
app.get('/api/reference/cancer-categories', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT 
                category as name, 
                array_agg(DISTINCT specialty) as specialties,
                MIN(min_age) as min_age,
                MAX(max_age) as max_age
            FROM ref_cancer_rules 
            GROUP BY category 
            ORDER BY name
        `);
        // Post-process: flatten JSON array strings in specialties
        const rows = result.rows.map(row => {
            const flatSpecs = new Set();
            for (const s of (row.specialties || [])) {
                if (s && s.startsWith('[')) {
                    try {
                        JSON.parse(s).forEach(x => flatSpecs.add(x));
                    } catch(e) { flatSpecs.add(s); }
                } else if (s) {
                    flatSpecs.add(s);
                }
            }
            return { ...row, specialties: [...flatSpecs] };
        });
        res.json(rows);
    } catch (error) {
        console.error("Fetch Categories Error:", error);
        res.status(500).json({ error: "Erreur lors de la récupération des catégories." });
    }
});

// GET /api/reference/cancer-subtypes - Get subtypes for a category
app.get('/api/reference/cancer-subtypes', async (req, res) => {
    const { category } = req.query;
    if (!category) return res.status(400).json({ error: "Catégorie manquante." });
    try {
        const result = await db.query('SELECT * FROM ref_cancer_rules WHERE category = $1 ORDER BY sub_type', [category]);
        res.json(result.rows);
    } catch (error) {
        console.error("Fetch Subtypes Error:", error);
        res.status(500).json({ error: "Erreur lors de la récupération des sous-types." });
    }
});

// GET /api/reference/specialties - Get unique list of medical specialties from rules
app.get('/api/reference/specialties', async (req, res) => {
    try {
        const result = await db.query('SELECT DISTINCT specialty FROM ref_cancer_rules WHERE specialty IS NOT NULL AND specialty != \'\'');
        const allSpecs = new Set();
        for (const row of result.rows) {
            const val = row.specialty;
            if (val && val.startsWith('[')) {
                try {
                    const arr = JSON.parse(val);
                    if (Array.isArray(arr)) arr.forEach(s => allSpecs.add(s));
                } catch(e) { allSpecs.add(val); }
            } else if (val) {
                allSpecs.add(val);
            }
        }
        res.json([...allSpecs].sort());
    } catch (error) {
        console.error("Fetch Specialties Error:", error);
        res.status(500).json({ error: "Erreur lors de la récupération des spécialités." });
    }
});

// GET /api/analytics/summary - Advanced Research Metrics
app.get('/api/analytics/summary', async (req, res) => {
    try {
        const byLocation = await db.query('SELECT hospital_location as label, count(*) as value FROM patients GROUP BY hospital_location');
        const byCancer = await db.query('SELECT topography_code as label, count(*) as value FROM tumors GROUP BY topography_code');
        const byGender = await db.query('SELECT gender as label, count(*) as value FROM patients GROUP BY gender');
        const ageDist = await db.query('SELECT floor(age/10)*10 as bracket, count(*) as value FROM patients GROUP BY bracket ORDER BY bracket');

        res.json({
            locations: byLocation.rows,
            cancers: byCancer.rows,
            gender: byGender.rows,
            ageDistribution: ageDist.rows
        });
    } catch (error) {
        console.error("Analytics Error:", error);
        res.status(500).json({ error: "Erreur lors de la génération des statistiques." });
    }
});


// GET /api/dashboard/stats - Dashboard Real-Time Statistics
app.get('/api/dashboard/stats', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Non autorisé" });

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        const { id, role, location } = decoded;
        const userLoc = cleanLoc(location);

        let stats = {};

        if (role === 'Administrateur National') {
            const patientsRes = await db.query('SELECT count(*) FROM patients');
            const centersRes = await db.query('SELECT count(DISTINCT hospital_location) FROM patients');
            const usersRes = await db.query('SELECT count(*) FROM users');
            const pendingRes = await db.query('SELECT count(*) FROM users WHERE status = \'pending\'');

            stats = {
                totalPatients: parseInt(patientsRes.rows[0].count),
                activeCenters: parseInt(centersRes.rows[0].count),
                totalUsers: parseInt(usersRes.rows[0].count),
                pendingApprovals: parseInt(pendingRes.rows[0].count)
            };
        } else if (role === 'Directeur Hopital') {
            const patientsRes = await db.query('SELECT count(*) FROM patients WHERE hospital_location ILIKE $1', [`%${userLoc}%`]);
            const doctorsRes = await db.query('SELECT count(*) FROM users WHERE role = \'Médecin\' AND location ILIKE $1', [`%${userLoc}%`]);
            const rcpRes = await db.query('SELECT count(*) FROM patients WHERE rcp_active = true AND hospital_location ILIKE $1', [`%${userLoc}%`]);

            stats = {
                hospitalPatients: parseInt(patientsRes.rows[0].count),
                activeDoctors: parseInt(doctorsRes.rows[0].count),
                activeRCP: parseInt(rcpRes.rows[0].count)
            };
        } else if (role === 'Médecin') {
            const myPatientsRes = await db.query('SELECT count(*) FROM patients WHERE assigned_doctor_id = $1', [id]);
            const monthlyDiagRes = await db.query('SELECT count(*) FROM diagnostics WHERE doctor_id = $1 AND date >= date_trunc(\'month\', now())', [id]);
            const rcpPatientsRes = await db.query('SELECT count(*) FROM patients WHERE rcp_active = true AND (assigned_doctor_id = $1 OR hospital_location ILIKE $2)', [id, `%${userLoc}%`]);

            stats = {
                myPatients: parseInt(myPatientsRes.rows[0].count),
                monthlyDiagnostics: parseInt(monthlyDiagRes.rows[0].count),
                rcpDiscussions: parseInt(rcpPatientsRes.rows[0].count)
            };
        } else if (role === 'Secrétaire') {
            const weeklyRegRes = await db.query('SELECT count(*) FROM patients WHERE hospital_location ILIKE $1 AND created_at >= now() - interval \'7 days\'', [`%${userLoc}%`]);
            const documentsRes = await db.query('SELECT count(*) FROM medical_records WHERE patient_id IN (SELECT id FROM patients WHERE hospital_location ILIKE $1)', [`%${userLoc}%`]);

            stats = {
                weeklyRegistrations: parseInt(weeklyRegRes.rows[0].count),
                totalDocuments: parseInt(documentsRes.rows[0].count)
            };
        }

        res.json(stats);
    } catch (error) {
        console.error("Dashboard Stats Error:", error);
        res.status(500).json({ error: "Erreur lors de la récupération des statistiques." });
    }
});

// Duplicate KPI endpoint removed.
// GET /api/stats/query - Dynamic Query Engine (supports age, monthly, period, wilaya, deaths)
// --- ASR Calculation Helper ---
const calculateASR = async (patientConditions, populationDatasetId, standardPopId = null) => {
    // Standard Population Weights (WHO 2000-2025) if standardPopId not provided
    const WHO_WEIGHTS = [8860, 8690, 8600, 8470, 8220, 7930, 7610, 7150, 6590, 6040, 5370, 4550, 3720, 2960, 2210, 1520, 1510];
    const AGE_GROUPS = [
        { min: 0, max: 4, col: '0_4' }, { min: 5, max: 9, col: '5_9' }, { min: 10, max: 14, col: '10_14' },
        { min: 15, max: 19, col: '15_19' }, { min: 20, max: 24, col: '20_24' }, { min: 25, max: 29, col: '25_29' },
        { min: 30, max: 34, col: '30_34' }, { min: 35, max: 39, col: '35_39' }, { min: 40, max: 44, col: '40_44' },
        { min: 45, max: 49, col: '45_49' }, { min: 50, max: 54, col: '50_54' }, { min: 55, max: 59, col: '55_59' },
        { min: 60, max: 64, col: '60_64' }, { min: 65, max: 69, col: '65_69' }, { min: 70, max: 74, col: '70_74' },
        { min: 75, max: 79, col: '75_79' }, { min: 80, max: 200, col: '80_plus' }
    ];

    try {
        // 1. Get population dataset
        const popRes = await db.query('SELECT * FROM population_datasets WHERE id = $1', [populationDatasetId]);
        if (popRes.rows.length === 0) return 0;
        const pop = popRes.rows[0];

        // 2. Clear patient conditions of tring params for count
        const conditions = patientConditions.where;
        const params = patientConditions.params;

        let totalWeightedRate = 0;
        
        for (let i = 0; i < AGE_GROUPS.length; i++) {
            const group = AGE_GROUPS[i];
            const weight = WHO_WEIGHTS[i] / 100000; // Normalised to 1
            
            // Count cases for this age group
            const ageWhere = `${conditions} AND age BETWEEN ${group.min} AND ${group.max}`;
            const casesRes = await db.query(`SELECT count(*)::int as count FROM patients WHERE ${ageWhere}`, params);
            const count = casesRes.rows[0].count;
            
            const groupPop = (pop[`male_${group.col}`] || 0) + (pop[`female_${group.col}`] || 0);
            if (groupPop > 0) {
                const ageSpecificRate = (count / groupPop) * 100000;
                totalWeightedRate += ageSpecificRate * weight;
            }
        }
        
        return parseFloat(totalWeightedRate.toFixed(2));
    } catch (err) {
        console.error("ASR Calculation Error:", err);
        return 0;
    }
};

app.get('/api/stats/query', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Non autorisé" });

    try {
        const { dataSource, startDate, endDate, wilaya, dataSourceType, groupBy, populationDatasetId, useASR, period } = req.query;
        const conditions = ['1=1'];
        const params = [];
        let paramIdx = 1;

        // Use default population if none selected (e.g. for Tlemcen)
        let popId = populationDatasetId;
        if (!popId && dataSource === 'incidence_rates') {
            const defaultPop = await db.query("SELECT id FROM population_datasets WHERE name ILIKE '%Tlemcen%' LIMIT 1");
            if (defaultPop.rows.length > 0) popId = defaultPop.rows[0].id;
        }

        if (period === 'month') conditions.push("created_at >= NOW() - INTERVAL '1 month'");
        else if (period === 'year') conditions.push("created_at >= NOW() - INTERVAL '1 year'");

        if (wilaya && wilaya !== 'all') {
            // Normalize wilaya: strip codes like (13) if present
            const cleanWilaya = wilaya.replace(/\(\d+\)/, '').trim();
            conditions.push(`hospital_location ILIKE $${paramIdx}`);
            params.push(`%${cleanWilaya}%`);
            paramIdx++;
        }

        const whereClause = conditions.join(' AND ');

        // ═══ CANCER CASES ═══
        if (dataSource === 'cancer_cases') {
            let select = '';
            let group = '';
            let orderBy = '';

            if (groupBy === 'location') {
                select = 'hospital_location as label, (count(*))::int as value'; group = 'hospital_location';
            } else if (groupBy === 'gender') {
                select = "(CASE WHEN gender IN ('Homme', 'Male') THEN 'Masculin' WHEN gender IN ('Femme', 'Female') THEN 'Féminin' ELSE 'Inconnu' END) as label, (count(*))::int as value";
                group = "CASE WHEN gender IN ('Homme', 'Male') THEN 'Masculin' WHEN gender IN ('Femme', 'Female') THEN 'Féminin' ELSE 'Inconnu' END";
            } else if (groupBy === 'type') {
                select = 'cancer_type as label, (count(*))::int as value'; group = 'cancer_type';
            } else if (groupBy === 'age') {
                const ageCase = `
                    CASE 
                        WHEN age < 5 THEN '0-4' 
                        WHEN age < 10 THEN '5-9' 
                        WHEN age < 15 THEN '10-14' 
                        WHEN age < 20 THEN '15-19' 
                        WHEN age < 25 THEN '20-24' 
                        WHEN age < 30 THEN '25-29' 
                        WHEN age < 35 THEN '30-34' 
                        WHEN age < 40 THEN '35-39' 
                        WHEN age < 45 THEN '40-44' 
                        WHEN age < 50 THEN '45-49' 
                        WHEN age < 55 THEN '50-54' 
                        WHEN age < 60 THEN '55-59' 
                        WHEN age < 65 THEN '60-64' 
                        WHEN age < 70 THEN '65-69' 
                        WHEN age < 75 THEN '70-74' 
                        WHEN age < 80 THEN '75-79' 
                        ELSE '80+' 
                    END`;
                select = `${ageCase} as label, (count(*))::int as value`;
                group = ageCase;
                orderBy = ' ORDER BY MIN(COALESCE(age, 0))';
            } else if (groupBy === 'monthly') {
                select = "TO_CHAR(COALESCE(created_at, NOW()), 'YYYY-MM') as label, (count(*))::int as value";
                group = "TO_CHAR(COALESCE(created_at, NOW()), 'YYYY-MM')";
                orderBy = ' ORDER BY label';
            } else {
                select = 'hospital_location as label, (count(*))::int as value'; group = 'hospital_location';
            }

            const query = `SELECT ${select} FROM patients WHERE ${whereClause} GROUP BY ${group}${orderBy}`;
            const result = await db.query(query, params);
            return res.json(result.rows);
        }

        // ═══ INCIDENCE RATES ═══
        if (dataSource === 'incidence_rates') {
            if (!popId) return res.status(400).json({ error: "Dataset de population requis" });
            
            if (useASR === 'true') {
                const asr = await calculateASR({ where: whereClause, params }, popId);
                return res.json([{ label: 'ASR (Taux Standardisé)', value: asr }]);
            }

            const popRes = await db.query('SELECT * FROM population_datasets WHERE id = $1', [popId]);
            if (popRes.rows.length === 0) return res.status(404).json({ error: "Population non trouvée" });
            const pop = popRes.rows[0];

            if (groupBy === 'gender') {
                const cases = await db.query(`SELECT gender, count(*) FROM patients WHERE ${whereClause} GROUP BY gender`, params);
                
                const mCases = cases.rows.filter(c => c.gender === 'Homme' || c.gender === 'Male').reduce((a, b) => a + parseInt(b.count), 0);
                const fCases = cases.rows.filter(c => c.gender === 'Femme' || c.gender === 'Female').reduce((a, b) => a + parseInt(b.count), 0);

                const mRate = pop.total_male > 0 ? (mCases / pop.total_male) * 100000 : 0;
                const fRate = pop.total_female > 0 ? (fCases / pop.total_female) * 100000 : 0;

                return res.json([
                    { label: 'Masculin', value: parseFloat(mRate.toFixed(2)) },
                    { label: 'Féminin', value: parseFloat(fRate.toFixed(2)) }
                ]);
            }

            if (groupBy === 'age') {
                const ageGroups = [
                    { label: '0-4', min: 0, max: 4, popKey: (p) => (parseInt(p.male_0_4) || 0) + (parseInt(p.female_0_4) || 0) },
                    { label: '5-9', min: 5, max: 9, popKey: (p) => (parseInt(p.male_5_9) || 0) + (parseInt(p.female_5_9) || 0) },
                    { label: '10-14', min: 10, max: 14, popKey: (p) => (parseInt(p.male_10_14) || 0) + (parseInt(p.female_10_14) || 0) },
                    { label: '15-19', min: 15, max: 19, popKey: (p) => (parseInt(p.male_15_19) || 0) + (parseInt(p.female_15_19) || 0) },
                    { label: '20-24', min: 20, max: 24, popKey: (p) => (parseInt(p.male_20_24) || 0) + (parseInt(p.female_20_24) || 0) },
                    { label: '25-29', min: 25, max: 29, popKey: (p) => (parseInt(p.male_25_29) || 0) + (parseInt(p.female_25_29) || 0) },
                    { label: '30-34', min: 30, max: 34, popKey: (p) => (parseInt(p.male_30_34) || 0) + (parseInt(p.female_30_34) || 0) },
                    { label: '35-39', min: 35, max: 39, popKey: (p) => (parseInt(p.male_35_39) || 0) + (parseInt(p.female_35_39) || 0) },
                    { label: '40-44', min: 40, max: 44, popKey: (p) => (parseInt(p.male_40_44) || 0) + (parseInt(p.female_40_44) || 0) },
                    { label: '45-49', min: 45, max: 49, popKey: (p) => (parseInt(p.male_45_49) || 0) + (parseInt(p.female_45_49) || 0) },
                    { label: '50-54', min: 50, max: 54, popKey: (p) => (parseInt(p.male_50_54) || 0) + (parseInt(p.female_50_54) || 0) },
                    { label: '55-59', min: 55, max: 59, popKey: (p) => (parseInt(p.male_55_59) || 0) + (parseInt(p.female_55_59) || 0) },
                    { label: '60-64', min: 60, max: 64, popKey: (p) => (parseInt(p.male_60_64) || 0) + (parseInt(p.female_60_64) || 0) },
                    { label: '65-69', min: 65, max: 69, popKey: (p) => (parseInt(p.male_65_69) || 0) + (parseInt(p.female_65_69) || 0) },
                    { label: '70-74', min: 70, max: 74, popKey: (p) => (parseInt(p.male_70_74) || 0) + (parseInt(p.female_70_74) || 0) },
                    { label: '75-79', min: 75, max: 79, popKey: (p) => (parseInt(p.male_75_79) || 0) + (parseInt(p.female_75_79) || 0) },
                    { label: '80+', min: 80, max: 200, popKey: (p) => (parseInt(p.male_80_plus) || 0) + (parseInt(p.female_80_plus) || 0) }
                ];

                const ageCase = `
                    CASE 
                        WHEN age < 5 THEN '0-4' WHEN age < 10 THEN '5-9' WHEN age < 15 THEN '10-14' 
                        WHEN age < 20 THEN '15-19' WHEN age < 25 THEN '20-24' WHEN age < 30 THEN '25-29' 
                        WHEN age < 35 THEN '30-34' WHEN age < 40 THEN '35-39' WHEN age < 45 THEN '40-44' 
                        WHEN age < 50 THEN '45-49' WHEN age < 55 THEN '50-54' WHEN age < 60 THEN '55-59' 
                        WHEN age < 65 THEN '60-64' WHEN age < 70 THEN '65-69' WHEN age < 75 THEN '70-74' 
                        WHEN age < 80 THEN '75-79' ELSE '80+' 
                    END`;

                const caseResults = await db.query(`SELECT ${ageCase} as label, count(*) FROM patients WHERE ${whereClause} GROUP BY label`, params);
                const caseMap = Object.fromEntries(caseResults.rows.map(r => [r.label, parseInt(r.count)]));

                return res.json(ageGroups.map(ag => {
                    const cases = caseMap[ag.label] || 0;
                    const popTotal = ag.popKey(pop);
                    const rate = popTotal > 0 ? (cases / popTotal) * 100000 : 0;
                    return { label: ag.label, value: parseFloat(rate.toFixed(2)) };
                }));
            }

            // Default: crude rate
            const totalCases = await db.query(`SELECT count(*) FROM patients WHERE ${whereClause}`, params);
            return res.json([{
                label: 'Taux Brut Total',
                value: parseFloat(((parseInt(totalCases.rows[0].count) / pop.total_population) * 100000).toFixed(2))
            }]);
        }

        // ═══ DEATHS ═══
        if (dataSource === 'deaths') {
            let select = '';
            let group = '';
            const deathFilter = "(LOWER(d.outcome) LIKE '%décès%' OR LOWER(d.outcome) LIKE '%décédé%' OR LOWER(d.outcome) LIKE '%death%' OR LOWER(d.outcome) LIKE '%dcd%')";

            if (groupBy === 'gender') {
                select = "(CASE WHEN p.gender IN ('Homme', 'Male') THEN 'Masculin' WHEN p.gender IN ('Femme', 'Female') THEN 'Féminin' ELSE 'Inconnu' END) as label, (count(*))::int as value";
                group = "CASE WHEN p.gender IN ('Homme', 'Male') THEN 'Masculin' WHEN p.gender IN ('Femme', 'Female') THEN 'Féminin' ELSE 'Inconnu' END";
            } else if (groupBy === 'type') {
                select = 'p.cancer_type as label, (count(*))::int as value';
                group = 'p.cancer_type';
            } else if (groupBy === 'age') {
                const ageCase = `CASE WHEN p.age < 15 THEN '0-14' WHEN p.age < 30 THEN '15-29' WHEN p.age < 45 THEN '30-44' WHEN p.age < 60 THEN '45-59' WHEN p.age < 75 THEN '60-74' ELSE '75+' END`;
                select = `${ageCase} as label, (count(*))::int as value`;
                group = ageCase;
            } else {
                select = 'p.hospital_location as label, (count(*))::int as value';
                group = 'p.hospital_location';
            }

            let deathConditions = [deathFilter];
            let deathParams = [];
            let dParamIdx = 1;

            if (period === 'month') deathConditions.push("d.created_at >= NOW() - INTERVAL '1 month'");
            else if (period === 'year') deathConditions.push("d.created_at >= NOW() - INTERVAL '1 year'");

            if (wilaya && wilaya !== 'all') {
                deathConditions.push(`p.hospital_location ILIKE $${dParamIdx++}`);
                deathParams.push(`%${wilaya}%`);
            }

            if (startDate && endDate) {
                deathConditions.push(`d.diagnosis_date BETWEEN $${dParamIdx++} AND $${dParamIdx++}`);
                deathParams.push(startDate, endDate);
            }

            const query = `SELECT ${select} FROM diagnostics d JOIN patients p ON d.patient_id = p.id WHERE ${deathConditions.join(' AND ')} GROUP BY ${group}`;
            const result = await db.query(query, deathParams);
            return res.json(result.rows);
        }

        return res.status(400).json({ error: "Source de données non supportée" });
    } catch (error) {
        console.error("Query Engine Error:", error);
        res.status(500).json({ error: "Erreur lors de la génération du rapport" });
    }
});

// Saved Reports Management
// --- Map Data Endpoint ---
app.get('/api/stats/map', async (req, res) => {
    try {
        const { startDate, endDate, period } = req.query;
        let where = '1=1';
        let params = [];
        let paramIdx = 1;

        if (startDate && endDate) {
            where += ` AND diagnosis_date BETWEEN $${paramIdx++} AND $${paramIdx++}`;
            params.push(startDate, endDate);
        } else if (period === 'month') {
            where += " AND created_at >= NOW() - INTERVAL '1 month'";
        } else if (period === 'year') {
            where += " AND created_at >= NOW() - INTERVAL '1 year'";
        }

        // Get patient counts per wilaya
        const query = `
            SELECT 
                COALESCE(wilaya_residence, hospital_location) as wilaya,
                count(*)::int as count
            FROM patients 
            WHERE ${where}
            GROUP BY 1
        `;
        const result = await db.query(query, params);

        // Enhance with incidence if population data exists
        const enhancedResults = await Promise.all(result.rows.map(async (row) => {
            // Normalize wilaya name for population search (strip codes like "(13)")
            const cleanWilaya = row.wilaya ? row.wilaya.replace(/\(\d+\)/, '').trim() : '';
            
            // Find population for this wilaya - more robust ILIKE search
            const popRes = await db.query(
                "SELECT total_population FROM population_datasets WHERE name ILIKE $1 OR name ILIKE $2 LIMIT 1", 
                [`%${cleanWilaya}%`, `%${row.wilaya}%`]
            );
            
            const pop = popRes.rows[0]?.total_population || 0;
            const rate = pop > 0 ? (row.count / pop) * 100000 : 0;
            return {
                ...row,
                population: pop,
                incidence: parseFloat(rate.toFixed(2))
            };
        }));

        res.json(enhancedResults);
    } catch (error) {
        console.error("Map Data Error:", error);
        res.status(500).json({ error: "Erreur serveur" });
    }
});

app.get('/api/stats/saved-reports', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Non autorisé" });
    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        const result = await db.query('SELECT * FROM saved_reports WHERE user_id = $1 ORDER BY created_at DESC', [decoded.id]);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// Duplicate datasets & wilayas removed.

app.post('/api/stats/saved-reports', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Non autorisé" });
    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        const { name, config } = req.body;
        const result = await db.query(
            'INSERT INTO saved_reports (name, config, user_id) VALUES ($1, $2, $3) RETURNING *',
            [name, config, decoded.id]
        );
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: "Erreur lors de la sauvegarde" });
    }
});

// Duplicate KPIs removed.



app.delete('/api/stats/saved-reports/:id', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Non autorisé" });
    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        await db.query('DELETE FROM saved_reports WHERE id = $1 AND user_id = $2', [req.params.id, decoded.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Erreur lors de la suppression" });
    }
});

// Duplicate stats list and population endpoints removed.

app.post('/api/population-datasets', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Non autorisé" });
    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role !== 'Administrateur National') return res.status(403).json({ error: "Seul l'Admin National peut gérer les populations" });

        const { name, year, source, standard_population, male_data, female_data, total_male, total_female, total_population } = req.body;

        const result = await db.query(`
            INSERT INTO population_datasets (
                name, year, source, standard_population,
                male_0_4, male_5_9, male_10_14, male_15_19, male_20_24, male_25_29, male_30_34, male_35_39, male_40_44, male_45_49, male_50_54, male_55_59, male_60_64, male_65_69, male_70_74, male_75_79, male_80_plus,
                female_0_4, female_5_9, female_10_14, female_15_19, female_20_24, female_25_29, female_30_34, female_35_39, female_40_44, female_45_49, female_50_54, female_55_59, female_60_64, female_65_69, female_70_74, female_75_79, female_80_plus,
                total_male, total_female, total_population
            ) VALUES (
                $1, $2, $3, $4,
                $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21,
                $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38,
                $39, $40, $41
            ) RETURNING *
        `, [
            name, year, source, standard_population,
            ...male_data, // assumes 17 values
            ...female_data, // assumes 17 values
            total_male, total_female, total_population
        ]);
        res.json(result.rows[0]);
    } catch (error) {
        console.error("Population Create Error:", error);
        res.status(500).json({ error: "Erreur lors de la création du dataset" });
    }
});
// --- Laboratory Requests Management ---

app.get('/api/bilan-packages', async (req, res) => {
    const { category, phase } = req.query;
    try {
        let query = 'SELECT * FROM bilan_packages';
        let params = [];

        if (category && phase) {
            query += ' WHERE cancer_nom ILIKE $1 AND phase ILIKE $2';
            params = [category, phase];
        } else if (category) {
            query += ' WHERE cancer_nom ILIKE $1';
            params = [category];
        }

        const result = await db.query(query, params);

        // Format for frontend (ensure arrays are not double-stringified)
        const rows = result.rows.map(row => ({
            ...row,
            analyses_obl: typeof row.analyses_obl === 'string' ? JSON.parse(row.analyses_obl) : row.analyses_obl,
            analyses_opt: typeof row.analyses_opt === 'string' ? JSON.parse(row.analyses_opt) : row.analyses_opt,
            tests: [
                ...(Array.isArray(row.analyses_obl) ? row.analyses_obl : (typeof row.analyses_obl === 'string' ? JSON.parse(row.analyses_obl) : [])),
                ...(Array.isArray(row.analyses_opt) ? row.analyses_opt : (typeof row.analyses_opt === 'string' ? JSON.parse(row.analyses_opt) : []))
            ]
        }));

        res.json(rows);
    } catch (error) {
        console.error("Fetch Bilan Packages Error:", error);
        res.status(500).json({ error: "Erreur lors de la récupération des suggestions." });
    }
});

// Lab Matching & Routing
app.post('/api/laboratories/match', async (req, res) => {
    const { tests } = req.body; // Array of examination names

    if (!tests || !Array.isArray(tests) || tests.length === 0) {
        return res.json([]);
    }

    // Map examination keywords to Lab Activity Names
    const testToActivityMap = {
        'NFS': 'Hémogramme (NFS)',
        'Bilan hépatique': 'Bilan hépatique',
        'Bilan rénal': 'Bilan rénal',
        'Créatinine': 'Bilan rénal',
        'LDH': 'Bilan hépatique',
        'PSA': 'Marqueurs tumoraux',
        'CA 15-3': 'Marqueurs tumoraux',
        'ACE': 'Marqueurs tumoraux',
        'CEA': 'Marqueurs tumoraux',
        'CA 19-9': 'Marqueurs tumoraux',
        'Scanner': 'Scanner (TDM)',
        'IRM': 'IRM',
        'Radiographie': 'Radiographie',
        'Échographie': 'Échographie',
        'Mammographie': 'Mammographie',
        'Biopsie': 'Biopsie',
        'IHC': 'IHC (Immunohistochimie)',
        'PCR': 'PCR (Biologie Moléculaire)',
        'NGS': 'NGS (Séquençage)',
        'Cytologie': 'Cytologie',
        'Coloscopie': 'Biopsie',
        'Bronchoscopie': 'Bronchoscopie'
    };

    // Extract required activities
    const requiredActivities = new Set();
    tests.forEach(test => {
        for (const [key, activity] of Object.entries(testToActivityMap)) {
            if (test.includes(key)) {
                requiredActivities.add(activity);
            }
        }
    });

    const activitiesList = Array.from(requiredActivities);

    try {
        // Find labs that have ALL the required activities
        let query = "SELECT id, name, location, lab_type, lab_activities FROM users WHERE role = 'Laboratoire' AND status = 'active'";
        let params = [];

        if (activitiesList.length > 0) {
            query += " AND lab_activities @> $1::text[]";
            params = [activitiesList];
        }

        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error("Match Labs Error:", error);
        res.status(500).json({ error: "Erreur lors du filtrage des laboratoires." });
    }
});

app.post('/api/lab-requests', async (req, res) => {
    fs.appendFileSync('debug.log', `HIT: POST /api/lab-requests at ${new Date().toISOString()}\n`);
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Non autorisé" });
    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        let { patient_id, laboratory_id, laboratory_name, tests_requested, notes } = req.body;

        // Ensure patient_id is a UUID. If it looks like PAT-XXXX-XXXXX, resolve it.
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(patient_id)) {
            const pRes = await db.query('SELECT id FROM patients WHERE patient_id_formatted = $1', [patient_id]);
            if (pRes.rowCount > 0) {
                patient_id = pRes.rows[0].id;
            } else {
                return res.status(404).json({ error: "Patient non trouvé avec cet identifiant formaté." });
            }
        }

        let doctorName = decoded.name;
        if (!doctorName) {
            const docRes = await db.query('SELECT name FROM users WHERE id = $1', [decoded.id]);
            doctorName = docRes.rows[0]?.name || 'Médecin';
        }

        const result = await db.query(
            `INSERT INTO lab_requests (patient_id, doctor_id, doctor_name, laboratory_id, laboratory_name, tests_requested, notes, owner_hospital_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [patient_id, decoded.id, doctorName, laboratory_id || null, laboratory_name || null, JSON.stringify(tests_requested), notes, decoded.workplace_id]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error("Lab Request Create Error:", error);
        fs.appendFileSync('debug.log', `Lab Request Create Error: ${error.message}\nPayload: ${JSON.stringify(req.body)}\nStack: ${error.stack}\n`);
        res.status(500).json({
            error: "Erreur lors de la création de la demande",
            details: error.message,
            payload: req.body
        });
    }
});

app.get('/api/lab-requests/patient/:patientId', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Non autorisé" });
    try {
        const result = await db.query('SELECT * FROM lab_requests WHERE patient_id = $1 ORDER BY created_at DESC', [req.params.patientId]);
        res.json(result.rows);
    } catch (error) {
        console.error("Lab Request Get Error:", error);
        res.status(500).json({ error: "Erreur serveur" });
    }
});

app.get('/api/lab-requests', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Non autorisé" });
    try {
        const { laboratory_id, assigned_to } = req.query;
        let query = 'SELECT * FROM lab_requests';
        let params = [];
        let conditions = [];

        if (laboratory_id) {
            params.push(laboratory_id);
            conditions.push(`laboratory_id = $${params.length}`);
        }
        if (assigned_to) {
            params.push(assigned_to);
            conditions.push(`assigned_to = $${params.length}`);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        query += ' ORDER BY created_at DESC';

        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error("Lab Request Get Error:", error);
        res.status(500).json({ error: "Erreur serveur" });
    }
});

app.patch('/api/lab-requests/:id', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Non autorisé" });
    try {
        const { status } = req.body;
        const result = await db.query(
            'UPDATE lab_requests SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
            [status, req.params.id]
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error("Lab Request Update Error:", error);
        res.status(500).json({ error: "Erreur serveur" });
    }
});

app.patch('/api/lab-requests/:id/assign', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Non autorisé" });
    try {
        const { assigned_to, assigned_to_name } = req.body;
        const result = await db.query(
            'UPDATE lab_requests SET assigned_to = $1, assigned_to_name = $2, status = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
            [assigned_to, assigned_to_name, 'in_progress', req.params.id]
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error("Lab Request Assign Error:", error);
        res.status(500).json({ error: "Erreur serveur" });
    }
});

app.post('/api/lab-requests/:id/upload-results', upload.single('file'), async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Non autorisé" });
    if (!req.file) return res.status(400).json({ error: "Aucun fichier fourni" });

    try {
        const result = await db.query(
            `INSERT INTO medical_records (patient_id, type, description, file_data, file_mimetype) 
             VALUES ((SELECT patient_id FROM lab_requests WHERE id = $1), 'analysis', 'Résultats de Bilan Laboratoire', $2, $3) RETURNING id`,
            [req.params.id, req.file.buffer, req.file.mimetype]
        );

        const recordId = result.rows[0].id;
        const resultUrl = `/api/medical-records/${recordId}/view`;

        const updateResult = await db.query(
            'UPDATE lab_requests SET status = $1, result_url = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
            ['completed', resultUrl, req.params.id]
        );

        res.json(updateResult.rows[0]);
    } catch (error) {
        console.error("Upload Lab Result Error:", error);
        res.status(500).json({ error: "Erreur lors de l'enregistrement du résultat" });
    }
});

// --- Lab Result Entries (Structured Forms) ---

// Get all entries for a lab request
app.get('/api/lab-requests/:id/entries', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Non autorisé" });
    try {
        const result = await db.query(
            'SELECT * FROM lab_result_entries WHERE lab_request_id = $1 ORDER BY test_name ASC',
            [req.params.id]
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Get Lab Result Entries Error:", error);
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// Create/Save a new lab result entry
app.post('/api/lab-requests/:id/entries', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Non autorisé" });

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        const { test_name, template_id, template_variant, result_data, status } = req.body;

        // Verify Ownership
        const reqCheck = await db.query('SELECT owner_hospital_id, laboratory_id, assigned_to FROM lab_requests WHERE id = $1', [req.params.id]);
        if (reqCheck.rowCount === 0) return res.status(404).json({ error: "Demande introuvable" });

        const requestData = reqCheck.rows[0];
        const isLab = decoded.role === 'Laboratoire' || decoded.workplace_type === 'laboratory';
        const isPrescriberHospital = requestData.owner_hospital_id === decoded.workplace_id;
        const isAssignedLab = requestData.laboratory_id === decoded.workplace_id;
        const isAssignedDoctor = requestData.assigned_to === decoded.id;
        const isAdmin = decoded.role === 'Administrateur National' || decoded.role === 'Directeur';

        if (!isLab && !isPrescriberHospital && !isAssignedLab && !isAssignedDoctor && !isAdmin) {
            return res.status(403).json({ error: "Vous n'avez pas l'autorisation de modifier ce bilan." });
        }

        // Check if an entry for this test_name already exists
        const existing = await db.query(
            'SELECT id FROM lab_result_entries WHERE lab_request_id = $1 AND test_name = $2',
            [req.params.id, test_name]
        );

        if (existing.rows.length > 0) {
            return res.status(400).json({ error: "Un résultat existe déjà pour cet examen." });
        }

        const result = await db.query(
            `INSERT INTO lab_result_entries 
             (lab_request_id, test_name, template_id, template_variant, result_data, status, filled_by, filled_by_name) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
             RETURNING *`,
            [req.params.id, test_name, template_id, template_variant, result_data, status, decoded.id, decoded.name]
        );

        // Update parent request status to in_progress if it was pending
        await db.query("UPDATE lab_requests SET status = 'in_progress', updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND (status = 'pending' OR status IS NULL)", [req.params.id]);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error("Create Lab Result Entry Error:", error);
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// Update an existing lab result entry
app.patch('/api/lab-requests/:id/entries/:entryId', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Non autorisé" });

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        const { result_data, status } = req.body;

        // Verify Ownership (Request Hospital or Lab)
        const reqCheck = await db.query('SELECT owner_hospital_id, laboratory_id, assigned_to FROM lab_requests WHERE id = $1', [req.params.id]);
        if (reqCheck.rowCount === 0) return res.status(404).json({ error: "Demande introuvable" });

        const requestData = reqCheck.rows[0];
        const isLab = decoded.role === 'Laboratoire' || decoded.workplace_type === 'laboratory';
        const isPrescriberHospital = requestData.owner_hospital_id === decoded.workplace_id;
        const isAssignedLab = requestData.laboratory_id === decoded.workplace_id;
        const isAssignedDoctor = requestData.assigned_to === decoded.id;
        const isAdmin = decoded.role === 'Administrateur National' || decoded.role === 'Directeur';

        if (!isLab && !isPrescriberHospital && !isAssignedLab && !isAssignedDoctor && !isAdmin) {
            return res.status(403).json({ error: "Vous n'avez pas l'autorisation de modifier ce bilan." });
        }

        // Check if existing entry is already validated
        const currentEntry = await db.query('SELECT status FROM lab_result_entries WHERE id = $1', [req.params.entryId]);
        if (currentEntry.rowCount > 0 && currentEntry.rows[0].status === 'validated' && decoded.role !== 'Administrateur National') {
            return res.status(403).json({ error: "Ce résultat a déjà été validé et ne peut plus être modifié." });
        }

        const result = await db.query(
            `UPDATE lab_result_entries 
             SET result_data = $1, status = $2, filled_by = $3, filled_by_name = $4, updated_at = CURRENT_TIMESTAMP
             WHERE id = $5 AND lab_request_id = $6
             RETURNING *`,
            [result_data, status, decoded.id, decoded.name, req.params.entryId, req.params.id]
        );

        // Ensure parent request is marked in_progress
        await db.query("UPDATE lab_requests SET status = 'in_progress', updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND (status = 'pending' OR status IS NULL)", [req.params.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Entrée non trouvée" });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error("Update Lab Result Entry Error:", error);
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// Mark the entire lab request as "completed" using structured forms
app.patch('/api/lab-requests/:id/complete', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Non autorisé" });

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        // Verify Ownership
        const reqCheck = await db.query('SELECT owner_hospital_id, laboratory_id, assigned_to FROM lab_requests WHERE id = $1', [req.params.id]);
        if (reqCheck.rowCount === 0) return res.status(404).json({ error: "Demande introuvable" });

        const requestData = reqCheck.rows[0];
        const isLab = decoded.role === 'Laboratoire' || decoded.workplace_type === 'laboratory';
        const isPrescriberHospital = requestData.owner_hospital_id === decoded.workplace_id;
        const isAssignedLab = requestData.laboratory_id === decoded.workplace_id;
        const isAssignedDoctor = requestData.assigned_to === decoded.id;
        const isAdmin = decoded.role === 'Administrateur National' || decoded.role === 'Directeur';

        if (!isLab && !isPrescriberHospital && !isAssignedLab && !isAssignedDoctor && !isAdmin) {
            return res.status(403).json({ error: "Vous n'avez pas l'autorisation de finaliser ce bilan." });
        }

        const updateResult = await db.query(
            'UPDATE lab_requests SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
            ['completed', req.params.id]
        );

        // Notify Doctor via Email
        try {
            const notifyInfo = await db.query(`
                SELECT r.id, u.email as doctor_email, u.name as doctor_name, p.first_name, p.last_name
                FROM lab_requests r
                JOIN users u ON r.doctor_id = u.id
                JOIN patients p ON r.patient_id = p.id
                WHERE r.id = $1
            `, [req.params.id]);

            if (notifyInfo.rowCount > 0) {
                const { doctor_email, doctor_name, first_name, last_name, id } = notifyInfo.rows[0];
                await sendLabResultNotification(doctor_email, doctor_name, `${first_name} ${last_name}`, id);
                console.log(`Notification sent to doctor ${doctor_email} for request #${id}`);
            }
        } catch (mailError) {
            console.error("Failed to send notification email:", mailError);
            // Don't fail the request if email fails
        }

        res.json(updateResult.rows[0]);
    } catch (error) {
        console.error("Complete Lab Request Error:", error);
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// Obtenir toutes les entrées de résultats de laboratoire pour un patient (Vue Médecin Hospitalier)
app.get('/api/patients/:id/lab-entries', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Non autorisé" });
    try {
        const { id } = req.params;
        const result = await db.query(`
            SELECT e.*, r.created_at as request_date, r.doctor_name, r.owner_hospital_id
            FROM lab_result_entries e
            JOIN lab_requests r ON e.lab_request_id = r.id
            WHERE r.patient_id = $1
            ORDER BY e.created_at DESC
        `, [id]);

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching patient lab entries:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/reference/specialties - Get unique list of medical specialties
app.get('/api/reference/specialties', async (req, res) => {
    try {
        const result = await db.query("SELECT DISTINCT specialty FROM ref_cancer_rules WHERE specialty IS NOT NULL AND specialty != '' ORDER BY specialty");
        res.json(result.rows.map(row => row.specialty));
    } catch (error) {
        console.error('Error fetching specialties:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/laboratories', async (req, res) => {
    try {
        const result = await db.query("SELECT id, name, location FROM users WHERE role = 'Laboratoire'");
        res.json(result.rows);
    } catch (error) {
        console.error("Fetch Laboratories Error:", error);
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// Admin Cancer Rule Management Routes

// GET all cancer rules
app.get('/api/reference/cancers', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM ref_cancer_rules ORDER BY category, sub_type');
        res.json(result.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// POST new cancer rule
app.post('/api/reference/cancers', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Non autorisé' });
    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
        if (decoded.role !== 'Administrateur National') return res.status(403).json({ error: 'Accès refusé' });

        const { category, sub_type, topography_code_regex, morphology_code_regex, icd10, min_age, max_age, allowed_gender, specialty, is_rare } = req.body;
        const result = await db.query(`
            INSERT INTO ref_cancer_rules (category, sub_type, topography_code_regex, morphology_code_regex, icd10, min_age, max_age, allowed_gender, specialty, is_rare)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *
        `, [category, sub_type, topography_code_regex, morphology_code_regex, icd10, min_age, max_age, allowed_gender, specialty, is_rare]);
        res.json(result.rows[0]);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// PUT update cancer rule
app.put('/api/reference/cancers/:id', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Non autorisé' });
    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
        if (decoded.role !== 'Administrateur National') return res.status(403).json({ error: 'Accès refusé' });

        const { id } = req.params;
        const { category, sub_type, topography_code_regex, morphology_code_regex, icd10, min_age, max_age, allowed_gender, specialty, is_rare } = req.body;

        const result = await db.query(`
            UPDATE ref_cancer_rules SET 
                category=$1, sub_type=$2, topography_code_regex=$3, morphology_code_regex=$4, icd10=$5, 
                min_age=$6, max_age=$7, allowed_gender=$8, specialty=$9, is_rare=$10
            WHERE id=$11 RETURNING *
        `, [category, sub_type, topography_code_regex, morphology_code_regex, icd10, min_age, max_age, allowed_gender, specialty, is_rare, id]);

        if (result.rowCount === 0) return res.status(404).json({ error: 'Règle non trouvée' });
        res.json(result.rows[0]);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// DELETE cancer rule
app.delete('/api/reference/cancers/:id', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Non autorisé' });
    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
        if (decoded.role !== 'Administrateur National') return res.status(403).json({ error: 'Accès refusé' });

        const { id } = req.params;
        const result = await db.query('DELETE FROM ref_cancer_rules WHERE id = $1 RETURNING id', [id]);

        if (result.rowCount === 0) return res.status(404).json({ error: 'Règle non trouvée' });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// BILAN PACKAGES — Cancer-specific exam packages (ESMO/ASCO protocols)
// ─────────────────────────────────────────────────────────────────────────────

// Ensure table exists (created by seed script, but guard here too)
(async () => {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS bilan_packages (
                id                   SERIAL PRIMARY KEY,
                cancer_nom           VARCHAR(200) NOT NULL,
                sous_type            VARCHAR(200) NOT NULL,
                phase                VARCHAR(50) NOT NULL CHECK (phase IN ('initial','confirmation','extension','suivi')),
                examens_obligatoires JSONB NOT NULL DEFAULT '[]',
                examens_optionnels   JSONB NOT NULL DEFAULT '[]',
                note_clinique        TEXT,
                created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(cancer_nom, sous_type, phase)
            )
        `);
        console.log("✅ bilan_packages table ready");
    } catch (err) { console.error("bilan_packages table check failed", err.message); }
})();

// GET all packages (admin list / doctor view)
app.get('/api/bilan-packages', async (req, res) => {
    try {
        const { cancer_nom, sous_type, phase } = req.query;
        let query = 'SELECT * FROM bilan_packages WHERE 1=1';
        const params = [];
        if (cancer_nom) { params.push(`%${cancer_nom}%`); query += ` AND cancer_nom ILIKE $${params.length}`; }
        if (sous_type)  { params.push(`%${sous_type}%`);  query += ` AND sous_type  ILIKE $${params.length}`; }
        if (phase)      { params.push(phase);              query += ` AND phase = $${params.length}`; }
        query += ' ORDER BY cancer_nom, sous_type, CASE phase WHEN \'initial\' THEN 1 WHEN \'confirmation\' THEN 2 WHEN \'extension\' THEN 3 WHEN \'suivi\' THEN 4 END';
        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET distinct cancer names for dropdown
app.get('/api/bilan-packages/cancers', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT DISTINCT cancer_nom, sous_type FROM bilan_packages ORDER BY cancer_nom, sous_type
        `);
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET packages for a specific patient cancer — used by doctor in patient details
app.get('/api/bilan-packages/for-cancer', async (req, res) => {
    try {
        const { cancer_nom, sous_type } = req.query;
        if (!cancer_nom) return res.status(400).json({ error: 'cancer_nom required' });
        const result = await db.query(`
            SELECT * FROM bilan_packages 
            WHERE cancer_nom ILIKE $1 ${sous_type ? 'AND sous_type ILIKE $2' : ''}
            ORDER BY CASE phase WHEN 'initial' THEN 1 WHEN 'confirmation' THEN 2 WHEN 'extension' THEN 3 WHEN 'suivi' THEN 4 END
        `, sous_type ? [`%${cancer_nom}%`, `%${sous_type}%`] : [`%${cancer_nom}%`]);
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET single package
app.get('/api/bilan-packages/:id', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM bilan_packages WHERE id = $1', [req.params.id]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Package non trouvé' });
        res.json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST create new package (admin only)
app.post('/api/bilan-packages', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Non autorisé' });
    try {
        const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'fallback_secret');
        if (decoded.role !== 'Administrateur National') return res.status(403).json({ error: 'Accès refusé' });
        const { cancer_nom, sous_type, phase, examens_obligatoires, examens_optionnels, note_clinique } = req.body;
        if (!cancer_nom || !sous_type || !phase) return res.status(400).json({ error: 'cancer_nom, sous_type et phase sont requis' });
        const result = await db.query(`
            INSERT INTO bilan_packages (cancer_nom, sous_type, phase, examens_obligatoires, examens_optionnels, note_clinique)
            VALUES ($1,$2,$3,$4,$5,$6) RETURNING *
        `, [cancer_nom, sous_type, phase, JSON.stringify(examens_obligatoires || []), JSON.stringify(examens_optionnels || []), note_clinique || null]);
        res.status(201).json(result.rows[0]);
    } catch (e) {
        if (e.code === '23505') return res.status(409).json({ error: 'Un package pour ce cancer/phase existe déjà' });
        res.status(500).json({ error: e.message });
    }
});

// PUT update package (admin only)
app.put('/api/bilan-packages/:id', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Non autorisé' });
    try {
        const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'fallback_secret');
        if (decoded.role !== 'Administrateur National') return res.status(403).json({ error: 'Accès refusé' });
        const { cancer_nom, sous_type, phase, examens_obligatoires, examens_optionnels, note_clinique } = req.body;
        const result = await db.query(`
            UPDATE bilan_packages SET
                cancer_nom = $1, sous_type = $2, phase = $3,
                examens_obligatoires = $4, examens_optionnels = $5,
                note_clinique = $6, updated_at = NOW()
            WHERE id = $7 RETURNING *
        `, [cancer_nom, sous_type, phase, JSON.stringify(examens_obligatoires || []), JSON.stringify(examens_optionnels || []), note_clinique || null, req.params.id]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Package non trouvé' });
        res.json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE package (admin only)
app.delete('/api/bilan-packages/:id', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Non autorisé' });
    try {
        const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'fallback_secret');
        if (decoded.role !== 'Administrateur National') return res.status(403).json({ error: 'Accès refusé' });
        const result = await db.query('DELETE FROM bilan_packages WHERE id = $1 RETURNING id', [req.params.id]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Package non trouvé' });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});



// ─────────────────────────────────────────────────────────────────────────────
// STATISTIQUES & ANALYTIQUES
// ─────────────────────────────────────────────────────────────────────────────

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Non autorisé" });
    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: "Token invalide" });
        req.user = user;
        next();
    });
};

app.get('/api/stats/kpis', authenticateToken, async (req, res) => {
    try {
        const patientsRes = await db.query('SELECT count(*) FROM patients');
        const hospitalCount = await db.query("SELECT count(*) FROM users WHERE role = 'Hôpital'");
        const labCount = await db.query("SELECT count(*) FROM users WHERE role = 'Laboratoire'");
        
        // Get top cancer type
        const topCancerRes = await db.query(`
            SELECT cancer_type, count(*) as count 
            FROM patients 
            GROUP BY cancer_type 
            ORDER BY count DESC 
            LIMIT 1
        `);
        
        const total = parseInt(patientsRes.rows[0].count);
        const topCancer = topCancerRes.rows[0]?.cancer_type || 'N/A';
        const topCount = parseInt(topCancerRes.rows[0]?.count || 0);

        // National incidence roughly (total patients / estimated total pop 45M) * 100k
        const avgIncidence = (total / 45000000) * 100000;

        res.json({
            total_cases: total,
            activeHospitals: parseInt(hospitalCount.rows[0].count),
            activeLabs: parseInt(labCount.rows[0].count),
            top_cancer: topCancer,
            top_cancer_pct: total > 0 ? (topCount / total) * 100 : 0,
            avg_incidence: avgIncidence,
            severity_score: 74,
            lastUpdate: new Date()
        });
    } catch (err) {
        console.error("KPIs Error:", err);
        res.status(500).json({ error: "Erreur lors du calcul des KPIs" });
    }
});

app.get('/api/stats/map', authenticateToken, async (req, res) => {
    try {
        const { period, startDate, endDate, cancerType } = req.query;
        let pQuery = 'SELECT wilaya_residence as name, count(*) as patients FROM patients';
        let pParams = [];
        let whereClauses = [];

        if (period === 'month') {
            whereClauses.push("created_at >= NOW() - INTERVAL '1 month'");
        } else if (period === 'year') {
            whereClauses.push("created_at >= NOW() - INTERVAL '1 year'");
        }
        
        if (cancerType && cancerType !== 'all') {
            pParams.push(cancerType);
            whereClauses.push(`cancer_type = $${pParams.length}`);
        }

        if (whereClauses.length > 0) {
            pQuery += ' WHERE ' + whereClauses.join(' AND ');
        }
        
        pQuery += ' GROUP BY wilaya_residence';
        
        const patientStats = await db.query(pQuery, pParams);
        const populations = await db.query('SELECT name, total_population FROM population_datasets ORDER BY year DESC');

        // Normalisation function to match "13-Tlemcen" with "Tlemcen"
        const normalize = (val) => {
            if (!val) return 'Inconnu';
            return val.toString().toLowerCase()
                .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
                .replace(/^\d+[- ]+/, '') // Remove leading numbers
                .replace(/\(.*\)/g, '')   // Remove parens and their content
                .trim();
        };

        const aggregated = {};
        patientStats.rows.forEach(p => {
            let pName = normalize(p.name);
            // Capitalize for display
            pName = pName.charAt(0).toUpperCase() + pName.slice(1);

            if (!aggregated[pName]) {
                aggregated[pName] = 0;
            }
            aggregated[pName] += parseInt(p.patients);
        });

        const merged = Object.keys(aggregated).map(name => {
            const popName = normalize(name);
            const popRow = populations.rows.find(pop => normalize(pop.name) === popName);
            const pop = popRow ? popRow.total_population : 1000000;
            
            return {
                wilaya: name,
                count: aggregated[name],
                incidence: (aggregated[name] / pop) * 100000,
                population: pop
            };
        });

        res.json(merged);
    } catch (err) {
        console.error("Map Data Error:", err);
        res.status(500).json({ error: "Erreur lors du calcul de la carte" });
    }
});

app.get('/api/population-datasets', authenticateToken, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM population_datasets ORDER BY year DESC, name ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/stats/global', authenticateToken, async (req, res) => {
    try {
        // 1. Total Cases
        const totalRes = await db.query('SELECT COUNT(*) as total FROM patients');
        const totalCases = parseInt(totalRes.rows[0].total) || 0;

        // 2. Top 3 Cancers
        const topCancersRes = await db.query(`
            SELECT cancer_type as label, COUNT(*) as value 
            FROM patients 
            GROUP BY cancer_type 
            ORDER BY value DESC 
            LIMIT 3
        `);
        const topCancers = topCancersRes.rows;

        // 3. Gender Distribution
        const genderRes = await db.query(`
            SELECT gender as label, COUNT(*) as value 
            FROM patients 
            GROUP BY gender
        `);
        const genderDistribution = genderRes.rows;

        // 4. Monthly Trend (Last 12 Months)
        const trendRes = await db.query(`
            SELECT TO_CHAR(created_at, 'YYYY-MM') as label, COUNT(*) as value 
            FROM patients 
            WHERE created_at >= NOW() - INTERVAL '1 year'
            GROUP BY label 
            ORDER BY label ASC
        `);
        const monthlyTrend = trendRes.rows;

        res.json({
            totalCases,
            topCancers,
            genderDistribution,
            monthlyTrend
        });
    } catch (err) {
        console.error("Global Stats Error:", err);
        res.status(500).json({ error: "Erreur lors de la récupération des statistiques globales" });
    }
});

app.get('/api/stats/query', authenticateToken, async (req, res) => {
    try {
        const { groupBy, period, dataSource, cancerType, wilaya } = req.query;
        let query = '';
        let params = [];
        let whereClauses = [];

        if (period === 'month') {
            whereClauses.push("created_at >= NOW() - INTERVAL '1 month'");
        } else if (period === 'year') {
            whereClauses.push("created_at >= NOW() - INTERVAL '1 year'");
        }

        if (cancerType && cancerType !== 'all') {
            params.push(cancerType);
            whereClauses.push(`cancer_type = $${params.length}`);
        }

        if (wilaya && wilaya !== 'all') {
            params.push(wilaya);
            whereClauses.push(`wilaya_residence = $${params.length}`);
        }

        const whereString = whereClauses.length > 0 ? ' WHERE ' + whereClauses.join(' AND ') : '';
        
        // Add status filter based on dataSource
        let finalWhere = whereString;
        if (dataSource === 'mortality') {
            finalWhere += (finalWhere ? ' AND ' : ' WHERE ') + "status = 'Décédé'";
        } else if (dataSource === 'prevalence') {
            finalWhere += (finalWhere ? ' AND ' : ' WHERE ') + "(status != 'Décédé' OR status IS NULL)";
        }

        const groupCol = groupBy === 'wilaya' ? 'wilaya_residence' :
                         groupBy === 'age' ? 'age' :
                         groupBy === 'gender' ? 'gender' :
                         groupBy === 'cancer_type' ? 'cancer_type' : 'wilaya_residence';

        if (groupBy === 'trend') {
            query = `SELECT TO_CHAR(created_at, 'YYYY-MM') as label, count(*) as value FROM patients ${finalWhere} GROUP BY label ORDER BY label ASC`;
        } else {
            query = `SELECT ${groupCol} as label, count(*) as value FROM patients ${finalWhere} GROUP BY label`;
        }


        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/stats/forecast', authenticateToken, async (req, res) => {
    try {
        // Fetch historical monthly data
        const historicalQuery = `SELECT TO_CHAR(created_at, 'YYYY-MM') as month, count(*) as count FROM patients GROUP BY month ORDER BY month ASC`;
        const result = await db.query(historicalQuery);
        
        if (result.rows.length < 2) {
            return res.json([]); // Not enough data for regression
        }

        const data = result.rows.map(r => ({ label: r.month, value: parseInt(r.count) }));
        
        // Simple Linear Regression algorithm (Least Squares)
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        const n = data.length;
        
        data.forEach((point, i) => {
            const x = i; // Map time to index 0, 1, 2...
            const y = point.value;
            sumX += x;
            sumY += y;
            sumXY += x * y;
            sumX2 += x * x;
        });

        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) || 0;
        const intercept = (sumY - slope * sumX) / n || 0;

        // Predict next 6 months
        const predictions = [];
        const lastDateParts = data[data.length - 1].label.split('-');
        let year = parseInt(lastDateParts[0]);
        let month = parseInt(lastDateParts[1]);

        for (let i = 1; i <= 6; i++) {
            month++;
            if (month > 12) {
                month = 1;
                year++;
            }
            const timeIndex = n - 1 + i;
            let predictedValue = Math.round(slope * timeIndex + intercept);
            if (predictedValue < 0) predictedValue = 0;

            const futureLabel = `${year}-${month.toString().padStart(2, '0')}`;
            predictions.push({ label: futureLabel, value: predictedValue });
        }

        res.json(predictions);
    } catch (err) {
        console.error("Forecast Error:", err);
        res.status(500).json({ error: "Erreur lors des prédictions" });
    }
});

app.get('/api/stats/saved-reports', authenticateToken, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM saved_reports ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        res.json([]);
    }
});

app.get('/api/stats/cancers', authenticateToken, async (req, res) => {
    try {
        const result = await db.query('SELECT DISTINCT cancer_type FROM patients WHERE cancer_type IS NOT NULL ORDER BY cancer_type ASC');
        res.json(result.rows.map(r => r.cancer_type));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- ADVANCED STATISTICS (GLOBOCAN-inspired) ---

const getStatsFilters = (req) => {
    const { cancerType, wilaya, period, startDate, endDate, dataSource } = req.query;
    let params = [];
    let whereClauses = [];

    if (cancerType && cancerType !== 'all') {
        params.push(cancerType);
        whereClauses.push(`cancer_type = $${params.length}`);
    }

    if (wilaya && wilaya !== 'all') {
        params.push(wilaya);
        whereClauses.push(`wilaya_residence = $${params.length}`);
    }

    if (period === 'month') {
        whereClauses.push("created_at >= NOW() - INTERVAL '1 month'");
    } else if (period === 'year') {
        whereClauses.push("created_at >= NOW() - INTERVAL '1 year'");
    } else if (startDate && endDate) {
        params.push(startDate);
        whereClauses.push(`created_at >= $${params.length}`);
        params.push(endDate);
        whereClauses.push(`created_at <= $${params.length}`);
    }

    // Handle dataSource (e.g., mortality)
    if (dataSource === 'mortality') {
        whereClauses.push("status = 'Décédé'");
    }

    return {
        whereString: whereClauses.length > 0 ? ' WHERE ' + whereClauses.join(' AND ') : '',
        params
    };
};

// 1. Age-Gender Pyramid (Population Pyramid)
app.get('/api/stats/age-pyramid', authenticateToken, async (req, res) => {
    try {
        const { whereString, params } = getStatsFilters(req);
        const ageCase = `
            CASE 
                WHEN age < 5 THEN '0-4' WHEN age < 10 THEN '5-9' WHEN age < 15 THEN '10-14'
                WHEN age < 20 THEN '15-19' WHEN age < 25 THEN '20-24' WHEN age < 30 THEN '25-29'
                WHEN age < 35 THEN '30-34' WHEN age < 40 THEN '35-39' WHEN age < 45 THEN '40-44'
                WHEN age < 50 THEN '45-49' WHEN age < 55 THEN '50-54' WHEN age < 60 THEN '55-59'
                WHEN age < 65 THEN '60-64' WHEN age < 70 THEN '65-69' WHEN age < 75 THEN '70-74'
                WHEN age < 80 THEN '75-79' ELSE '80+' 
            END`;
        const result = await db.query(`
            SELECT ${ageCase} as age_group, 
                   SUM(CASE WHEN gender IN ('Homme', 'Male') THEN 1 ELSE 0 END)::int as male,
                   SUM(CASE WHEN gender IN ('Femme', 'Female') THEN 1 ELSE 0 END)::int as female
            FROM patients 
            ${whereString} ${whereString ? 'AND' : 'WHERE'} age IS NOT NULL
            GROUP BY ${ageCase}
            ORDER BY MIN(COALESCE(age, 0))
        `, params);
        res.json(result.rows);
    } catch (err) {
        console.error("Age Pyramid Error:", err);
        res.status(500).json({ error: "Erreur lors du calcul de la pyramide des âges" });
    }
});

// 2. Stage Distribution (Funnel/Bar)
app.get('/api/stats/stage-distribution', authenticateToken, async (req, res) => {
    try {
        const { whereString, params } = getStatsFilters(req);
        // We join with patients for tumors and diagnoses to apply global filters (wilaya, period, etc)
        const tumorStages = await db.query(`
            SELECT t.stage as label, COUNT(*)::int as value
            FROM tumors t
            JOIN patients p ON t.patient_id = p.id
            ${whereString} ${whereString ? 'AND' : 'WHERE'} t.stage IS NOT NULL AND t.stage != ''
            GROUP BY t.stage ORDER BY value DESC
        `, params);
        
        if (tumorStages.rows.length > 0) {
            return res.json(tumorStages.rows);
        }

        const diagStages = await db.query(`
            SELECT d.stade_global as label, COUNT(*)::int as value
            FROM cancer_diagnoses d
            JOIN patients p ON d.patient_id = p.id
            ${whereString} ${whereString ? 'AND' : 'WHERE'} d.stade_global IS NOT NULL AND d.stade_global != ''
            GROUP BY d.stade_global ORDER BY value DESC
        `, params);
        res.json(diagStages.rows);
    } catch (err) {
        console.error("Stage Distribution Error:", err);
        res.status(500).json({ error: "Erreur lors du calcul de la distribution des stades" });
    }
});

// 3. Top Cancers Treemap (hierarchical with wilaya sub-groups)
app.get('/api/stats/treemap', authenticateToken, async (req, res) => {
    try {
        const { whereString, params } = getStatsFilters(req);
        const result = await db.query(`
            SELECT cancer_type, wilaya_residence as wilaya, COUNT(*)::int as count
            FROM patients 
            ${whereString} ${whereString ? 'AND' : 'WHERE'} cancer_type IS NOT NULL
            GROUP BY cancer_type, wilaya_residence
            ORDER BY count DESC
        `, params);
        
        // Group into treemap hierarchy
        const cancerMap = {};
        result.rows.forEach(row => {
            if (!cancerMap[row.cancer_type]) {
                cancerMap[row.cancer_type] = { name: row.cancer_type, children: [], total: 0 };
            }
            cancerMap[row.cancer_type].children.push({ name: row.wilaya || 'Inconnu', size: row.count });
            cancerMap[row.cancer_type].total += row.count;
        });
        
        const treemapData = Object.values(cancerMap)
            .sort((a, b) => b.total - a.total)
            .slice(0, 15)
            .map(c => ({ name: c.name, children: c.children, size: c.total }));
        
        res.json(treemapData);
    } catch (err) {
        console.error("Treemap Error:", err);
        res.status(500).json({ error: "Erreur lors de la génération du treemap" });
    }
});

// 4. Mortality/Incidence Ratio
app.get('/api/stats/mi-ratio', authenticateToken, async (req, res) => {
    try {
        const { whereString, params } = getStatsFilters(req);
        const result = await db.query(`
            SELECT cancer_type as label, 
                   COUNT(*)::int as total_cases,
                   SUM(CASE WHEN status = 'Décédé' THEN 1 ELSE 0 END)::int as deaths,
                   ROUND(
                       CASE WHEN COUNT(*) > 0 
                       THEN (SUM(CASE WHEN status = 'Décédé' THEN 1 ELSE 0 END)::float / COUNT(*)::float) * 100
                       ELSE 0 END, 1
                   )::float as mi_ratio
            FROM patients 
            ${whereString} ${whereString ? 'AND' : 'WHERE'} cancer_type IS NOT NULL
            GROUP BY cancer_type
            HAVING COUNT(*) >= 2
            ORDER BY mi_ratio DESC
            LIMIT 10
        `, params);
        res.json(result.rows);
    } catch (err) {
        console.error("M/I Ratio Error:", err);
        res.status(500).json({ error: "Erreur lors du calcul du ratio M/I" });
    }
});

// 5. Summary KPIs extended (prevalence, cumulative risk, median age)
app.get('/api/stats/advanced-kpis', authenticateToken, async (req, res) => {
    try {
        const { whereString, params } = getStatsFilters(req);
        const [medianRes, activeRes, newThisMonthRes, genderMRes, genderFRes] = await Promise.all([
            db.query(`SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY age) as median_age FROM patients ${whereString} ${whereString ? 'AND' : 'WHERE'} age IS NOT NULL`, params),
            db.query(`SELECT COUNT(*)::int as count FROM patients ${whereString} ${whereString ? 'AND' : 'WHERE'} (status != 'Décédé' OR status IS NULL)`, params),
            db.query(`SELECT COUNT(*)::int as count FROM patients ${whereString} ${whereString ? 'AND' : 'WHERE'} created_at >= NOW() - INTERVAL '1 month'`, params),
            db.query(`SELECT COUNT(*)::int as count FROM patients ${whereString} ${whereString ? 'AND' : 'WHERE'} gender IN ('Homme', 'Male')`, params),
            db.query(`SELECT COUNT(*)::int as count FROM patients ${whereString} ${whereString ? 'AND' : 'WHERE'} gender IN ('Femme', 'Female')`, params)
        ]);

        res.json({
            medianAge: Math.round(medianRes.rows[0]?.median_age || 0),
            prevalence: activeRes.rows[0]?.count || 0,
            newThisMonth: newThisMonthRes.rows[0]?.count || 0,
            maleCount: genderMRes.rows[0]?.count || 0,
            femaleCount: genderFRes.rows[0]?.count || 0,
            sexRatio: genderFRes.rows[0]?.count > 0 
                ? (genderMRes.rows[0]?.count / genderFRes.rows[0]?.count).toFixed(2) 
                : 'N/A'
        });
    } catch (err) {
        console.error("Advanced KPIs Error:", err);
        res.status(500).json({ error: "Erreur lors du calcul des KPIs avancés" });
    }
});

// Haversine formula to calculate distance between two points in km
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

app.get('/api/stats/correlation', authenticateToken, async (req, res) => {
    try {
        const { cancerType } = req.query;
        
        // 1. Fetch all patients of the specified type with their coordinates
        let patientQuery = 'SELECT id, latitude, longitude FROM patients WHERE latitude IS NOT NULL AND longitude IS NOT NULL';
        const params = [];
        if (cancerType && cancerType !== 'all') {
            patientQuery += ' AND cancer_type = $1';
            params.push(cancerType);
        }
        const patientsRes = await db.query(patientQuery, params);
        const patients = patientsRes.rows;

        // 2. Fetch all risk zones
        const zonesRes = await db.query('SELECT * FROM risk_zones');
        const zones = zonesRes.rows;

        // 3. Calculate correlation for each zone
        const results = zones.map(zone => {
            const center = zone.geometry.center;
            const radiusKm = zone.geometry.radius / 1000; // Geometry radius is in meters

            let insideCount = 0;
            patients.forEach(p => {
                const dist = calculateDistance(center.lat, center.lng, p.latitude, p.longitude);
                if (dist <= radiusKm) {
                    insideCount++;
                }
            });

            // Statistical logic:
            // We compare the density of cases inside the zone vs a baseline (average density)
            // For a demo, we calculate a "Risk Ratio"
            // High correlation if many patients are concentrated in a small radius
            const outsideCount = patients.length - insideCount;
            
            // Risk Factor Calculation (Simplified for UI display)
            // RR = (cases_inside / population_inside) / (cases_outside / population_outside)
            // Since we don't have precise population grids, we use an estimated baseline density
            const relativeDensity = (insideCount / (Math.PI * radiusKm * radiusKm)) || 0;
            const baselineDensity = (patients.length / 2381741); // Total area of Algeria in km2 approx
            
            const riskRatio = Math.min(5, Math.max(1, (relativeDensity / (baselineDensity || 1)) * 0.1 * zone.severity));

            return {
                zoneId: zone.id,
                zoneName: zone.name,
                zoneType: zone.type,
                casesInside: insideCount,
                totalCases: patients.length,
                riskRatio: parseFloat(riskRatio.toFixed(2)),
                severity: zone.severity
            };
        });

        res.json(results);
    } catch (err) {
        console.error("Correlation Error:", err);
        res.status(500).json({ error: "Erreur lors de l'analyse de corrélation" });
    }
});


app.get('/api/bilan-packages', authenticateToken, async (req, res) => {
    try {
        const { cancer_nom, phase } = req.query;
        let query = 'SELECT id, cancer_nom, sous_type, phase, examens_obligatoires, examens_optionnels, note_clinique FROM bilan_packages WHERE 1=1';
        let params = [];
        
        if (cancer_nom) {
            params.push(cancer_nom);
            query += ` AND cancer_nom = $${params.length}`;
        }
        if (phase) {
            params.push(phase);
            query += ` AND phase = $${params.length}`;
        }
        
        query += ' ORDER BY id ASC';
        
        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching bilan_packages", err);
        res.status(500).json({ error: "Erreur lors de la récupération des packages de bilans" });
    }
});

app.post('/api/bilan-packages', authenticateToken, async (req, res) => {
    if (req.user.role !== 'Médecin' && req.user.role !== 'Administrateur National') {
        return res.status(403).json({ error: "Accès refusé." });
    }
    const { cancer_nom, sous_type, phase, examens_obligatoires, examens_optionnels, note_clinique } = req.body;
    try {
        const result = await db.query(`
            INSERT INTO bilan_packages 
            (cancer_nom, sous_type, phase, examens_obligatoires, examens_optionnels, note_clinique)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [cancer_nom, sous_type, phase, JSON.stringify(examens_obligatoires), JSON.stringify(examens_optionnels), note_clinique]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error("Error creating bilan_package", err);
        res.status(500).json({ error: "Erreur lors de la création du package" });
    }
});

app.put('/api/bilan-packages/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'Médecin' && req.user.role !== 'Administrateur National') {
        return res.status(403).json({ error: "Accès refusé." });
    }
    const { id } = req.params;
    const { sous_type, phase, examens_obligatoires, examens_optionnels, note_clinique } = req.body;
    try {
        const result = await db.query(`
            UPDATE bilan_packages 
            SET sous_type = $1, phase = $2, examens_obligatoires = $3, examens_optionnels = $4, note_clinique = $5, updated_at = CURRENT_TIMESTAMP
            WHERE id = $6
            RETURNING *
        `, [sous_type, phase, JSON.stringify(examens_obligatoires), JSON.stringify(examens_optionnels), note_clinique, id]);
        if (result.rowCount === 0) return res.status(404).json({ error: "Package non trouvé" });
        res.json(result.rows[0]);
    } catch (err) {
        console.error("Error updating bilan_package", err);
        res.status(500).json({ error: "Erreur lors de la mise à jour du package" });
    }
});

// --- RISK ZONES ROUTES ---
app.get('/api/risk-zones', authenticateToken, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM risk_zones ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching risk zones", err);
        res.status(500).json({ error: "Erreur lors de la récupération des zones à risque" });
    }
});

app.post('/api/risk-zones', authenticateToken, async (req, res) => {
    // Only National Admin can create zones
    if (req.user.role !== 'Administrateur National') {
        return res.status(403).json({ error: "Privilèges insuffisants." });
    }

    const { name, type, geometry, description, severity } = req.body;
    try {
        const result = await db.query(`
            INSERT INTO risk_zones (name, type, geometry, description, severity)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [name, type, JSON.stringify(geometry), description, severity || 1]);

        await logAudit(req.user.id, req.user.name, req.user.role, 'CREATE', 'risk_zones', result.rows[0].id, { name });
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error("Error creating risk zone", err);
        res.status(500).json({ error: "Erreur lors de la création de la zone à risque" });
    }
});

app.delete('/api/risk-zones/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'Administrateur National') {
        return res.status(403).json({ error: "Privilèges insuffisants." });
    }

    const { id } = req.params;
    try {
        const result = await db.query('DELETE FROM risk_zones WHERE id = $1 RETURNING name', [id]);
        if (result.rowCount === 0) return res.status(404).json({ error: "Zone non trouvée" });

        await logAudit(req.user.id, req.user.name, req.user.role, 'DELETE', 'risk_zones', id, { name: result.rows[0].name });
        res.json({ success: true });
    } catch (err) {
        console.error("Error deleting risk zone", err);
        res.status(500).json({ error: "Erreur lors de la suppression de la zone à risque" });
    }
});

// --- CANCER DIAGNOSIS & BODY MAP ROUTES ---
app.get('/api/reference/topography', authenticateToken, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM ref_topography_map ORDER BY topography_code');
        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching topography reference", err);
        res.status(500).json({ error: "Erreur serveur" });
    }
});

app.get('/api/patients/:id/diagnosis', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT d.*, u.name as doctor_name 
            FROM cancer_diagnoses d
            LEFT JOIN users u ON d.diagnosed_by = u.id
            WHERE d.patient_id = $1
            ORDER BY d.diagnosis_date DESC, d.created_at DESC
        `, [req.params.id]);
        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching patient diagnoses", err);
        res.status(500).json({ error: "Erreur serveur" });
    }
});

app.post('/api/patients/:id/diagnosis', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { 
        topography_code, morphology_code, tnm_t, tnm_n, tnm_m, stade_global, 
        grade, lateralite, body_region, organ, organ_zone, notes, lab_request_id 
    } = req.body;
    
    try {
        const result = await db.query(`
            INSERT INTO cancer_diagnoses (
                patient_id, topography_code, morphology_code, tnm_t, tnm_n, tnm_m, stade_global,
                grade, lateralite, body_region, organ, organ_zone, notes, lab_request_id, diagnosed_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            RETURNING *
        `, [
            id, topography_code, morphology_code, tnm_t, tnm_n, tnm_m, stade_global,
            grade, lateralite, body_region, organ, organ_zone, notes, lab_request_id || null, req.user.id
        ]);
        
        await logAudit(req.user.id, req.user.name, req.user.role, 'CREATE', 'cancer_diagnosis', result.rows[0].id, { patient_id: id });
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error("Error creating patient diagnosis", err);
        res.status(500).json({ error: "Erreur serveur" });
    }
});

app.put('/api/patients/:id/diagnosis/:diagId', authenticateToken, async (req, res) => {
    const { id, diagId } = req.params;
    const { 
        topography_code, morphology_code, tnm_t, tnm_n, tnm_m, stade_global, 
        grade, lateralite, body_region, organ, organ_zone, notes, lab_request_id 
    } = req.body;
    
    try {
        const result = await db.query(`
            UPDATE cancer_diagnoses SET
                topography_code = $1, morphology_code = $2, tnm_t = $3, tnm_n = $4, tnm_m = $5, stade_global = $6,
                grade = $7, lateralite = $8, body_region = $9, organ = $10, organ_zone = $11, notes = $12, lab_request_id = $13,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $14 AND patient_id = $15
            RETURNING *
        `, [
            topography_code, morphology_code, tnm_t, tnm_n, tnm_m, stade_global,
            grade, lateralite, body_region, organ, organ_zone, notes, lab_request_id || null,
            diagId, id
        ]);
        
        if (result.rowCount === 0) return res.status(404).json({ error: "Diagnostic non trouvé" });
        
        await logAudit(req.user.id, req.user.name, req.user.role, 'UPDATE', 'cancer_diagnosis', diagId, { patient_id: id });
        res.json(result.rows[0]);
    } catch (err) {
        console.error("Error updating patient diagnosis", err);
        res.status(500).json({ error: "Erreur serveur" });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Serveur en cours d'exécution sur le port ${PORT}`);
    console.log(`🔗 URL: http://localhost:${PORT}`);
});
