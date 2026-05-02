import React, { useState, useEffect } from 'react';
import { Beaker, Save, AlertCircle, Check } from 'lucide-react';

interface LabResultFormProps {
    template: any;
    initialData?: any;
    onSave: (data: any, status: 'draft' | 'validated') => void;
    readOnly?: boolean;
    testName?: string;
}

/**
 * Given a test name (e.g. "NFS", "Bilan hépatique") and the bilansDisponibles map,
 * returns the key whose name matches best.
 */
const guessBilanKey = (testName: string, bilans: Record<string, any>): string | null => {
    if (!testName) return null;
    const n = testName.toLowerCase().trim();
    // Ordered search: exact key match → key contains n → n contains key word
    for (const key of Object.keys(bilans)) {
        if (key.toLowerCase() === n) return key;
    }
    for (const key of Object.keys(bilans)) {
        const kl = key.toLowerCase();
        if (kl.includes(n) || n.includes(kl.split(' ')[0])) return key;
    }
    // Special aliases
    if (n.includes('nfs') || n.includes('numération') || n.includes('numeration') || n.includes('hémogramme') || n.includes('hemogramme')) {
        const nfsKey = Object.keys(bilans).find(k => k === 'NFS');
        if (nfsKey) return nfsKey;
    }
    if (n.includes('hepat') || n.includes('hépatique') || n.includes('asat') || n.includes('alat')) {
        const hKey = Object.keys(bilans).find(k => k.toLowerCase().includes('hepat'));
        if (hKey) return hKey;
    }
    if (n.includes('renal') || n.includes('rénal') || n.includes('creatinine') || n.includes('créatinine')) {
        const rKey = Object.keys(bilans).find(k => k.toLowerCase().includes('rénal') || k.toLowerCase().includes('renal'));
        if (rKey) return rKey;
    }
    if (n.includes('coagulation') || n.includes('tp') || n.includes('tca')) {
        const cKey = Object.keys(bilans).find(k => k.toLowerCase().includes('coagulation'));
        if (cKey) return cKey;
    }
    if (n.includes('ionogramme') || n.includes('glycemie') || n.includes('glycémie') || n.includes('calcemie')) {
        const iKey = Object.keys(bilans).find(k => k.toLowerCase().includes('ionogramme'));
        if (iKey) return iKey;
    }
    if (n.includes('thyro') || n.includes('tsh')) {
        const tKey = Object.keys(bilans).find(k => k.toLowerCase().includes('thyro'));
        if (tKey) return tKey;
    }
    if (n.includes('eps') || n.includes('electrophorese') || n.includes('électrophorèse') || n.includes('proteines')) {
        const eKey = Object.keys(bilans).find(k => k.toLowerCase().includes('electrophor'));
        if (eKey) return eKey;
    }
    return null;
};

