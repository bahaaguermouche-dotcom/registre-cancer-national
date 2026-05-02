import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap, Circle, Tooltip, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import algeriaGeoJSON from '../assets/algeria_provinces.json';

interface WilayaData {
    wilaya: string;
    count: number;
    population: number;
    incidence: number;
}

interface RiskZone {
    id: number;
    name: string;
    type: string;
    geometry: {
        center: [number, number];
        radius: number;
    };
    description: string;
    severity: number;
}

interface Props {
    data: WilayaData[];
    riskZones?: RiskZone[];
    showRiskZones?: boolean;
    onSelectWilaya?: (wilaya: string) => void;
    onMapClick?: (latlng: any) => void;
}

// Helper component to handle map clicks
const MapEvents = ({ onClick }: { onClick: (latlng: any) => void }) => {
    useMapEvents({
        click(e) {
            onClick(e.latlng);
        },
    });
    return null;
};

const WilayaMap: React.FC<Props> = ({ data, riskZones = [], showRiskZones = false, onSelectWilaya, onMapClick }) => {
    const geoJsonLayer = React.useRef<any>(null);

    // Helper to get color based on incidence
    const getColor = (incidence: number) => {
        return incidence > 150 ? '#991b1b' :
               incidence > 100 ? '#dc2626' :
               incidence > 50  ? '#ef4444' :
               incidence > 20  ? '#f87171' :
               incidence > 10  ? '#fb923c' :
               incidence > 5   ? '#fbbf24' :
               incidence > 0   ? '#fef3c7' :
                                 '#f8fafc';
    };

    const getWilayaData = (name: string, code: number) => {
        const matches = data.filter(d => {
            if (!d.wilaya) return false;
            
            const codeMatch = d.wilaya.match(/\((\d+)\)/);
            if (codeMatch && parseInt(codeMatch[1]) === code) return true;
            
            const dName = d.wilaya.replace(/\(\d+\)/, '').trim().toLowerCase();
            const fName = name.trim().toLowerCase();
            return dName === fName || dName.includes(fName) || fName.includes(dName);
        });

        if (matches.length === 0) return null;

        return matches.reduce((acc, curr) => ({
            ...acc,
            count: acc.count + curr.count,
            incidence: Math.max(acc.incidence, curr.incidence),
            population: Math.max(acc.population || 0, curr.population || 0)
        }), { ...matches[0], count: 0, incidence: 0 });
    };

    const style = (feature: any) => {
        const code = parseInt(feature.properties.city_code);
        const name = feature.properties.name;
        const wilayaData = getWilayaData(name, code);

        const incidence = wilayaData ? wilayaData.incidence : 0;

        return {
            fillColor: getColor(incidence),
            weight: 2,
            opacity: 1,
            color: 'white',
            dashArray: '3',
            fillOpacity: 0.7
        };
    };

    const onEachFeature = (feature: any, layer: any) => {
        const code = parseInt(feature.properties.city_code);
        const name = feature.properties.name;
        const wilayaData = getWilayaData(name, code);

        const incidence = wilayaData ? wilayaData.incidence : 0;
        const count = wilayaData ? wilayaData.count : 0;

        layer.on({
            mouseover: (e: any) => {
                const layer = e.target;
                layer.setStyle({
                    weight: 5,
                    color: '#666',
                    dashArray: '',
                    fillOpacity: 0.7
                });
                layer.bindTooltip(`
                    <strong>${name} (${code})</strong><br/>
                    Cas: ${count}<br/>
                    Incidence: ${incidence.toFixed(2)}/100k
                `, { sticky: true }).openTooltip();
            },
            mouseout: (e: any) => {
                geoJsonLayer.current?.resetStyle(e.target);
            },
            click: () => {
                if (onSelectWilaya && wilayaData) {
                    onSelectWilaya(wilayaData.wilaya);
                }
            }
        });
    };

    // Risk Zone styling based on type
    const getZoneColor = (type: string) => {
        switch(type) {
            case 'Pollution': return '#ef4444';
            case 'Industrielle': return '#7c3aed';
            case 'Urbaine': return '#2563eb';
            default: return '#fbbf24';
        }
    };

    return (
        <div style={{ position: 'relative', height: '500px', width: '100%', borderRadius: '12px', overflow: 'hidden' }}>
            <MapContainer 
                center={[28.0339, 1.6596] as any} // Center of Algeria
                zoom={5} 
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={false}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                
                {onMapClick && <MapEvents onClick={onMapClick} />}

                <GeoJSON 
                    key={JSON.stringify(data || [])}
                    ref={geoJsonLayer}
                    data={algeriaGeoJSON as any} 
                    style={style} 
                    onEachFeature={onEachFeature}
                />

                {showRiskZones && riskZones.map((zone) => (
                    <Circle
                        key={zone.id}
                        center={zone.geometry.center}
                        radius={zone.geometry.radius}
                        pathOptions={{
                            fillColor: getZoneColor(zone.type),
                            color: getZoneColor(zone.type),
                            weight: 2,
                            fillOpacity: 0.4
                        }}
                    >
                        <Tooltip sticky>
                            <div style={{ padding: '4px' }}>
                                <strong style={{ color: getZoneColor(zone.type) }}>Zone {zone.type}</strong><br/>
                                <strong>{zone.name}</strong><br/>
                                {zone.description && <span style={{ fontSize: '11px', color: '#64748b' }}>{zone.description}</span>}
                            </div>
                        </Tooltip>
                    </Circle>
                ))}
            </MapContainer>

            {/* Legend Overlay */}
            <div style={{
                position: 'absolute',
                bottom: '20px',
                right: '20px',
                backgroundColor: 'white',
                padding: '12px',
                borderRadius: '12px',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                zIndex: 1000,
                fontSize: '11px',
                border: '1px solid #e2e8f0'
            }}>
                <strong style={{ display: 'block', marginBottom: '8px', color: '#1e293b' }}>Incidence / 100k</strong>
                {[150, 100, 50, 20, 10, 5, 0].map((val, i) => (
                    <div key={val} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: getColor(val + 0.1) }}></div>
                        <span style={{ color: '#64748b' }}>{val === 150 ? '+150' : val === 0 ? '0' : `>${val}`}</span>
                    </div>
                ))}
            </div>

            {showRiskZones && (
                <div style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    backgroundColor: 'white',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                    zIndex: 1000,
                    fontSize: '10px',
                    border: '1px solid #e2e8f0'
                }}>
                    <strong style={{ display: 'block', marginBottom: '4px' }}>Légende Zones</strong>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444' }}></div> Pollution
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#7c3aed' }}></div> Ind.
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WilayaMap;
