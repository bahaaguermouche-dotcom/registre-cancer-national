import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Users, AlertTriangle, CheckCircle, ArrowRightLeft, Search } from 'lucide-react';

interface Suspect {
    id1: string;
    id2: string;
    reason: string;
    name1: string;
    loc1: string;
    date1: string;
    name2: string;
    loc2: string;
    date2: string;
}

interface Patient {
    id: string;
    name: string;
    first_name: string;
    last_name: string;
    national_id: string;
    cnas_number: string;
    birth_date: string;
    gender: string;
    hospital_location: string;
    created_at: string;
    [key: string]: any;
}

// Helper: Levenshtein distance for fuzzy matching
const getLevenshteinDistance = (a: string, b: string): number => {
    const str1 = (a || '').toString().toLowerCase();
    const str2 = (b || '').toString().toLowerCase();
    
    const track = Array(str2.length + 1).fill(null).map(() =>
        Array(str1.length + 1).fill(null));
    for (let i = 0; i <= str1.length; i += 1) track[0][i] = i;
    for (let j = 0; j <= str2.length; j += 1) track[j][0] = j;
    for (let j = 1; j <= str2.length; j += 1) {
        for (let i = 1; i <= str1.length; i += 1) {
            const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
            track[j][i] = Math.min(
                track[j][i - 1] + 1,
                track[j - 1][i] + 1,
                track[j - 1][i - 1] + indicator,
            );
        }
    }
    return track[str2.length][str1.length];
};

// Helper: Normalize string (lowercase, no spaces, no accents)
const normalize = (str: string): string => {
    return (str || '')
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[\s-]/g, "");
};