const LabResultForm: React.FC<LabResultFormProps> = ({ template, initialData = {}, onSave, readOnly = false, testName }) => {
    const [formData, setFormData] = useState<any>(initialData);

    // For bilan_groupe: which sub-bilan is selected (defaults to best match for testName)
    const defaultBilanKey = template.bilans_disponibles
        ? (guessBilanKey(testName || '', template.bilans_disponibles) || Object.keys(template.bilans_disponibles)[0])
        : null;
    const [selectedBilanKey, setSelectedBilanKey] = useState<string>(defaultBilanKey || '');

    useEffect(() => {
        if (initialData) {
            const initialDataStr = JSON.stringify(initialData);
            const currentDataStr = JSON.stringify(formData);
            if (initialDataStr !== currentDataStr) {
                setFormData(initialData);
            }
        }
    }, [initialData]);

    // Re-compute the best sub-bilan when template or testName changes
    useEffect(() => {
        if (template.bilans_disponibles) {
            const guessed = guessBilanKey(testName || '', template.bilans_disponibles)
                || Object.keys(template.bilans_disponibles)[0];
            setSelectedBilanKey(guessed || '');
        }
    }, [template, testName]);

    const handleInputChange = (id: string, value: any) => {
        if (readOnly) return;
        setFormData((prev: any) => ({
            ...prev,
            [id]: value
        }));
    };

    const handleMapChange = (section: string, id: string, value: any) => {
        if (readOnly) return;
        setFormData((prev: any) => ({
            ...prev,
            [section]: {
                ...(prev[section] || {}),
                [id]: value
            }
        }));
    };

    // Helper to render formatted values for read-only/print mode
    const renderReadOnlyValue = (champ: any, value: any) => {
        if (value === undefined || value === null || value === '') return <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Non renseigné</span>;

        if (champ.type === 'boolean' || champ.type === 'positif_negatif' || champ.type === 'present_absent') {
            const isPos = value === true || value === 'Positif' || value === 'Présent' || value === 'oui';
            return (
                <span style={{ 
                    color: isPos ? '#e11d48' : '#059669', 
                    fontWeight: 'bold',
                    padding: '2px 8px',
                    backgroundColor: isPos ? '#fff1f2' : '#f0fdf4',
                    borderRadius: '6px',
                    fontSize: '12px',
                    border: `1px solid ${isPos ? '#fecdd3' : '#bbf7d0'}`
                }}>
                    {value.toString()}
                </span>
            );
        }

        if (champ.type === 'select' && champ.options) {
            const optionValue = typeof value === 'object' ? value.value : value;
            const option = champ.options.find((o: any) => (o.value || o) === optionValue);
            return <span>{option?.label || option || optionValue}</span>;
        }

        return (
            <span style={{ fontWeight: '600', color: '#1e293b' }}>
                {value} {champ.unite && <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '4px' }}>{champ.unite}</span>}
            </span>
        );
    };

    const renderInput = (champ: any, sectionDataPart: any = formData, onChangeFn: (id: string, val: any) => void = handleInputChange) => {
        const value = sectionDataPart[champ.id] || '';

        if (readOnly) {
            return (
                <div key={champ.id} style={{ 
                    padding: '8px 0', 
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    pageBreakInside: 'avoid'
                }}>
                    <label style={{ fontSize: '11px', fontWeight: '500', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.025em' }}>
                        {champ.label}
                    </label>
                    <div style={{ fontSize: '14px' }}>
                        {renderReadOnlyValue(champ, value)}
                    </div>
                </div>
            );
        }

        const isNumericalError = (champ.type === 'number' || champ.type === 'pourcentage') && value && champ.min !== undefined && champ.max !== undefined && (parseFloat(value) < champ.min || parseFloat(value) > champ.max);

        const inputStyle = {
            width: '100%',
            padding: '10px 14px',
            border: `1px solid ${isNumericalError ? '#ef4444' : '#e2e8f0'}`,
            borderRadius: '8px',
            backgroundColor: isNumericalError ? '#fef2f2' : '#ffffff',
            color: '#1e293b',
            fontSize: '14px',
            outline: 'none'
        };

        return (
            <div key={champ.id} style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                    {champ.label} {champ.unite && <span style={{ fontWeight: 'normal', color: '#94a3b8' }}>({champ.unite})</span>}
                </label>
                {champ.type === 'select' ? (
                    <select
                        style={inputStyle}
                        value={value}
                        onChange={(e) => onChangeFn(champ.id, e.target.value)}
                    >
                        <option value="">Sélectionner...</option>
                        {champ.options?.map((opt: any) => (
                            <option key={opt.value || opt} value={opt.value || opt}>
                                {opt.label || opt}
                            </option>
                        ))}
                    </select>
                ) : champ.type === 'textarea' ? (
                    <textarea
                        style={{ ...inputStyle, height: '80px', resize: 'vertical' }}
                        value={value}
                        onChange={(e) => onChangeFn(champ.id, e.target.value)}
                    />
                ) : champ.type === 'boolean' || champ.type === 'positif_negatif' || champ.type === 'present_absent' ? (
                    <div style={{ display: 'flex', gap: '12px' }}>
                        {[
                            { val: champ.type === 'boolean' ? true : champ.type === 'positif_negatif' ? 'Positif' : 'Présent', label: champ.type === 'boolean' ? 'Oui' : champ.type === 'positif_negatif' ? 'Positif' : 'Présent' },
                            { val: champ.type === 'boolean' ? false : champ.type === 'positif_negatif' ? 'Négatif' : 'Absent', label: champ.type === 'boolean' ? 'Non' : champ.type === 'positif_negatif' ? 'Négatif' : 'Absent' }
                        ].map((opt) => (
                            <label key={opt.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer' }}>
                                <input
                                    type="radio"
                                    name={`radio-${champ.id}`}
                                    checked={value === opt.val}
                                    onChange={() => onChangeFn(champ.id, opt.val)}
                                />
                                {opt.label}
                            </label>
                        ))}
                    </div>
                ) : (
                    <div style={{ position: 'relative' }}>
                        <input
                            type={champ.type === 'number' || champ.type === 'pourcentage' ? 'number' : 'text'}
                            style={inputStyle}
                            value={value}
                            onChange={(e) => onChangeFn(champ.id, e.target.value)}
                            step="any"
                        />
                        {champ.min !== undefined && (
                            <div style={{ fontSize: '11px', color: isNumericalError ? '#ef4444' : '#94a3b8', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                {isNumericalError && <AlertCircle size={12} />}
                                Valeurs normales: {champ.min} - {champ.max} {champ.unite}
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div style={{ 
            backgroundColor: readOnly ? 'transparent' : 'white', 
            borderRadius: '12px',
            padding: readOnly ? '0' : '20px'
        }}>
            {!readOnly && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b' }}>
                        <Beaker size={20} color="#2563eb" /> {template.nom || template.template_nom}
                    </h3>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            onClick={() => onSave(formData, 'draft')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '10px 18px',
                                backgroundColor: '#f8fafc',
                                color: '#475569',
                                border: '1px solid #e2e8f0',
                                borderRadius: '10px',
                                cursor: 'pointer',
                                fontWeight: '600',
                                transition: 'all 0.2s'
                            }}
                        >
                            <Save size={18} /> Enregistrer
                        </button>
                        <button
                            onClick={() => {
                                if (window.confirm("Voulez-vous vraiment valider ce résultat ? Il ne pourra plus être modifié.")) {
                                    onSave(formData, 'validated');
                                }
                            }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '10px 18px',
                                backgroundColor: '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '10px',
                                cursor: 'pointer',
                                fontWeight: '700',
                                boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)'
                            }}
                        >
                            <Check size={18} /> Valider le résultat
                        </button>
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* 1. Standard Fields */}
                {template.champs_formulaire && (
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: readOnly ? 'repeat(auto-fill, minmax(200px, 1fr))' : '1fr', 
                        gap: readOnly ? '16px 24px' : '0' 
                    }}>
                        {template.champs_formulaire.map((champ: any) => renderInput(champ))}
                    </div>
                )}

                {/* 2. Grouped Bilans (e.g. NFS, Liver Panel) — shows only selected sub-bilan */}
                {template.bilans_disponibles && (() => {
                    const activeBilanKey = selectedBilanKey || Object.keys(template.bilans_disponibles)[0];
                    const activeBilan = template.bilans_disponibles[activeBilanKey];
                    if (!activeBilan) return null;
                    return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {/* Sub-bilan selector */}
                            {!readOnly && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', backgroundColor: '#f0f9ff', borderRadius: '10px', border: '1px solid #bae6fd' }}>
                                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#0369a1', whiteSpace: 'nowrap' }}>Bilan affiché :</span>
                                    <select
                                        value={activeBilanKey}
                                        onChange={(e) => setSelectedBilanKey(e.target.value)}
                                        style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid #bae6fd', fontSize: '14px', fontWeight: '600', color: '#0369a1', backgroundColor: 'white', outline: 'none' }}
                                    >
                                        {Object.entries(template.bilans_disponibles).map(([key, b]: [string, any]) => (
                                            <option key={key} value={key}>{b.nom || key}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            {/* Active sub-bilan fields */}
                            <div style={{ 
                                border: readOnly ? 'none' : '1px solid #e2e8f0', 
                                borderLeft: readOnly ? '4px solid #2563eb' : '1px solid #e2e8f0',
                                borderRadius: readOnly ? '0' : '12px', 
                                padding: readOnly ? '4px 0 4px 16px' : '20px',
                                backgroundColor: readOnly ? 'transparent' : '#f8fafc'
                            }}>
                                <h4 style={{ 
                                    margin: '0 0 16px 0', 
                                    fontSize: '15px', 
                                    color: '#2563eb', 
                                    fontWeight: 'bold',
                                    borderBottom: readOnly ? 'none' : '2px solid #2563eb',
                                    display: 'inline-block'
                                }}>{activeBilan.nom}</h4>
                                <div style={{ 
                                    display: 'grid', 
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', 
                                    gap: readOnly ? '12px 24px' : '12px' 
                                }}>
                                    {activeBilan.champs.map((champ: any) => renderInput(champ, formData[activeBilanKey] || {}, (id, val) => handleMapChange(activeBilanKey, id, val)))}
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {/* 3. Panels (e.g. IHC Panels) */}
                {template.panels_disponibles && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {Object.entries(template.panels_disponibles).map(([key, panel]: [string, any]) => (
                            <div key={key} style={{ 
                                border: readOnly ? 'none' : '1px solid #e2e8f0', 
                                borderRadius: '12px', 
                                padding: readOnly ? '0' : '20px' 
                            }}>
                                <h4 style={{ margin: '0 0 16px 0', fontSize: '15px', color: '#0f172a', fontWeight: 'bold' }}>{panel.nom}</h4>
                                <div style={{ 
                                    display: 'grid', 
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', 
                                    gap: '12px 24px' 
                                }}>
                                    {(panel.marqueurs || panel.champs).map((champ: any) => renderInput(champ, formData[key] || {}, (id, val) => handleMapChange(key, id, val)))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* 4. Imaging Types (Sections based) */}
                {template.types_imagerie && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {Object.entries(template.types_imagerie).map(([key, type]: [string, any]) => (
                            <div key={key} style={{ 
                                border: readOnly ? 'none' : '1px solid #e2e8f0', 
                                borderRadius: '12px', 
                                padding: readOnly ? '0' : '20px' 
                            }}>
                                <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#1e293b', fontWeight: 'bold' }}>{type.nom}</h4>
                                {type.sections?.map((section: any) => (
                                    <div key={section.id} style={{ marginBottom: '16px', marginLeft: readOnly ? '0' : '16px' }}>
                                        <h5 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#64748b', textDecoration: 'underline' }}>{section.titre}</h5>
                                        <div style={{ 
                                            display: 'grid', 
                                            gridTemplateColumns: readOnly ? 'repeat(auto-fill, minmax(180px, 1fr))' : '1fr', 
                                            gap: readOnly ? '12px 24px' : '0' 
                                        }}>
                                            {section.champs.map((champ: any) => renderInput(champ, formData[key]?.[section.id] || {}, (id, val) => {
                                                const currentKeyData = formData[key] || {};
                                                const currentSectionData = currentKeyData[section.id] || {};
                                                handleMapChange(key, section.id, { ...currentSectionData, [id]: val });
                                            }))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                )}

                {/* 5. Common fields at the bottom */}
                {template.champs_communs && (
                    <div style={{ 
                        marginTop: '20px', 
                        paddingTop: '20px', 
                        borderTop: '2px dashed #e2e8f0',
                        display: 'grid',
                        gridTemplateColumns: '1fr',
                        gap: '12px'
                    }}>
                        <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#64748b' }}>Informations complémentaires</h4>
                        {template.champs_communs.map((champ: any) => renderInput(champ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default LabResultForm;
