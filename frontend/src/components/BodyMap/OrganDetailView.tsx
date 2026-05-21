import React from 'react';
import { bodyRegions } from './body-map-data';
import { X, MapPin } from 'lucide-react';

interface Diagnosis {
    id: string;
    body_region: string;
    organ: string;
    organ_zone?: string;
    topography_code: string;
    stade_global?: string;
}

interface OrganDetailViewProps {
    regionId: string;
    diagnoses: Diagnosis[];
    onClose: () => void;
}

const OrganDetailView: React.FC<OrganDetailViewProps> = ({ regionId, diagnoses, onClose }) => {
    const region = bodyRegions[regionId as keyof typeof bodyRegions];
    
    if (!region) return null;

    // Group diagnoses by organ
    const diagnosesByOrgan = diagnoses.reduce((acc, diag) => {
        if (!acc[diag.organ]) acc[diag.organ] = [];
        acc[diag.organ].push(diag);
        return acc;
    }, {} as Record<string, Diagnosis[]>);

    return (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
            <div className="modal-content animate-fadeIn" style={{ backgroundColor: 'var(--bg-surface)', width: '100%', maxWidth: '800px', borderRadius: '24px', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
                <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
                    <div>
                        <h2 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 4px', color: 'var(--text-primary)' }}>
                            Vue Détaillée : {region.label}
                        </h2>
                        <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>
                            {diagnoses.length} lésion(s) détectée(s) dans cette région
                        </p>
                    </div>
                    <button onClick={onClose} style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '8px', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                        <X size={24} />
                    </button>
                </div>

                <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                    {/* Left: Schematic visualization of the region */}
                    <div style={{ flex: '1', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', position: 'relative' }}>
                        <svg viewBox="0 0 240 300" style={{ width: '100%', height: '100%', maxHeight: '400px', filter: 'drop-shadow(0px 10px 15px rgba(0,0,0,0.1))' }}>
                            {/* Render the region scaled up */}
                            <g transform="scale(1.5) translate(-40, -20)">
                                <path 
                                    d={region.svgPath} 
                                    fill={region.color} 
                                    stroke="white" 
                                    strokeWidth="2"
                                    opacity="0.8"
                                />
                                {/* Add glowing markers for each affected organ */}
                                {Object.keys(diagnosesByOrgan).map((organ, index) => {
                                    // Calculate pseudo-random positions based on organ name for demo purposes
                                    // In a real app, these would be precise coordinates mapped in body-map-data.ts
                                    const hash = organ.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
                                    let cx = 120 + (hash % 40) - 20;
                                    let cy = 0;
                                    if (regionId === 'tete_cou') cy = 40 + (hash % 20);
                                    if (regionId === 'thorax') cy = 100 + (hash % 40);
                                    if (regionId === 'abdomen') cy = 185 + (hash % 30);
                                    if (regionId === 'pelvis') cy = 230 + (hash % 20);

                                    return (
                                        <g key={organ}>
                                            <circle cx={cx} cy={cy} r="12" fill="rgba(239, 68, 68, 0.2)" className="pulse-marker" style={{ transformOrigin: `${cx}px ${cy}px` }} />
                                            <circle cx={cx} cy={cy} r="4" fill="#ef4444" />
                                            <text x={cx + 15} y={cy + 4} fontSize="10" fill="#1e293b" fontWeight="800" style={{ textShadow: '1px 1px 2px white' }}>
                                                {organ.toUpperCase()}
                                            </text>
                                        </g>
                                    );
                                })}
                            </g>
                        </svg>
                    </div>

                    {/* Right: List of diagnoses in this region */}
                    <div style={{ width: '400px', padding: '24px', overflowY: 'auto', backgroundColor: 'white' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '20px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <MapPin size={18} style={{ color: region.color }} />
                            Organes Touchés
                        </h3>
                        
                        {Object.entries(diagnosesByOrgan).map(([organ, diags]) => (
                            <div key={organ} style={{ marginBottom: '24px' }}>
                                <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', textTransform: 'capitalize', marginBottom: '12px', paddingBottom: '8px', borderBottom: '2px solid #e2e8f0' }}>
                                    {organ}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {diags.map((d: any) => (
                                        <div key={d.id} style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                                <div>
                                                    <span style={{ fontSize: '12px', fontWeight: '800', color: '#2563eb', backgroundColor: '#eff6ff', padding: '4px 8px', borderRadius: '6px', marginRight: '8px' }}>
                                                        {d.topography_code}
                                                    </span>
                                                    {d.organ_zone && (
                                                        <span style={{ fontSize: '12px', color: '#64748b' }}>
                                                            Zone : {d.organ_zone.replace(/_/g, ' ')}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px' }}>
                                                <div style={{ backgroundColor: 'white', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                                    <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>Stade</div>
                                                    <div style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b' }}>{d.stade_global || 'N/A'}</div>
                                                </div>
                                                <div style={{ backgroundColor: 'white', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                                    <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>Grade</div>
                                                    <div style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b' }}>{d.grade || 'N/A'}</div>
                                                </div>
                                            </div>
                                            
                                            {d.notes && (
                                                <div style={{ marginTop: '12px', fontSize: '13px', color: '#475569', backgroundColor: 'white', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                                    <strong>Observations :</strong> {d.notes}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrganDetailView;