const DuplicateManagement: React.FC = () => {
    const [suspects, setSuspects] = useState<Suspect[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPair, setSelectedPair] = useState<Suspect | null>(null);
    const [masterPatient, setMasterPatient] = useState<Patient | null>(null);
    const [slavePatient, setSlavePatient] = useState<Patient | null>(null);
    const [mergeLoading, setMergeLoading] = useState(false);

    const token = localStorage.getItem('token');
    const config = { headers: { Authorization: `Bearer ${token}` } };

    useEffect(() => {
        fetchSuspects();
    }, []);

    const fetchSuspects = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/patients/duplicates/potential`, config);
            setSuspects(res.data);
        } catch (err) {
            toast.error("Erreur lors de la récupération des doublons potentiels.");
        } finally {
            setLoading(false);
        }
    };

    const handleSelectPair = async (pair: Suspect) => {
        setSelectedPair(pair);
        setMasterPatient(null);
        setSlavePatient(null);
        try {
            const [p1, p2] = await Promise.all([
                axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/patients/${pair.id1}`, config),
                axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/patients/${pair.id2}`, config)
            ]);
            setMasterPatient(p1.data.patient);
            setSlavePatient(p2.data.patient);
        } catch (err) {
            toast.error("Erreur lors du chargement des détails.");
        }
    };

    const handleIgnore = async (pair: Suspect) => {
        try {
            await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/patients/duplicates/ignore`, {
                patient_id_1: pair.id1,
                patient_id_2: pair.id2
            }, config);
            toast.success("Doublon ignoré.");
            setSuspects(suspects.filter(s => s.id1 !== pair.id1 || s.id2 !== pair.id2));
            if (selectedPair?.id1 === pair.id1) setSelectedPair(null);
        } catch (err) {
            toast.error("Erreur opération.");
        }
    };

    const handleMerge = async () => {
        if (!masterPatient || !slavePatient) return;
        if (!window.confirm("Êtes-vous sûr de vouloir fusionner ces deux dossiers ? Cette action est irréversible et supprimera le dossier doublon.")) return;
        
        setMergeLoading(true);
        try {
            await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/patients/merge`, {
                master_id: masterPatient.id,
                slave_id: slavePatient.id,
                kept_data: {} 
            }, config);
            toast.success("Fusion effectuée !");
            setSuspects(suspects.filter(s => 
                (s.id1 !== masterPatient.id && s.id1 !== slavePatient.id) && 
                (s.id2 !== masterPatient.id && s.id2 !== slavePatient.id)
            ));
            setSelectedPair(null);
            fetchSuspects();
        } catch (err: any) {
            console.error("Merge error:", err);
            const msg = err.response?.data?.error || "Erreur lors de la fusion.";
            toast.error(msg);
        } finally {
            setMergeLoading(false);
        }
    };

    const swapMasterSlave = () => {
        const temp = masterPatient;
        setMasterPatient(slavePatient);
        setSlavePatient(temp);
    };

    // Advanced comparison logic for the UI
    const getComparisonStatus = (val1: any, val2: any, type: 'text' | 'id' | 'date' = 'text') => {
        const s1 = (val1 || '').toString().trim();
        const s2 = (val2 || '').toString().trim();

        if (!s1 || !s2) return 'none'; // Ignore if one is empty
        if (s1 === s2) return 'match'; // Perfect match

        if (type === 'id') {
            const dist = getLevenshteinDistance(s1, s2);
            if (dist <= 2) return 'fuzzy'; // Typo suspected
        }

        if (type === 'text') {
            if (normalize(s1) === normalize(s2)) return 'match'; // Name match ignoring spaces/accents
        }

        if (type === 'date') {
            const d1 = new Date(s1).getTime();
            const d2 = new Date(s2).getTime();
            if (d1 === d2) return 'match';
        }

        return 'diff';
    };

    return (
        <div className="dashboard-page animate-fadeIn">
            <div className="dashboard-header">
                <div>
                    <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <ArrowRightLeft style={{ color: '#00AAFF' }} /> Gestion des Doublons
                    </h1>
                    <p className="page-subtitle">Détectez et fusionnez les dossiers patients en double pour garantir la qualité des données nationales.</p>
                </div>
                <div style={{ backgroundColor: '#f0f9ff', color: '#00AAFF', padding: '8px 20px', borderRadius: '12px', fontWeight: '800', fontSize: '14px', border: '1px solid #00AAFF20' }}>
                    {suspects.length} Doublons Détectés
                </div>
            </div>

            <div className="duplicate-grid">
                {/* Liste des suspects */}
                <div className="card-container suspect-list">
                    <div className="search-bar-container" style={{ padding: '16px 24px' }}>
                        <span style={{ fontWeight: '700', color: '#475569' }}>Paires Suspectes</span>
                        <Search size={16} style={{ position: 'absolute', right: '24px', color: '#94a3b8' }} />
                    </div>
                    
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {loading ? (
                            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Chargement...</div>
                        ) : suspects.length === 0 ? (
                            <div style={{ padding: '60px', textAlign: 'center' }}>
                                <CheckCircle size={48} style={{ color: '#10b981', margin: '0 auto 16px', opacity: 0.5 }} />
                                <p style={{ color: '#64748b' }}>Aucun doublon détecté !</p>
                            </div>
                        ) : (
                            suspects.map((s) => (
                                <div
                                    key={`${s.id1}-${s.id2}`}
                                    onClick={() => handleSelectPair(s)}
                                    className={`suspect-item ${selectedPair?.id1 === s.id1 ? 'active' : ''}`}
                                >
                                    <p style={{ fontWeight: '800', color: '#1e293b', fontSize: '14px', margin: 0 }}>{s.name1}</p>
                                    <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{s.loc1}</p>
                                    
                                    <div className="reason-badge">
                                        <AlertTriangle size={12} />
                                        {s.reason}
                                    </div>
                                    
                                    <p style={{ fontWeight: '800', color: '#1e293b', fontSize: '14px', margin: 0 }}>{s.name2}</p>
                                    <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{s.loc2}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Détails et Fusion */}
                <div className="card-container comparison-container">
                    {!selectedPair ? (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifySelf: 'center', alignSelf: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px' }}>
                            <Users size={64} style={{ color: '#e2e8f0', marginBottom: '20px' }} />
                            <p style={{ color: '#94a3b8', fontWeight: '600' }}>Sélectionnez une paire à comparer</p>
                            <p style={{ color: '#cbd5e1', fontSize: '13px', marginTop: '8px', maxWidth: '300px' }}>Comparez les informations détaillées avant de procéder à la fusion des dossiers.</p>
                        </div>
                    ) : (
                        <>
                            <div style={{ padding: '20px 32px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
                                <h2 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Comparaison des dossiers</h2>
                                <button 
                                    onClick={swapMasterSlave}
                                    className="btn-action"
                                    style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}
                                >
                                    <ArrowRightLeft size={14} /> Inverser les rôles
                                </button>
                            </div>

                            <div className="comparison-columns">
                                {/* Master Column */}
                                <div className="comparison-column">
                                    <div style={{ backgroundColor: '#f0f9ff', color: '#0088FF', fontSize: '10px', fontWeight: '900', padding: '4px 12px', borderRadius: '6px', width: 'fit-content', marginBottom: '24px', letterSpacing: '0.05em' }}>
                                        DOSSIER MAÎTRE (À CONSERVER)
                                    </div>
                                    {masterPatient && slavePatient ? (
                                        <div className="animate-fadeIn">
                                            <DataField 
                                                label="Nom Complet" 
                                                value={masterPatient.name} 
                                                status={getComparisonStatus(masterPatient.name, slavePatient.name, 'text')}
                                            />
                                            <DataField 
                                                label="National ID (NIN)" 
                                                value={masterPatient.national_id} 
                                                status={getComparisonStatus(masterPatient.national_id, slavePatient.national_id, 'id')}
                                            />
                                            <DataField 
                                                label="N° CNAS" 
                                                value={masterPatient.cnas_number} 
                                                status={getComparisonStatus(masterPatient.cnas_number, slavePatient.cnas_number, 'id')}
                                            />
                                            <DataField 
                                                label="Date de Naissance" 
                                                value={new Date(masterPatient.birth_date).toLocaleDateString()} 
                                                status={getComparisonStatus(masterPatient.birth_date, slavePatient.birth_date, 'date')}
                                            />
                                            <DataField label="Sexe" value={masterPatient.gender} />
                                            <DataField label="Établissement" value={masterPatient.hospital_location} />
                                            <DataField label="Date d'enregistrement" value={new Date(masterPatient.created_at).toLocaleDateString()} />
                                        </div>
                                    ) : <div style={{ color: '#94a3b8' }}>Chargement...</div>}
                                </div>

                                {/* Slave Column */}
                                <div className="comparison-column" style={{ backgroundColor: '#fffaf5' }}>
                                    <div style={{ backgroundColor: '#fff1e2', color: '#ea580c', fontSize: '10px', fontWeight: '900', padding: '4px 12px', borderRadius: '6px', width: 'fit-content', marginBottom: '24px', letterSpacing: '0.05em' }}>
                                        DOSSIER DOUBLON (À SUPPRIMER)
                                    </div>
                                    {slavePatient && masterPatient ? (
                                        <div className="animate-fadeIn">
                                            <DataField 
                                                label="Nom Complet" 
                                                value={slavePatient.name} 
                                                status={getComparisonStatus(slavePatient.name, masterPatient.name, 'text')}
                                            />
                                            <DataField 
                                                label="National ID (NIN)" 
                                                value={slavePatient.national_id} 
                                                status={getComparisonStatus(slavePatient.national_id, masterPatient.national_id, 'id')}
                                            />
                                            <DataField 
                                                label="N° CNAS" 
                                                value={slavePatient.cnas_number} 
                                                status={getComparisonStatus(slavePatient.cnas_number, masterPatient.cnas_number, 'id')}
                                            />
                                            <DataField 
                                                label="Date de Naissance" 
                                                value={new Date(slavePatient.birth_date).toLocaleDateString()} 
                                                status={getComparisonStatus(slavePatient.birth_date, masterPatient.birth_date, 'date')}
                                            />
                                            <DataField label="Sexe" value={slavePatient.gender} />
                                            <DataField label="Établissement" value={slavePatient.hospital_location} />
                                            <DataField label="Date d'enregistrement" value={new Date(slavePatient.created_at).toLocaleDateString()} />
                                        </div>
                                    ) : <div style={{ color: '#94a3b8' }}>Chargement...</div>}
                                </div>
                            </div>

                            <div className="comparison-footer">
                                <button 
                                    onClick={() => handleIgnore(selectedPair)}
                                    style={{ background: 'none', border: 'none', color: '#64748b', fontWeight: '600', cursor: 'pointer', fontSize: '14px' }}
                                >
                                    Marquer comme différents
                                </button>
                                <button 
                                    onClick={handleMerge}
                                    disabled={mergeLoading || !masterPatient || !slavePatient}
                                    className="btn-register"
                                    style={{ padding: '14px 32px' }}
                                >
                                    {mergeLoading ? 'Fusion en cours...' : <><ArrowRightLeft size={18} /> Fusionner les dossiers</>}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

const DataField = ({ label, value, status = 'none' }: { label: string; value: any; status?: 'none' | 'match' | 'diff' | 'fuzzy' }) => {
    const getStyle = () => {
        if (status === 'match') return { backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #dcfce7' };
        if (status === 'fuzzy') return { backgroundColor: '#fffbeb', color: '#d97706', border: '1px solid #fef3c7' };
        if (status === 'diff') return { backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fee2e2' };
        return { backgroundColor: '#f8fafc', color: '#1e293b', border: '1px solid #e2e8f0' };
    };

    return (
        <div className="data-field">
            <p className="data-field-label">{label}</p>
            <div className="data-field-value" style={getStyle()}>
                {value || '---'}
                {status === 'fuzzy' && <span style={{ display: 'block', fontSize: '10px', marginTop: '4px', fontWeight: 'bold' }}>⚠️ Suspicion d'erreur de saisie</span>}
                {status === 'match' && <span style={{ display: 'block', fontSize: '10px', marginTop: '4px', fontWeight: 'bold' }}>✅ Identique</span>}
            </div>
        </div>
    );
};

export default DuplicateManagement;
