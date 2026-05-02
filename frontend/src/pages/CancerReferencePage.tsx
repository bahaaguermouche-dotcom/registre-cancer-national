import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Plus, Edit2, Trash2, Search, AlertCircle, Loader2, FlaskConical, ChevronDown, ChevronUp, X, CheckCircle2, Circle, BookOpen, Filter } from 'lucide-react';
import axios from 'axios';

// ─── Types ────────────────────────────────────────────────────────────────────
interface CancerRule {
    id: number; category: string; sub_type: string;
    topography_code_regex: string; morphology_code_regex: string;
    icd10: string; min_age: number; max_age: number;
    allowed_gender: string | null; specialty: string; is_rare: boolean;
}

interface BilanPackage {
    id: number; cancer_nom: string; sous_type: string;
    phase: 'initial' | 'confirmation' | 'extension' | 'suivi';
    examens_obligatoires: string[]; examens_optionnels: string[];
    note_clinique: string | null; created_at: string; updated_at: string;
}

const PHASE_LABELS: Record<string, { label: string; color: string; bg: string; border: string }> = {
    initial:       { label: 'Phase Initiale',       color: '#0369a1', bg: '#e0f2fe', border: '#7dd3fc' },
    confirmation:  { label: 'Confirmation Diag.',   color: '#7c3aed', bg: '#ede9fe', border: '#c4b5fd' },
    extension:     { label: 'Bilan d\'Extension',   color: '#b45309', bg: '#fef3c7', border: '#fcd34d' },
    suivi:         { label: 'Suivi & Surveillance', color: '#065f46', bg: '#d1fae5', border: '#6ee7b7' },
};

const API = 'http://localhost:5000';

