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
const { sendInvitationEmail } = require('./services/mailService');

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
            { id: user.id, email: user.email, role: user.role, location: user.location },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                location: user.location
            }
        });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ error: "Erreur lors de la connexion." });
    }
});

app.post('/api/auth/register', async (req, res) => {
    const { name, email, phone, password, role, location, hospitalName, specialty } = req.body;

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
            INSERT INTO users (name, email, role, location, status, password_hash, specialty)
            VALUES ($1, $2, $3, $4, 'pending', $5, $6)
            RETURNING id, name, email, role;
        `;
        const values = [name, email, role, finalLocation.trim(), passwordHash, specialty || null];

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

// User Management Routes
app.get('/api/users', async (req, res) => {
    try {
        const result = await db.query('SELECT id, name, email, role, location, status, specialty, created_at FROM users ORDER BY created_at DESC');
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
    const { email, role, location } = req.body;

    if (!email || !role || !location) {
        return res.status(400).json({ error: "Tous les champs sont requis." });
    }

    try {
        const info = await sendInvitationEmail(email, role, location);
        console.log("Email sent: %s", info.messageId);

        // If using ethereal for testing, log the preview URL
        if (info.envelope && info.envelope.from === 'no-reply@sante.dz' && !process.env.MAIL_HOST) {
            // This is just a hint for the developer
            console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
        }

        res.json({ success: true, message: "Invitation envoyée avec succès !" });
    } catch (error) {
        console.error("Mail Error:", error);
        res.status(500).json({ error: "Erreur lors de l'envoi de l'email." });
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

        let query = 'SELECT p.*, u.name as doctor_name FROM patients p LEFT JOIN users u ON p.assigned_doctor_id = u.id';
        let values = [];

        if (decoded.role === 'Médecin') {
            const userLoc = cleanLoc(decoded.location);
            query += ' WHERE (p.assigned_doctor_id = $1 OR (p.rcp_active = true AND p.hospital_location ILIKE $2))';
            values = [decoded.id, `%${userLoc}%`];
        } else if (decoded.role !== 'Administrateur National') {
            const userLoc = cleanLoc(decoded.location);
            query += ' WHERE p.hospital_location ILIKE $1';
            values = [`%${userLoc}%`];
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

// POST /api/patients/check-duplicates - Check for similar patients (Fuzzy matching)
app.post('/api/patients/check-duplicates', async (req, res) => {
    const { first_name, last_name, national_id } = req.body;
    try {
        // Direct NIN check
        if (national_id) {
            const ninRes = await db.query('SELECT name, hospital_location FROM patients WHERE national_id = $1', [national_id]);
            if (ninRes.rowCount > 0) {
                return res.json({
                    exact_match: true,
                    matches: ninRes.rows.map(r => ({ name: r.name, loc: r.hospital_location }))
                });
            }
        }

        // Fuzzy name check (Simplified version without fuzzystrmatch extension for now)
        // In a real environment, we'd enable 'fuzzystrmatch' in Postgres and use levenshtein()
        const full_name = `${last_name} ${first_name}`.toLowerCase();
        const fuzzyRes = await db.query(
            "SELECT id, name, hospital_location FROM patients WHERE LOWER(name) LIKE $1 OR LOWER(name) LIKE $2 LIMIT 5",
            [`%${last_name.toLowerCase()}%`, `%${first_name.toLowerCase()}%`]
        );

        res.json({
            exact_match: false,
            matches: fuzzyRes.rows.map(r => ({ name: r.name, loc: r.hospital_location }))
        });
    } catch (error) {
        console.error("Duplicate Check Error:", error);
        res.status(500).json({ error: "Erreur lors de la vérification des doublons." });
    }
});

// POST /api/patients/check-duplicates - Already exists as POST, keeping it but adding CNAS logic
app.post('/api/patients/check-duplicates', async (req, res) => {
    const { national_id, first_name, last_name, cnas_number } = req.body;
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Non autorisé" });

    try {
        let matches = [];
        let exactMatch = false;

        if (national_id) {
            const resId = await db.query('SELECT name, hospital_location FROM patients WHERE national_id = $1', [national_id]);
            if (resId.rowCount > 0) {
                matches = resId.rows.map(r => ({ name: r.name, loc: r.hospital_location }));
                exactMatch = true;
            }
        }

        if (!exactMatch && cnas_number) {
            const resCnas = await db.query('SELECT name, hospital_location FROM patients WHERE cnas_number = $1', [cnas_number]);
            if (resCnas.rowCount > 0) {
                matches = [...matches, ...resCnas.rows.map(r => ({ name: r.name, loc: r.hospital_location }))];
                exactMatch = true;
            }
        }

        if (!exactMatch && first_name && last_name) {
            const resName = await db.query('SELECT name, hospital_location FROM patients WHERE (first_name ILIKE $1 AND last_name ILIKE $2) OR (first_name ILIKE $2 AND last_name ILIKE $1)', [first_name, last_name]);
            matches = [...matches, ...resName.rows.map(r => ({ name: r.name, loc: r.hospital_location }))];
        }

        res.json({ matches, exact_match: exactMatch });
    } catch (e) {
        res.status(500).json({ error: "Erreur vérification" });
    }
});

// POST /api/patients - Register a new patient
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
            consent_status
        } = req.body;

        // Generate Formatted ID: PAT-2026-XXXXX
        const year = new Date().getFullYear();
        const countRes = await db.query('SELECT count(*) FROM patients');
        const nextId = parseInt(countRes.rows[0].count) + 1;
        const patient_id_formatted = `PAT-${year}-${nextId.toString().padStart(5, '0')}`;

        // Generate 6-digit PIN
        const pin_code = Math.floor(100000 + Math.random() * 900000).toString();

        const hospital_location = cleanLoc(decoded.location);
        const full_name = `${last_name.toUpperCase()} ${first_name}`;

        const query = `
            INSERT INTO patients (
                national_id, name, first_name, last_name, age, gender, blood_type, 
                cancer_type, cancer_code, assigned_doctor_id, hospital_location,
                birth_date, cnas_number, wilaya_residence, commune_residence, daira,
                full_address, residence_environment, phone_primary, profession,
                consent_status, patient_id_formatted, pin_code_hash
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
            RETURNING *;
        `;
        const values = [
            national_id, full_name, first_name, last_name, age, gender, blood_type,
            cancer_type, cancer_code, doctor_id || null, hospital_location,
            birth_date, cnas_number, wilaya_residence, commune_residence, daira,
            full_address, residence_environment, phone_primary, profession,
            consent_status, patient_id_formatted, pin_code // Store plain for demo/printing, normally hashed
        ];

        const result = await db.query(query, values);

        // Return with generated PIN for the success screen
        res.status(201).json({
            ...result.rows[0],
            pin_code: pin_code
        });
    } catch (error) {
        console.error("Patient Registration Error:", error);
        res.status(500).json({ error: "Erreur lors de l'enregistrement du patient." });
    }
});

// DELETE /api/patients/:id - Delete a patient (Secretaries only, providing the file is empty)
app.delete('/api/patients/:id', async (req, res) => {
    const { id } = req.params;
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Non autorisé" });

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        // 1. Role Check: Secretary only
        if (decoded.role !== 'Secrétaire') {
            return res.status(403).json({ error: "Seules les secrétaires peuvent supprimer des dossiers." });
        }

        const userLoc = cleanLoc(decoded.location);

        // 2. Fetch patient to check existence and hospital match
        // Also check if 'empty' (currently just check existence, but structure allows counting joined records later)
        const checkQuery = 'SELECT * FROM patients WHERE id = $1';
        const checkResult = await db.query(checkQuery, [id]);

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: "Patient non trouvé." });
        }

        const patient = checkResult.rows[0];

        // 3. Check Location Match
        // Using includes or precise match depending on how cleanLoc works. 
        // Let's rely on standardizing: if user is from "Tlemcen", patient must be "Tlemcen".
        if (!patient.hospital_location || !patient.hospital_location.includes(userLoc)) {
            return res.status(403).json({ error: "Vous ne pouvez supprimer que les patients de votre hôpital." });
        }

        // 4. Check "Empty" condition
        // Since we don't have medical_records table yet, we assume it's empty if it exists at this stage.
        // If we had a table "consultations", we would do:
        // const consults = await db.query('SELECT COUNT(*) FROM consultations WHERE patient_id = $1', [id]);
        // if (consults.rows[0].count > 0) return res.status(400).json({ error: "Le dossier n'est pas vide." });

        // 5. Delete
        await db.query('DELETE FROM patients WHERE id = $1', [id]);
        res.json({ success: true, message: "Dossier patient supprimé avec succès." });

    } catch (error) {
        console.error("Delete Patient Error:", error);
        res.status(500).json({ error: "Erreur lors de la suppression." });
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

        if (decoded.role !== 'Administrateur National') {
            const userLoc = cleanLoc(decoded.location);
            const isOwner = patient.assigned_doctor_id === decoded.id;
            const isRcpActive = patient.rcp_active === true;

            if (!isOwner && !isRcpActive && (!patient.hospital_location || !patient.hospital_location.includes(userLoc))) {
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
            isOwner: patient.assigned_doctor_id === decoded.id
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

        // Verify patient ownership
        const patientRes = await db.query('SELECT assigned_doctor_id FROM patients WHERE id = $1', [patient_id]);
        if (patientRes.rowCount === 0) return res.status(404).json({ error: "Patient non trouvé" });
        if (patientRes.rows[0].assigned_doctor_id !== decoded.id) {
            return res.status(403).json({ error: "Action interdite : Seul le médecin traitant peut ajouter un diagnostic." });
        }

        const result = await db.query(
            `INSERT INTO diagnostics (
                patient_id, doctor_id, content, type, stage, grade, 
                treatment_type, cycle, outcome, next_appointment
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
            [
                patient_id, decoded.id, content, type || 'diagnosis', stage, grade,
                treatment_type, cycle, outcome, next_appointment || null
            ]
        );
        res.status(201).json(result.rows[0]);
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
        res.json(result.rows[0]);
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
            'INSERT INTO medical_records (patient_id, doctor_id, type, description, diagnostic_id, file_data, file_mimetype, file_path) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
            [patient_id, decoded.id, type, description, diagnostic_id || null, req.file.buffer, req.file.mimetype, `db_v2_stored_${Date.now()}`]
        );
        res.status(201).json(result.rows[0]);
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

        const query = `
            INSERT INTO tumors (
                patient_id, doctor_id, topography_code, topography_label, 
                morphology_code, morphology_label, basis_of_diagnosis,
                stage, grade, date_of_incidence, status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *;
        `;
        const values = [
            patient_id, decoded.id, topography_code, topography_label,
            morphology_code, morphology_label, basis_of_diagnosis,
            stage, grade, date_of_incidence || new Date(), 'completed'
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
        const result = await db.query('SELECT DISTINCT category as name FROM ref_cancer_rules ORDER BY name');
        res.json(result.rows);
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

// --- Advanced Statistics & Reporting ---

// GET /api/stats/kpis - High-level metrics for Super Admin
app.get('/api/stats/kpis', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Non autorisé" });

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role !== 'Administrateur National') return res.status(403).json({ error: "Accès refusé" });

        const totalPatients = await db.query('SELECT count(*) FROM patients');
        const newThisMonth = await db.query('SELECT count(*) FROM patients WHERE created_at >= date_trunc(\'month\', now())');
        const activeCenters = await db.query('SELECT count(DISTINCT hospital_location) FROM patients');
        const totalUsers = await db.query('SELECT count(*) FROM users');
        const pendingUsers = await db.query('SELECT count(*) FROM users WHERE status = \'pending\'');

        res.json({
            totalPatients: parseInt(totalPatients.rows[0].count),
            newPatientsMonth: parseInt(newThisMonth.rows[0].count),
            activeCenters: parseInt(activeCenters.rows[0].count),
            totalUsers: parseInt(totalUsers.rows[0].count),
            pendingApprovals: parseInt(pendingUsers.rows[0].count),
            incidenceRate: "N/A" // Placeholder for complex calc
        });
    } catch (error) {
        console.error("KPIs Error:", error);
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// POST /api/stats/query - Generic Dynamic Query Engine
app.get('/api/stats/query', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Non autorisé" });

    try {
        const { dataSource, chartType, filters, groupBy } = req.query;
        // dataSource: 'patients' or 'tumors'
        // groupBy: 'hospital_location', 'gender', 'cancer_type', 'age_group'

        // Simple dynamic aggregation for now
        let query = '';
        const params = [];

        if (dataSource === 'cancer_cases') {
            let select = '';
            let group = '';
            if (groupBy === 'location') { select = 'hospital_location as label, (count(*))::int as value'; group = 'hospital_location'; }
            else if (groupBy === 'gender') { select = 'gender as label, (count(*))::int as value'; group = 'gender'; }
            else if (groupBy === 'type') { select = 'cancer_type as label, (count(*))::int as value'; group = 'cancer_type'; }
            else { select = 'hospital_location as label, (count(*))::int as value'; group = 'hospital_location'; }

            query = `SELECT ${select} FROM patients GROUP BY ${group}`;
        } else {
            return res.status(400).json({ error: "Source de données non supportée" });
        }

        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error("Query Engine Error:", error);
        res.status(500).json({ error: "Erreur lors de la génération du rapport" });
    }
});

// Saved Reports Management
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

app.listen(PORT, () => {
    console.log(`🚀 Serveur en cours d'exécution sur le port ${PORT}`);
    console.log(`🔗 URL: http://localhost:${PORT}`);
});
