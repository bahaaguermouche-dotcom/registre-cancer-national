import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface DiagnosisFormProps {
    patientId: string;
    initialData?: any;
    onClose: () => void;
    onSaved: () => void;
}

const CancerDiagnosisForm: React.FC<DiagnosisFormProps> = ({ patientId, initialData, onClose, onSaved }) => {
    const [formData, setFormData] = useState({
        topography_code: initialData?.topography_code || '',
        morphology_code: initialData?.morphology_code || '',
        tnm_t: '',
        tnm_n: '',
        tnm_m: '',
        grade: initialData?.grade?.includes('1') ? 'G1' : 
               initialData?.grade?.includes('2') ? 'G2' : 
               initialData?.grade?.includes('3') ? 'G3' : 
               initialData?.grade?.includes('4') ? 'G4' : '',
        lateralite: '',
        notes: initialData?.stage ? `Stade Clinique pré-enregistré : ${initialData.stage}` : ''
    });
    const [stadeGlobal, setStadeGlobal] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [topographyMaps, setTopographyMaps] = useState<any[]>([]);

    useEffect(() => {
        const fetchTopography = async () => {
            try {
                const res = await api.get('/api/reference/topography');
                setTopographyMaps(res.data);
            } catch (err) {
                console.error("Erreur de chargement des topographies:", err);
            }
        };
        fetchTopography();
    }, []);

    // Simple auto-stage calculation (very basic, real rules are complex)
    useEffect(() => {
        const { tnm_t, tnm_n, tnm_m } = formData;
        let stage = '';
        if (tnm_m === 'M1') stage = 'IV';
        else if (tnm_n === 'N2' || tnm_n === 'N3') stage = 'III';
        else if (tnm_n === 'N1' || tnm_t === 'T3' || tnm_t === 'T4') stage = 'II';
        else if (tnm_t === 'T1' || tnm_t === 'T2') stage = 'I';
        else if (tnm_t === 'Tis') stage = '0';
        setStadeGlobal(stage);
    }, [formData.tnm_t, formData.tnm_n, formData.tnm_m]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            // Find mapping for body region
            const mapping = topographyMaps.find(m => m.topography_code === formData.topography_code);
            
            const payload = {
                ...formData,
                stade_global: stadeGlobal,
                body_region: mapping?.body_region || null,
                organ: mapping?.organ || null,
                organ_zone: mapping?.organ_zone || null
            };

            await api.post(`/api/patients/${patientId}/diagnosis`, payload);
            toast.success("Diagnostic enregistré avec succès");
            onSaved();
            onClose();
        } catch (err: any) {
            console.error("Erreur d'enregistrement:", err);
            toast.error(err.response?.data?.error || "Erreur lors de l'enregistrement");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="modal-content" style={{ backgroundColor: 'var(--bg-surface)', width: '100%', maxWidth: '600px', borderRadius: '16px', padding: '24px', position: 'relative' }}>
                <button onClick={onClose} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                    <X size={24} />
                </button>
                
                <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '24px', color: 'var(--text-primary)' }}>Nouveau Diagnostic Oncologique</h2>
                
                {initialData && (initialData.topography_code || initialData.morphology_code) && (
                    <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', padding: '12px', borderRadius: '8px', marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        <AlertCircle size={18} color="#2563eb" style={{ marginTop: '2px' }} />
                        <div>
                            <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e40af' }}>Pré-rempli depuis les données cliniques</div>
                            <div style={{ fontSize: '12px', color: '#1e3a8a', marginTop: '4px' }}>
                                Les données cliniques de ce patient ont été importées pour vous faire gagner du temps et éviter les erreurs de saisie.
                            </div>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>Topographie (ICD-O)</label>
                            <select 
                                name="topography_code" 
                                value={formData.topography_code} 
                                onChange={handleChange}
                                required
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-input)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)' }}
                            >
                                <option value="">Sélectionner une topographie...</option>
                                {topographyMaps.map(t => (
                                    <option key={t.id} value={t.topography_code}>{t.topography_code} - {t.label_fr}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>Morphologie (ICD-O)</label>
                            <input 
                                type="text" 
                                name="morphology_code" 
                                value={formData.morphology_code} 
                                onChange={handleChange}
                                placeholder="Ex: 8140/3"
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-input)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)' }}
                            />
                        </div>
                    </div>

                    <div style={{ padding: '16px', backgroundColor: 'var(--bg-main)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px', color: 'var(--text-primary)' }}>Stadification TNM</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                            <div>
                                <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>T (Tumeur)</label>
                                <select name="tnm_t" value={formData.tnm_t} onChange={handleChange} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-input)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
                                    <option value="">--</option>
                                    <option value="TX">TX</option>
                                    <option value="T0">T0</option>
                                    <option value="Tis">Tis</option>
                                    <option value="T1">T1</option>
                                    <option value="T2">T2</option>
                                    <option value="T3">T3</option>
                                    <option value="T4">T4</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>N (Ganglions)</label>
                                <select name="tnm_n" value={formData.tnm_n} onChange={handleChange} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-input)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
                                    <option value="">--</option>
                                    <option value="NX">NX</option>
                                    <option value="N0">N0</option>
                                    <option value="N1">N1</option>
                                    <option value="N2">N2</option>
                                    <option value="N3">N3</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>M (Métastases)</label>
                                <select name="tnm_m" value={formData.tnm_m} onChange={handleChange} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-input)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
                                    <option value="">--</option>
                                    <option value="M0">M0</option>
                                    <option value="M1">M1</option>
                                </select>
                            </div>
                        </div>
                        <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent)' }}>
                            <AlertCircle size={16} />
                            <span style={{ fontSize: '13px', fontWeight: '600' }}>Stade Global Estimé : {stadeGlobal ? `Stade ${stadeGlobal}` : 'Non calculable'}</span>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>Grade</label>
                            <select name="grade" value={formData.grade} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-input)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)' }}>
                                <option value="">Non précisé</option>
                                <option value="G1">G1 - Bien différencié</option>
                                <option value="G2">G2 - Modérément différencié</option>
                                <option value="G3">G3 - Peu différencié</option>
                                <option value="G4">G4 - Indifférencié</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>Latéralité</label>
                            <select name="lateralite" value={formData.lateralite} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-input)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)' }}>
                                <option value="">Non applicable</option>
                                <option value="Gauche">Gauche</option>
                                <option value="Droite">Droite</option>
                                <option value="Bilatéral">Bilatéral</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>Notes Cliniques</label>
                        <textarea 
                            name="notes" 
                            value={formData.notes} 
                            onChange={handleChange}
                            rows={3}
                            placeholder="Observations supplémentaires..."
                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-input)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', resize: 'vertical' }}
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                        <button type="button" onClick={onClose} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'transparent', color: 'var(--text-primary)', fontWeight: '600', cursor: 'pointer' }}>
                            Annuler
                        </button>
                        <button type="submit" disabled={isSubmitting} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--accent)', color: 'white', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Save size={18} />
                            {isSubmitting ? 'Enregistrement...' : 'Enregistrer le Diagnostic'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CancerDiagnosisForm;
