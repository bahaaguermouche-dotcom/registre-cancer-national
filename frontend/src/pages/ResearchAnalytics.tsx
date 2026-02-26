import React, { useState, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import {
    Map, Users, Download, TrendingUp,
    RefreshCw, ChevronRight, Activity, Database, Shield, Save, ChartBar, PieChart as PieIcon, List
} from 'lucide-react';
import axios from 'axios';

const COLORS = ['#2563eb', '#7c3aed', '#059669', '#dc2626', '#f59e0b', '#06b6d4'];

const ResearchAnalytics: React.FC = () => {
    // States
    const [kpis, setKpis] = useState<any>(null);
    const [queryResult, setQueryResult] = useState<any[]>([]);
    const [savedReports, setSavedReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    // Builder Config
    const [config, setConfig] = useState({
        dataSource: 'cancer_cases',
        chartType: 'bar',
        groupBy: 'location',
        filters: {}
    });

    useEffect(() => {
        initPage();
    }, []);

    const initPage = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            // Fetch Fixed KPIs
            const kpiRes = await axios.get('http://localhost:5000/api/stats/kpis', { headers });
            setKpis(kpiRes.data);

            // Fetch Saved Reports
            const reportsRes = await axios.get('http://localhost:5000/api/stats/saved-reports', { headers });
            setSavedReports(reportsRes.data);

            // Initial Query
            await handleGenerate();
        } catch (error) {
            console.error("Init Error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:5000/api/stats/query', {
                params: config,
                headers: { Authorization: `Bearer ${token}` }
            });
            // Ensure numeric values for Recharts
            const sanitizedData = res.data.map((item: any) => ({
                ...item,
                value: Number(item.value) || 0
            }));
            setQueryResult(sanitizedData);
        } catch (error) {
            console.error("Query Error:", error);
        } finally {
            setGenerating(false);
        }
    };

    const handleSaveReport = async () => {
        const name = prompt("Nom du rapport :");
        if (!name) return;
        try {
            const token = localStorage.getItem('token');
            await axios.post('http://localhost:5000/api/stats/saved-reports',
                { name, config },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            // Refresh
            const reportsRes = await axios.get('http://localhost:5000/api/stats/saved-reports', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSavedReports(reportsRes.data);
        } catch (error) {
            alert("Erreur lors de la sauvegarde");
        }
    };

    const renderChart = () => {
        if (generating) return <div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RefreshCw className="animate-spin" size={32} /></div>;
        if (queryResult.length === 0) return <div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>Aucune donnée disponible pour ces filtres.</div>;

        return (
            <div style={{ width: '100%', height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {config.chartType === 'bar' ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={queryResult}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="label" />
                            <YAxis />
                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                            <Bar dataKey="value" fill="#2563eb" radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                ) : config.chartType === 'pie' ? (
                    <PieChart width={500} height={400}>
                        <Pie
                            data={queryResult}
                            dataKey="value"
                            nameKey="label"
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={130}
                            paddingAngle={5}
                            label
                            isAnimationActive={false}
                        >
                            {queryResult.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                ) : config.chartType === 'area' ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={queryResult}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="label" />
                            <YAxis />
                            <Tooltip />
                            <Area type="monotone" dataKey="value" stroke="#7c3aed" fill="#7c3aed33" />
                        </AreaChart>
                    </ResponsiveContainer>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={queryResult}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="label" />
                            <YAxis />
                            <Tooltip />
                            <Line type="monotone" dataKey="value" stroke="#059669" strokeWidth={3} dot={{ r: 6 }} />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </div>
        );
    };

    if (loading) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RefreshCw className="animate-spin" size={48} color="#2563eb" /></div>;

    return (
        <div style={{ padding: '40px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
                <div>
                    <h1 style={{ fontSize: '32px', fontWeight: '900', color: '#0f172a', margin: '0 0 8px' }}>Rapports & Statistiques Avancées</h1>
                    <p style={{ color: '#64748b', fontSize: '16px' }}>Générateur de rapports dynamiques et KPIs nationaux</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button className="auth-button" style={{ backgroundColor: 'white', color: '#0f172a', border: '1px solid #e2e8f0', width: 'auto', padding: '12px 24px' }}>
                        <Download size={18} style={{ marginRight: '8px' }} /> Exporter CSV
                    </button>
                    <button className="auth-button" onClick={handleSaveReport} style={{ width: 'auto', padding: '12px 24px' }}>
                        <Save size={18} style={{ marginRight: '8px' }} /> Sauvegarder Config
                    </button>
                </div>
            </div>

            {/* Part 1: Fixed KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '40px' }}>
                <StatCard title="Incidence Nationale" value={kpis?.totalPatients} icon={<Activity color="#2563eb" />} change="+12%" positive />
                <StatCard title="Nouveaux Cas (Mois)" value={kpis?.newPatientsMonth} icon={<Users color="#7c3aed" />} change="+3%" positive />
                <StatCard title="Wilayas Actives" value={kpis?.activeCenters} icon={<Map color="#059669" />} />
                <StatCard title="Attente Approbation" value={kpis?.pendingApprovals} icon={<Shield color="#dc2626" />} change="-15%" positive={false} />
            </div>

            {/* Part 2: Builder Zone */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '32px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Main Visualization */}
                    <div style={{ backgroundColor: 'white', borderRadius: '32px', padding: '32px', border: '1px solid #f1f5f9', boxShadow: '0 10px 30px rgba(0,0,0,0.02)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                            <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Visualisation des Données</h3>
                            {generating && <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#2563eb', fontSize: '14px', fontWeight: '600' }}><RefreshCw className="animate-spin" size={16} /> Mise à jour...</div>}
                        </div>
                        {renderChart()}
                    </div>

                    {/* Data Table Preview */}
                    <div style={{ backgroundColor: 'white', borderRadius: '32px', padding: '32px', border: '1px solid #f1f5f9' }}>
                        <h4 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', marginBottom: '20px' }}>Données Brutes</h4>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                            <thead>
                                <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9' }}>
                                    <th style={{ padding: '12px', color: '#64748b' }}>Catégorie</th>
                                    <th style={{ padding: '12px', color: '#64748b' }}>Fréquence</th>
                                    <th style={{ padding: '12px', color: '#64748b' }}>Ratio (%)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {queryResult.map((item, i) => {
                                    const total = queryResult.reduce((a, b) => a + parseInt(b.value), 0);
                                    const percent = ((parseInt(item.value) / total) * 100).toFixed(1);
                                    return (
                                        <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
                                            <td style={{ padding: '12px', fontWeight: '600' }}>{item.label}</td>
                                            <td style={{ padding: '12px' }}>{item.value}</td>
                                            <td style={{ padding: '12px' }}>{percent}%</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Sidebar: Builder & Saved Reports */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Builder Config */}
                    <div style={{ backgroundColor: 'white', borderRadius: '32px', padding: '28px', border: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                            <Database size={20} color="#2563eb" />
                            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Config Rapport</h3>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Source</label>
                                <select
                                    value={config.dataSource}
                                    onChange={(e) => setConfig({ ...config, dataSource: e.target.value })}
                                    style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontWeight: '600' }}
                                >
                                    <option value="cancer_cases">Cas de Cancers</option>
                                    <option value="deaths">Décès</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Période</label>
                                <select style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontWeight: '600' }}>
                                    <option>Toute la base</option>
                                    <option>Dernier mois</option>
                                    <option>Dernière année</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Grouper par</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                    {[
                                        { id: 'location', label: 'Wilaya' },
                                        { id: 'gender', label: 'Genre' },
                                        { id: 'type', label: 'Type' },
                                        { id: 'age', label: 'Âge' }
                                    ].map(item => (
                                        <button
                                            key={item.id}
                                            onClick={() => setConfig({ ...config, groupBy: item.id })}
                                            style={{
                                                padding: '10px', borderRadius: '12px', border: '1px solid #e2e8f0',
                                                backgroundColor: config.groupBy === item.id ? '#2563eb' : 'white',
                                                color: config.groupBy === item.id ? 'white' : '#64748b',
                                                fontSize: '13px', fontWeight: '700', transition: 'all 0.2s'
                                            }}
                                        >
                                            {item.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Visualisation</label>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    {[
                                        { id: 'bar', icon: <ChartBar size={18} /> },
                                        { id: 'pie', icon: <PieIcon size={18} /> },
                                        { id: 'area', icon: <Activity size={18} /> },
                                        { id: 'line', icon: <TrendingUp size={18} /> }
                                    ].map(item => (
                                        <button
                                            key={item.id}
                                            onClick={() => setConfig({ ...config, chartType: item.id })}
                                            style={{
                                                flex: 1, padding: '10px', borderRadius: '12px', border: '1px solid #e2e8f0',
                                                backgroundColor: config.chartType === item.id ? '#0f172a' : 'white',
                                                color: config.chartType === item.id ? 'white' : '#64748b',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                                            }}
                                        >
                                            {item.icon}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button onClick={handleGenerate} className="auth-button" style={{ marginTop: '12px', padding: '14px' }}>
                                Générer le Rapport
                            </button>
                        </div>
                    </div>

                    {/* Saved Reports Section */}
                    <div style={{ backgroundColor: 'white', borderRadius: '32px', padding: '28px', border: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                            <List size={20} color="#7c3aed" />
                            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Bibliothèque</h3>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {savedReports.length === 0 ? (
                                <p style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>Aucun rapport sauvé.</p>
                            ) : (
                                savedReports.map((report, i) => (
                                    <div
                                        key={i}
                                        onClick={() => setConfig(report.config)}
                                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: '#f8fafc', borderRadius: '16px', cursor: 'pointer' }}
                                    >
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>{report.name}</span>
                                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>{new Date(report.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <ChevronRight size={14} color="#94a3b8" />
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
};

const StatCard = ({ title, value, icon, change, positive }: any) => (
    <div style={{ padding: '24px', borderRadius: '24px', backgroundColor: 'white', border: '1px solid #f1f5f9', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
            {change && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: '800',
                    backgroundColor: positive ? '#f0fdf4' : '#fef2f2', color: positive ? '#15803d' : '#dc2626'
                }}>
                    {change}
                </div>
            )}
        </div>
        <div style={{ fontSize: '13px', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>{title}</div>
        <div style={{ fontSize: '28px', fontWeight: '900', color: '#0f172a' }}>{value ?? 0}</div>
    </div>
);

export default ResearchAnalytics;
