import React, { useState, useEffect, useMemo } from 'react';
import { X, UserPlus, Loader2, CheckCircle, FileText, Stethoscope, Shield, Activity, MapPin, Users, Key, Printer, ArrowRight, ArrowLeft } from 'lucide-react';
import axios from 'axios';

interface AddPatientModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUser: any;
}

const AddPatientModal: React.FC<AddPatientModalProps> = ({ isOpen, onClose, currentUser }) => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        national_id: '',
        first_name: '',
        last_name: '',
        birth_date: '',
        age: '',
        gender: 'Homme',
        blood_type: 'A+',
        cnas_number: '',
        wilaya_residence: 'Tlemcen (13)',
        commune_residence: '',
        daira: '',
        full_address: '',
        residence_environment: 'Urbain',
        phone_primary: '',
        profession: '',
        education_level: 'Primaire',
        marital_status: 'Célibataire',
        cancer_category: '',
        doctor_id: '',
        consent_status: 'Signé'
    });

    const [categories, setCategories] = useState<{ name: string }[]>([]);
    const [selectedCategoryData, setSelectedCategoryData] = useState<any>(null);
    const [genderAlert, setGenderAlert] = useState<string | null>(null);
    const [duplicates, setDuplicates] = useState<{ name: string, loc: string }[]>([]);
    const [exactMatch, setExactMatch] = useState(false);
    const [doctors, setDoctors] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [createdPatient, setCreatedPatient] = useState<any>(null);

    // Mock data for Tlemcen communes
    const communesTlemcen: Record<string, string> = {
        "Tlemcen": "Tlemcen",
        "Maghnia": "Maghnia",
        "Mansourah": "Mansourah",
        "Chetouane": "Tlemcen",
        "Remchi": "Remchi",
        "Hennaya": "Tlemcen",
        "Ghazaouet": "Ghazaouet",
        "Nedroma": "Nedroma",
        "Sebdou": "Sebdou",
        "Ouled Mimoun": "Ouled Mimoun"
    };

    useEffect(() => {
        if (isOpen) {
            setStep(1);
            fetchDoctors();
            fetchCategories();
            setStatus('idle');
            setCreatedPatient(null);
            setDuplicates([]);
            setExactMatch(false);
        }
    }, [isOpen]);

    const fetchCategories = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5000/api/reference/cancer-categories', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCategories(response.data);
        } catch (error) {
            console.error("Fetch Categories Error:", error);
        }
    };

    const fetchDoctors = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5000/api/users', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const hospitalDoctors = response.data.filter((u: any) => u.role === 'Médecin' && u.status === 'active');
            setDoctors(hospitalDoctors);
        } catch (error) {
            console.error("Fetch Doctors Error:", error);
        }
    };

    // Auto-calculate Age from Birth Date
    useEffect(() => {
        if (formData.birth_date) {
            const birth = new Date(formData.birth_date);
            const today = new Date();
            let age = today.getFullYear() - birth.getFullYear();
            const m = today.getMonth() - birth.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
                age--;
            }
            setFormData(prev => ({ ...prev, age: age.toString() }));
        }
    }, [formData.birth_date]);

    // Handle Commune Change (Auto-daira)
    const handleCommuneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setFormData(prev => ({ ...prev, commune_residence: val, daira: communesTlemcen[val] || val }));
    };

    const checkDuplicates = async () => {
        if (!formData.national_id && !formData.cnas_number && (!formData.first_name || !formData.last_name)) return;
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('http://localhost:5000/api/patients/check-duplicates', {
                first_name: formData.first_name,
                last_name: formData.last_name,
                national_id: formData.national_id,
                cnas_number: formData.cnas_number
            }, { headers: { Authorization: `Bearer ${token}` } });
            setDuplicates(res.data.matches || []);
            setExactMatch(res.data.exact_match || false);
        } catch (e) {
            console.error("Dupe check failed", e);
        }
    };

    const nextStep = async () => {
        if (step === 1) {
            await checkDuplicates();
            if (exactMatch) {
                alert("ERREUR CRITIQUE : Ce patient est déjà enregistré (Doublon CNI).");
                return;
            }
        }
        setStep(prev => Math.min(prev + 1, 4));
    };

    const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const dataToSubmit = {
                ...formData,
                cancer_type: formData.cancer_category
            };
            const response = await axios.post('http://localhost:5000/api/patients', dataToSubmit, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCreatedPatient(response.data);
            setStatus('success');
        } catch (error) {
            setStatus('error');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
            <div className="modal-content" style={{
                backgroundColor: '#ffffff', borderRadius: '32px', width: '100%', maxWidth: '700px',
                padding: '40px', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                maxHeight: '90vh', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.1)'
            }}>
                <button onClick={onClose} style={{
                    position: 'absolute', top: '24px', right: '24px', background: '#f8fafc', border: 'none',
                    cursor: 'pointer', color: '#64748b', padding: '8px', borderRadius: '12px'
                }}>
                    <X size={20} />
                </button>

                {status !== 'success' && (
                    <div style={{ marginBottom: '32px' }}>
                        <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a', marginBottom: '8px' }}>
                            Admission de Nouveau Patient
                        </h2>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                            {[1, 2, 3, 4].map(s => (
                                <div key={s} style={{
                                    flex: 1, height: '6px', borderRadius: '3px',
                                    backgroundColor: step >= s ? '#2563eb' : '#e2e8f0',
                                    transition: 'all 0.3s ease'
                                }} />
                            ))}
                        </div>
                    </div>
                )}

                {status === 'success' ? (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <div style={{ width: '120px', height: '120px', backgroundColor: '#dcfce7', borderRadius: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                            <CheckCircle size={64} color="#16a34a" />
                        </div>
                        <h3 style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a', marginBottom: '8px' }}>Enregistrement Réussi !</h3>
                        <p style={{ color: '#64748b', marginBottom: '32px' }}>Le patient a été ajouté au registre national avec succès.</p>

                        <div style={{ backgroundColor: '#f8fafc', borderRadius: '24px', padding: '32px', border: '2px dashed #e2e8f0', textAlign: 'left', marginBottom: '32px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                                <div>
                                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Patient ID</label>
                                    <div style={{ fontSize: '24px', fontWeight: '900', color: '#1e40af' }}>{createdPatient?.patient_id_formatted}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Code PIN</label>
                                    <div style={{ fontSize: '24px', fontWeight: '900', color: '#ef4444' }}>{createdPatient?.pin_code}</div>
                                </div>
                            </div>
                            <div style={{ padding: '12px', backgroundColor: '#fffbeb', borderRadius: '12px', border: '1px solid #fef3c7', display: 'flex', gap: '12px' }}>
                                <Shield size={20} color="#92400e" />
                                <p style={{ fontSize: '12px', color: '#92400e', margin: 0 }}>
                                    <strong>IMPORTANT :</strong> Remettez ce code PIN au patient. Il est indispensable pour les futurs transferts inter-hospitaliers.
                                </p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '16px' }}>
                            <button className="login-button" style={{ flex: 1, backgroundColor: '#0f172a' }} onClick={() => window.print()}>
                                <Printer size={18} /> Imprimer la Carte
                            </button>
                            <button className="login-button" style={{ flex: 1, backgroundColor: '#f8fafc', color: '#0f172a', border: '1px solid #e2e8f0' }} onClick={onClose}>
                                Fermer
                            </button>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {/* STEP 1: IDENTITE */}
                        {step === 1 && (
                            <div style={{ animation: 'fadeIn 0.3s ease' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', color: '#2563eb' }}>
                                    <FileText size={20} /> <span style={{ fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Étape 1 : Identification Civile</span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div style={{ gridColumn: 'span 2' }}>
                                        <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '8px', display: 'block' }}>Numéro CNI (Carte Nationale)</label>
                                        <input
                                            type="text" className="login-input" style={{ width: '100%' }}
                                            placeholder="12 chiffres obligatoires"
                                            value={formData.national_id}
                                            onChange={e => setFormData({ ...formData, national_id: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '8px', display: 'block' }}>Nom de famille</label>
                                        <input
                                            type="text" className="login-input" style={{ width: '100%', textTransform: 'uppercase' }}
                                            value={formData.last_name}
                                            onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '8px', display: 'block' }}>Prénom</label>
                                        <input
                                            type="text" className="login-input" style={{ width: '100%' }}
                                            value={formData.first_name}
                                            onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '8px', display: 'block' }}>Date de naissance</label>
                                        <input
                                            type="date" className="login-input" style={{ width: '100%' }}
                                            value={formData.birth_date}
                                            onChange={e => setFormData({ ...formData, birth_date: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '8px', display: 'block' }}>Genre</label>
                                        <select
                                            className="login-input" style={{ width: '100%' }}
                                            value={formData.gender}
                                            onChange={e => setFormData({ ...formData, gender: e.target.value })}
                                        >
                                            <option value="Homme">Homme</option>
                                            <option value="Femme">Femme</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP 2: LOCALISATION */}
                        {step === 2 && (
                            <div style={{ animation: 'fadeIn 0.3s ease' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', color: '#9a3412' }}>
                                    <MapPin size={20} /> <span style={{ fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Étape 2 : Sécurité & Domiciliation</span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div style={{ gridColumn: 'span 2' }}>
                                        <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '8px', display: 'block' }}>Numéro CNAS (Sécurité Sociale)</label>
                                        <input
                                            type="text" className="login-input" style={{ width: '100%' }}
                                            placeholder="Ex: 0987654321A"
                                            value={formData.cnas_number}
                                            onChange={e => setFormData({ ...formData, cnas_number: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '8px', display: 'block' }}>Wilaya de résidence</label>
                                        <select className="login-input" style={{ width: '100%' }} value={formData.wilaya_residence} disabled>
                                            <option>Tlemcen (13)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '8px', display: 'block' }}>Commune</label>
                                        <select
                                            className="login-input" style={{ width: '100%' }}
                                            value={formData.commune_residence}
                                            onChange={handleCommuneChange}
                                        >
                                            <option value="">Choisir...</option>
                                            {Object.keys(communesTlemcen).map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div style={{ gridColumn: 'span 2' }}>
                                        <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '8px', display: 'block' }}>Adresse complète</label>
                                        <input
                                            type="text" className="login-input" style={{ width: '100%' }}
                                            placeholder="Cité, Rue, N° de porte..."
                                            value={formData.full_address}
                                            onChange={e => setFormData({ ...formData, full_address: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP 3: SOCIO-DEMO */}
                        {step === 3 && (
                            <div style={{ animation: 'fadeIn 0.3s ease' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', color: '#059669' }}>
                                    <Users size={20} /> <span style={{ fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Étape 3 : Données Socio-Démographiques</span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '8px', display: 'block' }}>Profession</label>
                                        <input
                                            type="text" className="login-input" style={{ width: '100%' }}
                                            value={formData.profession}
                                            onChange={e => setFormData({ ...formData, profession: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '8px', display: 'block' }}>Niveau d'instruction</label>
                                        <select
                                            className="login-input" style={{ width: '100%' }}
                                            value={formData.education_level}
                                            onChange={e => setFormData({ ...formData, education_level: e.target.value })}
                                        >
                                            <option value="Aucun">Aucun</option>
                                            <option value="Primaire">Primaire</option>
                                            <option value="Moyen">Moyen</option>
                                            <option value="Secondaire">Secondaire</option>
                                            <option value="Universitaire">Universitaire</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '8px', display: 'block' }}>État Civil</label>
                                        <select
                                            className="login-input" style={{ width: '100%' }}
                                            value={formData.marital_status}
                                            onChange={e => setFormData({ ...formData, marital_status: e.target.value })}
                                        >
                                            <option value="Célibataire">Célibataire</option>
                                            <option value="Marié(e)">Marié(e)</option>
                                            <option value="Divorcé(e)">Divorcé(e)</option>
                                            <option value="Veuf/Veuve">Veuf/Veuve</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '8px', display: 'block' }}>Téléphone</label>
                                        <input
                                            type="text" className="login-input" style={{ width: '100%' }}
                                            value={formData.phone_primary}
                                            onChange={e => setFormData({ ...formData, phone_primary: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP 4: CLINIQUE & CONSENTEMENT */}
                        {step === 4 && (
                            <div style={{ animation: 'fadeIn 0.3s ease' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', color: '#4f46e5' }}>
                                    <Stethoscope size={20} /> <span style={{ fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Étape 4 : Parcours de Soins</span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div style={{ gridColumn: 'span 2' }}>
                                        <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '8px', display: 'block' }}>Suspicion de Cancer (Organe)</label>
                                        <select
                                            className="login-input" style={{ width: '100%' }}
                                            value={formData.cancer_category}
                                            onChange={e => setFormData({ ...formData, cancer_category: e.target.value })}
                                        >
                                            <option value="">Sélectionner l'organe...</option>
                                            {categories.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div style={{ gridColumn: 'span 2' }}>
                                        <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '8px', display: 'block' }}>Médecin Responsable</label>
                                        <select
                                            className="login-input" style={{ width: '100%' }}
                                            value={formData.doctor_id}
                                            onChange={e => setFormData({ ...formData, doctor_id: e.target.value })}
                                        >
                                            <option value="">Choisir un médecin...</option>
                                            {doctors.map(d => <option key={d.id} value={d.id}>Dr. {d.name} ({d.specialty})</option>)}
                                        </select>
                                    </div>
                                    <div style={{ gridColumn: 'span 2', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <div>
                                                <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>Consentement Éclairé</div>
                                                <div style={{ fontSize: '12px', color: '#64748b' }}>Le patient a signé le formulaire de consentement CanReg.</div>
                                            </div>
                                            <select
                                                className="login-input" style={{ width: 'auto' }}
                                                value={formData.consent_status}
                                                onChange={e => setFormData({ ...formData, consent_status: e.target.value })}
                                            >
                                                <option value="Signé">Signé</option>
                                                <option value="Refusé">Refusé</option>
                                                <option value="En attente">En attente</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', gap: '16px' }}>
                            {step > 1 && (
                                <button className="login-button" style={{ flex: 1, backgroundColor: '#f1f5f9', color: '#475569' }} onClick={prevStep}>
                                    <ArrowLeft size={18} /> Précédent
                                </button>
                            )}
                            {step < 4 ? (
                                <button className="login-button" style={{ flex: 2 }} onClick={nextStep}>
                                    Continuer <ArrowRight size={18} />
                                </button>
                            ) : (
                                <button className="login-button" style={{ flex: 2 }} onClick={handleSubmit} disabled={loading}>
                                    {loading ? <Loader2 className="animate-spin" size={18} /> : <UserPlus size={18} />}
                                    {loading ? 'Finalisation...' : 'Valider l\'Admission'}
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AddPatientModal;
