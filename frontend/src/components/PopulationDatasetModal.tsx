import React, { useState } from 'react';
import { X, Save, Database, History } from 'lucide-react';
import api from '../services/api';

interface PopulationDatasetModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const AGE_GROUPS = [
    '0-4', '5-9', '10-14', '15-19', '20-24', '25-29', '30-34', '35-39',
    '40-44', '45-49', '50-54', '55-59', '60-64', '65-69', '70-74', '75-79', '80+'
];

const PopulationDatasetModal: React.FC<PopulationDatasetModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [name, setName] = useState('');
    const [year, setYear] = useState(new Date().getFullYear());
    const [source, setSource] = useState('Recensement National');
    const [maleData, setMaleData] = useState<number[]>(new Array(17).fill(0));
    const [femaleData, setFemaleData] = useState<number[]>(new Array(17).fill(0));
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleMaleChange = (index: number, val: string) => {
        const newData = [...maleData];
        newData[index] = parseInt(val) || 0;
        setMaleData(newData);
    };

    const handleFemaleChange = (index: number, val: string) => {
        const newData = [...femaleData];
        newData[index] = parseInt(val) || 0;
        setFemaleData(newData);
    };

    const totalMale = maleData.reduce((a, b) => a + b, 0);
    const totalFemale = femaleData.reduce((a, b) => a + b, 0);
    const totalPopulation = totalMale + totalFemale;

    const handleSave = async () => {
        if (!name) return alert("Veuillez donner un nom au dataset");
        setLoading(true);
        try {
            await api.post('/api/population-datasets', {
                name,
                year,
                source,
                standard_population: 'World Standard Population',
                male_data: maleData,
                female_data: femaleData,
                total_male: totalMale,
                total_female: totalFemale,
                total_population: totalPopulation
            });
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Save Error:", error);
            alert("Erreur lors de la sauvegarde");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'
        }}>
            <div style={{
                backgroundColor: 'white', borderRadius: '32px', width: '100%', maxWidth: '900px',
                maxHeight: '90vh', overflowY: 'auto', padding: '40px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '18px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Database color="#2563eb" size={28} />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a', margin: 0 }}>Population Dataset Editor</h2>
                            <p style={{ color: '#64748b', margin: 0 }}>Configurez les données de population pour le calcul des taux d'incidence</p>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '8px', color: '#94a3b8' }}>
                        <X size={24} />
                    </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '20px', marginBottom: '32px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: '#64748b', marginBottom: '8px' }}>Nom du Dataset</label>
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="ex: Wilaya de Tlemcen, 2024"
                            style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0', fontSize: '15px' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: '#64748b', marginBottom: '8px' }}>Année</label>
                        <input
                            type="number"
                            value={year}
                            onChange={(e) => setYear(parseInt(e.target.value))}
                            style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0', fontSize: '15px' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: '#64748b', marginBottom: '8px' }}>Source</label>
                        <input
                            value={source}
                            onChange={(e) => setSource(e.target.value)}
                            style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0', fontSize: '15px' }}
                        />
                    </div>
                </div>

                <div style={{ border: '1px solid #f1f5f9', borderRadius: '20px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ backgroundColor: '#f8fafc' }}>
                            <tr style={{ textAlign: 'left' }}>
                                <th style={{ padding: '12px 20px', color: '#64748b', fontSize: '12px', fontWeight: '800' }}>Groupe d'âge (IARC)</th>
                                <th style={{ padding: '12px 20px', color: '#2563eb', fontSize: '12px', fontWeight: '800' }}>Hommes (M)</th>
                                <th style={{ padding: '12px 20px', color: '#7c3aed', fontSize: '12px', fontWeight: '800' }}>Femmes (F)</th>
                                <th style={{ padding: '12px 20px', color: '#64748b', fontSize: '12px', fontWeight: '800' }}>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {AGE_GROUPS.map((age, i) => (
                                <tr key={age} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '10px 20px', fontWeight: '700', fontSize: '14px' }}>{age}</td>
                                    <td style={{ padding: '10px 20px' }}>
                                        <input
                                            type="number"
                                            value={maleData[i]}
                                            onChange={(e) => handleMaleChange(i, e.target.value)}
                                            style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '8px', textAlign: 'right' }}
                                        />
                                    </td>
                                    <td style={{ padding: '10px 20px' }}>
                                        <input
                                            type="number"
                                            value={femaleData[i]}
                                            onChange={(e) => handleFemaleChange(i, e.target.value)}
                                            style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '8px', textAlign: 'right' }}
                                        />
                                    </td>
                                    <td style={{ padding: '10px 20px', color: '#94a3b8', fontSize: '14px', fontWeight: '600' }}>
                                        {(maleData[i] + femaleData[i]).toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot style={{ backgroundColor: '#f8fafc', fontWeight: '800' }}>
                            <tr>
                                <td style={{ padding: '15px 20px' }}>TOTAL</td>
                                <td style={{ padding: '15px 20px', color: '#2563eb' }}>{totalMale.toLocaleString()}</td>
                                <td style={{ padding: '15px 20px', color: '#7c3aed' }}>{totalFemale.toLocaleString()}</td>
                                <td style={{ padding: '15px 20px' }}>{totalPopulation.toLocaleString()}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
                    <button onClick={onClose} style={{ padding: '14px 28px', borderRadius: '16px', border: '1px solid #e2e8f0', background: 'white', fontWeight: '700', color: '#64748b', cursor: 'pointer' }}>
                        Annuler
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        style={{
                            padding: '14px 40px', borderRadius: '16px', border: 'none', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                            color: 'white', fontWeight: '800', cursor: 'pointer', boxShadow: '0 10px 20px -5px rgba(37,99,235,0.4)',
                            display: 'flex', alignItems: 'center', gap: '8px'
                        }}
                    >
                        {loading ? 'Enregistrement...' : <><Save size={18} /> Sauvegarder le Dataset</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PopulationDatasetModal;