// ─── BilanPackageEditor — Modal for creating/editing exam packages ─────────────
const BilanPackageEditor: React.FC<{
    pkg: Partial<BilanPackage> | null;
    onClose: () => void;
    onSave: () => void;
    token: string;
}> = ({ pkg, onClose, onSave, token }) => {
    const isNew = !pkg?.id;
    const [form, setForm] = useState({
        cancer_nom: pkg?.cancer_nom || '',
        sous_type:  pkg?.sous_type  || '',
        phase:      pkg?.phase      || 'initial',
        examens_obligatoires: (pkg?.examens_obligatoires || []).join('\n'),
        examens_optionnels:   (pkg?.examens_optionnels   || []).join('\n'),
        note_clinique: pkg?.note_clinique || '',
    });
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.cancer_nom || !form.sous_type || !form.phase) {
            setError('Cancer, Sous-type et Phase sont requis.'); return;
        }
        setSaving(true);
        const payload = {
            cancer_nom: form.cancer_nom.trim(),
            sous_type:  form.sous_type.trim(),
            phase:      form.phase,
            examens_obligatoires: form.examens_obligatoires.split('\n').map(l => l.trim()).filter(Boolean),
            examens_optionnels:   form.examens_optionnels.split('\n').map(l => l.trim()).filter(Boolean),
            note_clinique: form.note_clinique.trim() || null,
        };
        try {
            const headers = { Authorization: `Bearer ${token}` };
            if (isNew) {
                await axios.post(`${API}/api/bilan-packages`, payload, { headers });
            } else {
                await axios.put(`${API}/api/bilan-packages/${pkg!.id}`, payload, { headers });
            }
            onSave();
            onClose();
        } catch (e: any) {
            setError(e.response?.data?.error || 'Erreur lors de la sauvegarde');
        } finally { setSaving(false); }
    };

    const inputStyle: React.CSSProperties = {
        width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0',
        borderRadius: '8px', fontSize: '14px', outline: 'none', color: '#1e293b',
        backgroundColor: '#fff'
    };
    const labelStyle: React.CSSProperties = {
        fontSize: '12px', fontWeight: '700', color: '#475569',
        marginBottom: '6px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em'
    };

    return (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ backgroundColor: '#fff', borderRadius: '20px', width: '100%', maxWidth: '680px', padding: '32px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
                <button onClick={onClose} style={{ position: 'absolute', top: '20px', right: '20px', background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={18} />
                </button>
                <h2 style={{ fontSize: '22px', fontWeight: '900', color: '#0f172a', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FlaskConical size={22} color="#7c3aed" />
                    {isNew ? 'Nouveau Package Bilan' : 'Modifier le Package'}
                </h2>

                {error && (
                    <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '10px', color: '#dc2626', marginBottom: '20px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <AlertCircle size={16} /> {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                            <label style={labelStyle}>Cancer / Groupe *</label>
                            <input style={inputStyle} value={form.cancer_nom} onChange={e => setForm({ ...form, cancer_nom: e.target.value })} placeholder="ex: Cancer du Sein" required />
                        </div>
                        <div>
                            <label style={labelStyle}>Sous-type *</label>
                            <input style={inputStyle} value={form.sous_type} onChange={e => setForm({ ...form, sous_type: e.target.value })} placeholder="ex: Carcinome canalaire invasif" required />
                        </div>
                    </div>

                    <div>
                        <label style={labelStyle}>Phase Clinique *</label>
                        <select style={inputStyle} value={form.phase} onChange={e => setForm({ ...form, phase: e.target.value as any })}>
                            {Object.entries(PHASE_LABELS).map(([key, val]) => (
                                <option key={key} value={key}>{val.label}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label style={labelStyle}>Examens Obligatoires (un par ligne)</label>
                        <textarea
                            style={{ ...inputStyle, height: '140px', resize: 'vertical', fontFamily: 'monospace', fontSize: '13px' }}
                            value={form.examens_obligatoires}
                            onChange={e => setForm({ ...form, examens_obligatoires: e.target.value })}
                            placeholder={"Radiographie thorax face+profil\nNFS complète\nBilan hépatique (ASAT/ALAT/PAL/GGT)"}
                        />
                        <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                            {form.examens_obligatoires.split('\n').filter(l => l.trim()).length} examen(s) obligatoire(s)
                        </p>
                    </div>

                    <div>
                        <label style={labelStyle}>Examens Optionnels (un par ligne)</label>
                        <textarea
                            style={{ ...inputStyle, height: '100px', resize: 'vertical', fontFamily: 'monospace', fontSize: '13px' }}
                            value={form.examens_optionnels}
                            onChange={e => setForm({ ...form, examens_optionnels: e.target.value })}
                            placeholder="Scanner thoracique si radio anormale"
                        />
                        <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                            {form.examens_optionnels.split('\n').filter(l => l.trim()).length} examen(s) optionnel(s)
                        </p>
                    </div>

                    <div>
                        <label style={labelStyle}>Note Clinique / Commentaire</label>
                        <textarea
                            style={{ ...inputStyle, height: '80px', resize: 'vertical' }}
                            value={form.note_clinique}
                            onChange={e => setForm({ ...form, note_clinique: e.target.value })}
                            placeholder="Remarques cliniques, guidance de pratique..."
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                        <button type="button" onClick={onClose} style={{ padding: '12px 24px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'transparent', cursor: 'pointer', fontWeight: '700', fontSize: '14px' }}>
                            Annuler
                        </button>
                        <button type="submit" disabled={saving} style={{ padding: '12px 32px', borderRadius: '12px', background: saving ? '#94a3b8' : 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: 'white', border: 'none', fontWeight: '700', fontSize: '14px', cursor: saving ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                            {saving ? 'Enregistrement...' : 'Enregistrer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ─── BilanPackagesTab — Main bilan management UI ──────────────────────────────
const BilanPackagesTab: React.FC<{ 
    currentUser: any;
    packages: BilanPackage[];
    loading: boolean;
    fetchPackages: () => void;
}> = ({ currentUser, packages, loading, fetchPackages }) => {
    const [searchCancer, setSearchCancer] = useState('');
    const [phaseFilter, setPhaseFilter] = useState('');
    const [expandedCancer, setExpandedCancer] = useState<string | null>(null);
    const [editingPkg, setEditingPkg]   = useState<Partial<BilanPackage> | null | undefined>(undefined);
    const isAdmin = currentUser?.role === 'Administrateur National';
    const token = localStorage.getItem('token') || '';

    const handleDelete = async (pkg: BilanPackage) => {
        if (!window.confirm(`Supprimer le package "${pkg.phase}" pour "${pkg.cancer_nom} — ${pkg.sous_type}" ?`)) return;
        try {
            await axios.delete(`${API}/api/bilan-packages/${pkg.id}`, { headers: { Authorization: `Bearer ${token}` } });
            fetchPackages();
        } catch (e: any) { alert(e.response?.data?.error || 'Erreur suppression'); }
    };

    // Group by cancer_nom > sous_type
    const filtered = packages.filter(p => {
        const matchCancer = !searchCancer || p.cancer_nom.toLowerCase().includes(searchCancer.toLowerCase()) || p.sous_type.toLowerCase().includes(searchCancer.toLowerCase());
        const matchPhase  = !phaseFilter || p.phase === phaseFilter;
        return matchCancer && matchPhase;
    });

    const grouped: Record<string, Record<string, BilanPackage[]>> = {};
    for (const p of filtered) {
        if (!grouped[p.cancer_nom]) grouped[p.cancer_nom] = {};
        if (!grouped[p.cancer_nom][p.sous_type]) grouped[p.cancer_nom][p.sous_type] = [];
        grouped[p.cancer_nom][p.sous_type].push(p);
    }

    const cancerGroups = Object.keys(grouped).sort();

    return (
        <div>
            {/* Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '12px', flex: 1, flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                        <Search style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={18} />
                        <input
                            type="text"
                            placeholder="Rechercher cancer ou sous-type..."
                            className="login-input"
                            style={{ width: '100%', paddingLeft: '44px' }}
                            value={searchCancer}
                            onChange={e => setSearchCancer(e.target.value)}
                        />
                    </div>
                    <div style={{ position: 'relative' }}>
                        <Filter style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={16} />
                        <select
                            className="login-input"
                            style={{ paddingLeft: '36px', minWidth: '180px' }}
                            value={phaseFilter}
                            onChange={e => setPhaseFilter(e.target.value)}
                        >
                            <option value="">Toutes les phases</option>
                            {Object.entries(PHASE_LABELS).map(([key, val]) => (
                                <option key={key} value={key}>{val.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
                {isAdmin && (
                    <button
                        onClick={() => setEditingPkg({})}
                        className="login-button"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}
                    >
                        <Plus size={18} /> Nouveau Package
                    </button>
                )}
            </div>

            {/* Stats bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
                {Object.entries(PHASE_LABELS).map(([phase, info]) => {
                    const count = packages.filter(p => p.phase === phase).length;
                    return (
                        <div key={phase} onClick={() => setPhaseFilter(phaseFilter === phase ? '' : phase)} style={{ padding: '16px', backgroundColor: phaseFilter === phase ? info.bg : '#f8fafc', border: `2px solid ${phaseFilter === phase ? info.border : '#e2e8f0'}`, borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s' }}>
                            <div style={{ fontSize: '24px', fontWeight: '900', color: info.color }}>{count}</div>
                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{info.label}</div>
                        </div>
                    );
                })}
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
                    <Loader2 size={36} color="#7c3aed" className="animate-spin" />
                </div>
            ) : cancerGroups.length === 0 ? (
                <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
                    <FlaskConical size={48} style={{ marginBottom: '16px', opacity: 0.4 }} />
                    <p>Aucun package trouvé.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {cancerGroups.map(cancerNom => {
                        const isExpanded = expandedCancer === cancerNom;
                        const sousTypes = Object.keys(grouped[cancerNom]);
                        const totalPkgs = sousTypes.reduce((acc, st) => acc + grouped[cancerNom][st].length, 0);

                        return (
                            <div key={cancerNom} style={{ border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden', backgroundColor: 'white', boxShadow: isExpanded ? '0 4px 24px rgba(0,0,0,0.07)' : 'none', transition: 'box-shadow 0.2s' }}>
                                {/* Cancer header */}
                                <button
                                    onClick={() => setExpandedCancer(isExpanded ? null : cancerNom)}
                                    style={{ width: '100%', padding: '18px 24px', background: isExpanded ? '#f8fafc' : 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                        <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'linear-gradient(135deg, #7c3aed20, #4f46e520)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <FlaskConical size={20} color="#7c3aed" />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>{cancerNom}</div>
                                            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                                                {sousTypes.length} sous-type{sousTypes.length > 1 ? 's' : ''} · {totalPkgs} package{totalPkgs > 1 ? 's' : ''}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        {/* Phase badges */}
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            {Object.entries(PHASE_LABELS).map(([phase, info]) => {
                                                const has = sousTypes.some(st => grouped[cancerNom][st].some(p => p.phase === phase));
                                                return has ? (
                                                    <span key={phase} style={{ fontSize: '10px', fontWeight: '700', padding: '3px 8px', backgroundColor: info.bg, color: info.color, borderRadius: '6px', border: `1px solid ${info.border}` }}>
                                                        {phase === 'initial' ? 'Init.' : phase === 'confirmation' ? 'Conf.' : phase === 'extension' ? 'Ext.' : 'Suivi'}
                                                    </span>
                                                ) : null;
                                            })}
                                        </div>
                                        {isExpanded ? <ChevronUp size={20} color="#94a3b8" /> : <ChevronDown size={20} color="#94a3b8" />}
                                    </div>
                                </button>

                                {/* Expanded sous-types */}
                                {isExpanded && (
                                    <div style={{ borderTop: '1px solid #e2e8f0', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                        {sousTypes.map(sousType => (
                                            <div key={sousType}>
                                                <div style={{ fontSize: '14px', fontWeight: '700', color: '#475569', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#7c3aed' }} />
                                                    {sousType}
                                                    {isAdmin && (
                                                        <button
                                                            onClick={() => setEditingPkg({ cancer_nom: cancerNom, sous_type: sousType, phase: 'initial' })}
                                                            style={{ marginLeft: '8px', padding: '4px 10px', fontSize: '11px', fontWeight: '700', color: '#7c3aed', background: '#ede9fe', border: '1px solid #c4b5fd', borderRadius: '6px', cursor: 'pointer' }}
                                                        >
                                                            + Phase
                                                        </button>
                                                    )}
                                                </div>

                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
                                                    {(['initial', 'confirmation', 'extension', 'suivi'] as const).map(phase => {
                                                        const pkg = grouped[cancerNom][sousType]?.find(p => p.phase === phase);
                                                        const phaseInfo = PHASE_LABELS[phase];

                                                        if (!pkg) {
                                                            if (!isAdmin) return null;
                                                            return (
                                                                <button
                                                                    key={phase}
                                                                    onClick={() => setEditingPkg({ cancer_nom: cancerNom, sous_type: sousType, phase })}
                                                                    style={{ padding: '18px', border: `2px dashed ${phaseInfo.border}`, borderRadius: '12px', background: 'transparent', cursor: 'pointer', color: phaseInfo.color, fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', transition: 'background 0.2s' }}
                                                                    onMouseOver={e => (e.currentTarget.style.backgroundColor = phaseInfo.bg)}
                                                                    onMouseOut={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                                                                >
                                                                    <Plus size={15} /> {phaseInfo.label}
                                                                </button>
                                                            );
                                                        }

                                                        return (
                                                            <div key={phase} style={{ padding: '18px', backgroundColor: phaseInfo.bg, border: `1px solid ${phaseInfo.border}`, borderRadius: '12px' }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                                                    <span style={{ fontSize: '11px', fontWeight: '800', color: phaseInfo.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                                        {phaseInfo.label}
                                                                    </span>
                                                                    {isAdmin && (
                                                                        <div style={{ display: 'flex', gap: '4px' }}>
                                                                            <button onClick={() => setEditingPkg(pkg)} style={{ padding: '4px', background: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#3b82f6' }}>
                                                                                <Edit2 size={13} />
                                                                            </button>
                                                                            <button onClick={() => handleDelete(pkg)} style={{ padding: '4px', background: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#ef4444' }}>
                                                                                <Trash2 size={13} />
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Obligatory exams */}
                                                                <div style={{ marginBottom: pkg.examens_optionnels.length > 0 ? '10px' : '0' }}>
                                                                    {pkg.examens_obligatoires.slice(0, 4).map((exam, i) => (
                                                                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: '4px', fontSize: '12px', color: '#1e293b' }}>
                                                                            <CheckCircle2 size={12} color={phaseInfo.color} style={{ flexShrink: 0, marginTop: '2px' }} />
                                                                            <span>{exam}</span>
                                                                        </div>
                                                                    ))}
                                                                    {pkg.examens_obligatoires.length > 4 && (
                                                                        <div style={{ fontSize: '11px', color: phaseInfo.color, fontWeight: '700', marginTop: '4px' }}>
                                                                            +{pkg.examens_obligatoires.length - 4} autre(s)...
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Optional exams */}
                                                                {pkg.examens_optionnels.length > 0 && (
                                                                    <div style={{ borderTop: `1px dashed ${phaseInfo.border}`, paddingTop: '8px' }}>
                                                                        {pkg.examens_optionnels.slice(0, 2).map((exam, i) => (
                                                                            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: '3px', fontSize: '11px', color: '#64748b' }}>
                                                                                <Circle size={10} color="#94a3b8" style={{ flexShrink: 0, marginTop: '2px' }} />
                                                                                <span>{exam}</span>
                                                                            </div>
                                                                        ))}
                                                                        {pkg.examens_optionnels.length > 2 && (
                                                                            <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>+{pkg.examens_optionnels.length - 2} optionnel(s)</div>
                                                                        )}
                                                                    </div>
                                                                )}

                                                                {/* Note */}
                                                                {pkg.note_clinique && (
                                                                    <div style={{ marginTop: '10px', padding: '8px 10px', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: '8px', fontSize: '11px', color: '#475569', fontStyle: 'italic', lineHeight: '1.5' }}>
                                                                        💡 {pkg.note_clinique.length > 100 ? pkg.note_clinique.substring(0, 100) + '...' : pkg.note_clinique}
                                                                    </div>
                                                                )}

                                                                <div style={{ marginTop: '8px', fontSize: '10px', color: '#94a3b8' }}>
                                                                    {pkg.examens_obligatoires.length} obl. · {pkg.examens_optionnels.length} opt.
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Edit modal */}
            {editingPkg !== undefined && (
                <BilanPackageEditor
                    pkg={editingPkg}
                    token={token}
                    onClose={() => setEditingPkg(undefined)}
                    onSave={fetchPackages}
                />
            )}
        </div>
    );
};

// ─── CancerReferencePage — Main page with 2 tabs ──────────────────────────────
const CancerReferencePage = ({ currentUser }: { currentUser: any }) => {
    const [activeTab, setActiveTab] = useState<'cancers' | 'bilans'>('cancers');
    const [cancers, setCancers] = useState<CancerRule[]>([]);
    const [packages, setPackages] = useState<BilanPackage[]>([]);
    const [packagesLoading, setPackagesLoading] = useState(true);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRule, setEditingRule] = useState<CancerRule | null>(null);
    const [error, setError] = useState('');

    const [allSpecialties, setAllSpecialties] = useState<string[]>([]);
    const [formData, setFormData] = useState<Partial<CancerRule>>({
        category: '', sub_type: '', topography_code_regex: '',
        morphology_code_regex: '', icd10: '', min_age: 0, max_age: 120,
        allowed_gender: '', specialty: '', is_rare: false
    });

    const fetchPackages = useCallback(async () => {
        setPackagesLoading(true);
        try {
            const res = await axios.get(`${API}/api/bilan-packages`);
            setPackages(res.data);
        } catch (e) { console.error(e); }
        finally { setPackagesLoading(false); }
    }, []);

    const fetchSpecialties = useCallback(async () => {
        try {
            const res = await axios.get(`${API}/api/reference/specialties`);
            setAllSpecialties(res.data);
        } catch (e) { console.error(e); }
    }, []);

    useEffect(() => { 
        fetchCancers(); 
        fetchPackages(); 
        fetchSpecialties();
    }, [fetchPackages, fetchSpecialties]);

    const fetchCancers = async () => {
        try {
            const res = await axios.get(`${API}/api/reference/cancers`);
            setCancers(res.data);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const openAddModal = () => {
        setEditingRule(null);
        setFormData({ category: '', sub_type: '', topography_code_regex: '', morphology_code_regex: '', icd10: '', min_age: 0, max_age: 120, allowed_gender: '', specialty: '', is_rare: false });
        setError(''); setIsModalOpen(true);
    };

    const openEditModal = (rule: CancerRule) => {
        setEditingRule(rule);
        let currentSpecs: string[] = [];
        try {
            if (rule.specialty && rule.specialty.startsWith('[')) {
                currentSpecs = JSON.parse(rule.specialty);
            } else if (rule.specialty) {
                currentSpecs = [rule.specialty];
            }
        } catch (e) {
            currentSpecs = rule.specialty ? [rule.specialty] : [];
        }

        setFormData({ 
            category: rule.category, 
            sub_type: rule.sub_type, 
            topography_code_regex: rule.topography_code_regex || '', 
            morphology_code_regex: rule.morphology_code_regex || '', 
            icd10: rule.icd10 || '', 
            min_age: rule.min_age, 
            max_age: rule.max_age, 
            allowed_gender: rule.allowed_gender || '', 
            specialty: currentSpecs.join(', '), // Keeping it as a string for now in formData but will fix logic below
            is_rare: rule.is_rare 
        });
        setError(''); setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette référence ?")) return;
        try {
            await axios.delete(`${API}/api/reference/cancers/${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
            fetchCancers();
        } catch (e: any) { alert("Erreur: " + (e.response?.data?.error || e.message)); }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.category || !formData.sub_type) { setError('Catégorie et Sous-type sont obligatoires.'); return; }
        setError('');
        try {
            const token = localStorage.getItem('token');
            const specArray = formData.specialty ? formData.specialty.split(',').map(s => s.trim()).filter(Boolean) : [];
            const payload = { ...formData, specialty: JSON.stringify(specArray), allowed_gender: formData.allowed_gender === '' ? null : formData.allowed_gender };
            if (editingRule) {
                await axios.put(`${API}/api/reference/cancers/${editingRule.id}`, payload, { headers: { Authorization: `Bearer ${token}` } });
            } else {
                await axios.post(`${API}/api/reference/cancers`, payload, { headers: { Authorization: `Bearer ${token}` } });
            }
            setIsModalOpen(false); fetchCancers();
        } catch (e: any) { setError(e.response?.data?.error || "Erreur lors de l'enregistrement"); }
    };

    const filteredCancers = cancers.filter(c =>
        c.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.sub_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.icd10 && c.icd10.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const tabStyle = (active: boolean): React.CSSProperties => ({
        padding: '10px 24px', fontWeight: '700', fontSize: '14px', border: 'none',
        borderBottom: active ? '3px solid #7c3aed' : '3px solid transparent',
        background: 'transparent', cursor: 'pointer',
        color: active ? '#7c3aed' : '#64748b', transition: 'all 0.2s'
    });

    return (
        <div className="dashboard-container" style={{ padding: '32px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: '900', color: '#0f172a', marginBottom: '8px' }}>
                        Référentiel Oncologique
                    </h1>
                    <p style={{ color: '#64748b', fontSize: '15px' }}>
                        Gestion des types de cancers, règles IARC et packages d'examens cliniques (ESMO/ASCO/INCa).
                    </p>
                </div>
                {currentUser?.role === 'Administrateur National' && activeTab === 'cancers' && (
                    <button onClick={openAddModal} className="login-button" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Plus size={18} /> Ajouter un Cancer
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div style={{ borderBottom: '2px solid #e2e8f0', marginBottom: '28px', display: 'flex', gap: '0' }}>
                <button style={tabStyle(activeTab === 'cancers')} onClick={() => setActiveTab('cancers')}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Shield size={16} /> Types de Cancers (CIM-O-3)
                    </span>
                </button>
                <button style={tabStyle(activeTab === 'bilans')} onClick={() => setActiveTab('bilans')}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FlaskConical size={16} /> Packages Bilans par Cancer
                    </span>
                </button>
            </div>

            {/* ── Tab: Cancer Types ── */}
            {activeTab === 'cancers' && (
                <div className="glass-panel" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <Search style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={20} />
                            <input type="text" placeholder="Rechercher par organe, type, code CIM-O-3..." className="login-input"
                                style={{ width: '100%', paddingLeft: '48px' }} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        </div>
                    </div>

                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                            <Loader2 className="animate-spin" size={32} color="#7c3aed" />
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                                        <th style={{ padding: '16px 16px 16px 0', color: '#64748b', fontSize: '12px', textTransform: 'uppercase' }}>Organe / Catégorie</th>
                                        <th style={{ padding: '16px', color: '#64748b', fontSize: '12px', textTransform: 'uppercase' }}>Type (Morphologie Principale)</th>
                                        <th style={{ padding: '16px', color: '#64748b', fontSize: '12px', textTransform: 'uppercase' }}>Code CIM-O-3</th>
                                        <th style={{ padding: '16px', color: '#64748b', fontSize: '12px', textTransform: 'uppercase' }}>Spécialité(s) Attendue(s)</th>
                                        <th style={{ padding: '16px', color: '#64748b', fontSize: '12px', textTransform: 'uppercase' }}>Contraintes (IARC)</th>
                                        {currentUser?.role === 'Administrateur National' && (
                                            <th style={{ padding: '16px 0 16px 16px', color: '#64748b', fontSize: '12px', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredCancers.map(c => (
                                        <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '16px 16px 16px 0', fontWeight: 'bold', color: '#0f172a' }}>{c.category}</td>
                                            <td style={{ padding: '16px', color: '#334155' }}>
                                                {c.sub_type}
                                                {c.is_rare && <span style={{ marginLeft: '8px', padding: '2px 8px', backgroundColor: '#fef3c7', color: '#92400e', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>Rare</span>}
                                            </td>
                                            <td style={{ padding: '16px', color: '#0ea5e9', fontWeight: '600' }}>{c.icd10 || '-'}</td>
                                            <td style={{ padding: '16px', color: '#475569' }}>
                                                {(() => {
                                                    try {
                                                        if (c.specialty?.startsWith('[')) {
                                                            const specs = JSON.parse(c.specialty);
                                                            return Array.isArray(specs) ? specs.join(', ') : c.specialty;
                                                        }
                                                        return c.specialty || '-';
                                                    } catch { return c.specialty || '-'; }
                                                })()}
                                            </td>
                                            <td style={{ padding: '16px' }}>
                                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                    <span style={{ fontSize: '11px', padding: '4px 8px', backgroundColor: '#e2e8f0', borderRadius: '8px', color: '#475569', fontWeight: '600' }}>Âge: {c.min_age}-{c.max_age}</span>
                                                    {c.allowed_gender && (
                                                        <span style={{ fontSize: '11px', padding: '4px 8px', backgroundColor: c.allowed_gender === 'Female' ? '#fce7f3' : '#dbeafe', borderRadius: '8px', color: c.allowed_gender === 'Female' ? '#be185d' : '#1e40af', fontWeight: '600' }}>
                                                            Sexe: {c.allowed_gender === 'Female' ? 'Féminin' : 'Masculin'}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            {currentUser?.role === 'Administrateur National' && (
                                                <td style={{ padding: '16px 0 16px 16px', textAlign: 'right' }}>
                                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                        <button onClick={() => openEditModal(c)} style={{ padding: '8px', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#3b82f6' }}><Edit2 size={16} /></button>
                                                        <button onClick={() => handleDelete(c.id)} style={{ padding: '8px', background: '#fef2f2', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={16} /></button>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                    {filteredCancers.length === 0 && (
                                        <tr><td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>Aucun cancer trouvé.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ── Tab: Bilans ── */}
            {activeTab === 'bilans' && (
                <div>
                    <div style={{ backgroundColor: '#ede9fe', border: '1px solid #c4b5fd', borderRadius: '12px', padding: '14px 20px', marginBottom: '24px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                        <BookOpen size={18} color="#7c3aed" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div>
                            <strong style={{ color: '#5b21b6', fontSize: '13px' }}>Protocoles ESMO/ASCO/INCa/SFH — {Array.from(new Set(packages.map(p => p.cancer_nom))).length} cancers, 4 phases cliniques</strong>
                            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#7c3aed' }}>
                                Ces packages définissent les examens recommandés pour chaque cancer à chaque étape du parcours clinique.
                                Ils sont automatiquement suggérés au médecin lors de la consultation d'un patient.
                            </p>
                        </div>
                    </div>
                    <BilanPackagesTab currentUser={currentUser} packages={packages} loading={packagesLoading} fetchPackages={fetchPackages} />
                </div>
            )}

            {/* Cancer Rule Modal */}
            {isModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', width: '100%', maxWidth: '600px', padding: '32px', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h2 style={{ fontSize: '24px', fontWeight: '900', marginBottom: '24px' }}>
                            {editingRule ? 'Modifier le Cancer' : 'Ajouter un Cancer'}
                        </h2>
                        {error && (
                            <div style={{ padding: '12px', backgroundColor: '#fef2f2', border: '1px solid #ef4444', borderRadius: '12px', color: '#b91c1c', marginBottom: '24px', display: 'flex', gap: '8px' }}>
                                <AlertCircle size={18} /> {error}
                            </div>
                        )}
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '8px', display: 'block' }}>Catégorie / Organe *</label>
                                    <select className="login-input" required style={{ width: '100%' }}
                                        value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value, sub_type: '' })}>
                                        <option value="">Sélectionner un organe</option>
                                        {Array.from(new Set(packages.map(p => p.cancer_nom))).sort().map(nom => (
                                            <option key={nom} value={nom}>{nom}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '8px', display: 'block' }}>Type (Sous-type) *</label>
                                    <select className="login-input" required style={{ width: '100%' }}
                                        value={formData.sub_type} onChange={e => setFormData({ ...formData, sub_type: e.target.value })}
                                        disabled={!formData.category}>
                                        <option value="">Sélectionner un sous-type</option>
                                        {(formData.category ? Array.from(new Set(packages.filter(p => p.cancer_nom === formData.category).map(p => p.sous_type))).sort() : []).map(st => (
                                            <option key={st} value={st}>{st}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '8px', display: 'block' }}>Code CIM-O-3</label>
                                    <input type="text" className="login-input" placeholder="Ex: C50.9 / 8000/3" style={{ width: '100%' }}
                                        value={formData.icd10} onChange={e => setFormData({ ...formData, icd10: e.target.value })} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '8px', display: 'block' }}>Spécialité(s) Médicale(s) Attendue(s)</label>
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                                        gap: '8px',
                                        padding: '12px',
                                        backgroundColor: '#f8fafc',
                                        borderRadius: '12px',
                                        border: '1px solid #e2e8f0',
                                        maxHeight: '120px',
                                        overflowY: 'auto'
                                    }}>
                                        {allSpecialties.map(spec => {
                                            const currentSpecs = formData.specialty ? formData.specialty.split(',').map(s => s.trim()).filter(Boolean) : [];
                                            const isSelected = currentSpecs.includes(spec);
                                            return (
                                                <label key={spec} style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    fontSize: '11px',
                                                    cursor: 'pointer',
                                                    padding: '4px 6px',
                                                    borderRadius: '6px',
                                                    backgroundColor: isSelected ? '#ede9fe' : 'transparent',
                                                    border: `1px solid ${isSelected ? '#c4b5fd' : 'transparent'}`,
                                                    transition: 'all 0.1s'
                                                }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => {
                                                            const nextSpecs = isSelected 
                                                                ? currentSpecs.filter(s => s !== spec)
                                                                : [...currentSpecs, spec];
                                                            setFormData({ ...formData, specialty: nextSpecs.join(', ') });
                                                        }}
                                                        style={{ width: '14px', height: '14px', accentColor: '#7c3aed' }}
                                                    />
                                                    <span style={{ fontWeight: isSelected ? '700' : '400', color: isSelected ? '#7c3aed' : '#475569' }}>{spec}</span>
                                                </label>
                                            );
                                        })}
                                        {allSpecialties.length === 0 && <div style={{ fontSize: '11px', color: '#94a3b8' }}>Chargement...</div>}
                                    </div>
                                </div>
                            </div>
                            <div style={{ padding: '16px', backgroundColor: '#f1f5f9', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                                <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', marginBottom: '16px' }}>Règles de Validation IARC</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '8px', display: 'block' }}>Sexe Restreint ?</label>
                                        <select className="login-input" style={{ width: '100%' }} value={formData.allowed_gender || ''} onChange={e => setFormData({ ...formData, allowed_gender: e.target.value })}>
                                            <option value="">Aucun (Tous)</option>
                                            <option value="Female">Femme Seulement</option>
                                            <option value="Male">Homme Seulement</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '8px', display: 'block' }}>Âge Minimum</label>
                                        <input type="number" className="login-input" style={{ width: '100%' }} value={formData.min_age} onChange={e => setFormData({ ...formData, min_age: parseInt(e.target.value) || 0 })} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '8px', display: 'block' }}>Âge Maximum</label>
                                        <input type="number" className="login-input" style={{ width: '100%' }} value={formData.max_age} onChange={e => setFormData({ ...formData, max_age: parseInt(e.target.value) || 120 })} />
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '12px 24px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'transparent', cursor: 'pointer', fontWeight: 'bold' }}>Annuler</button>
                                <button type="submit" className="login-button" style={{ padding: '12px 32px' }}>Enregistrer</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CancerReferencePage;
