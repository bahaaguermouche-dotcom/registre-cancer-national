import React, { useState } from 'react';
import { bodyRegions } from './body-map-data';

interface Diagnosis {
    id: string;
    body_region: string;
    organ: string;
    topography_code: string;
}

interface BodyMapViewerProps {
    diagnoses: Diagnosis[];
    onRegionClick: (regionId: string, diagnosesInRegion: Diagnosis[]) => void;
}

const BodyMapViewer: React.FC<BodyMapViewerProps> = ({ diagnoses, onRegionClick }) => {
    const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);

    // Get all regions that have at least one diagnosis
    const activeRegions = new Set(diagnoses.map(d => d.body_region).filter(Boolean));

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <svg 
                viewBox="0 0 240 300" 
                style={{ width: '200px', height: 'auto', filter: 'drop-shadow(0px 10px 15px rgba(0,0,0,0.1))' }}
            >
                <defs>
                    <radialGradient id="pulse-gradient" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="red" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="red" stopOpacity="0" />
                    </radialGradient>
                    <style>
                        {`
                            @keyframes pulse {
                                0% { transform: scale(0.9); opacity: 0.7; }
                                50% { transform: scale(1.2); opacity: 1; }
                                100% { transform: scale(0.9); opacity: 0.7; }
                            }
                            .pulse-marker {
                                animation: pulse 2s infinite ease-in-out;
                                transform-origin: center;
                            }
                        `}
                    </style>
                </defs>

                {Object.entries(bodyRegions).map(([key, region]) => {
                    const isActive = activeRegions.has(key);
                    const isHovered = hoveredRegion === key;
                    const fill = isActive ? (isHovered ? '#ff4d4d' : region.color) : (isHovered ? '#e2e8f0' : '#f1f5f9');
                    const stroke = isActive ? '#b91c1c' : '#cbd5e1';

                    // Calculate a rough center for the marker based on the path (simplified)
                    // In a real app, you'd store exact center coordinates in body-map-data.ts
                    let cx = 120;
                    let cy = 0;
                    if (key === 'tete_cou') cy = 40;
                    if (key === 'thorax') cy = 100;
                    if (key === 'abdomen') cy = 185;
                    if (key === 'pelvis') cy = 230;

                    return (
                        <g 
                            key={key}
                            onMouseEnter={() => setHoveredRegion(key)}
                            onMouseLeave={() => setHoveredRegion(null)}
                            onClick={() => {
                                const regionDiagnoses = diagnoses.filter(d => d.body_region === key);
                                onRegionClick(key, regionDiagnoses);
                            }}
                            style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
                        >
                            <path 
                                d={region.svgPath} 
                                fill={fill} 
                                stroke={stroke} 
                                strokeWidth="2"
                                style={{ transition: 'fill 0.3s ease' }}
                            />
                            {isActive && (
                                <circle 
                                    cx={cx} 
                                    cy={cy} 
                                    r="8" 
                                    fill="url(#pulse-gradient)" 
                                    className="pulse-marker"
                                    style={{ transformOrigin: `${cx}px ${cy}px` }}
                                />
                            )}
                            {isActive && (
                                <circle cx={cx} cy={cy} r="3" fill="red" />
                            )}
                        </g>
                    );
                })}
            </svg>
            
            {hoveredRegion && (
                <div style={{ marginTop: '16px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                    {bodyRegions[hoveredRegion as keyof typeof bodyRegions].label}
                    {activeRegions.has(hoveredRegion) && <span style={{ color: 'red', marginLeft: '8px' }}>• Lésion détectée</span>}
                </div>
            )}
        </div>
    );
};

export default BodyMapViewer;
