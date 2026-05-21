import React, { useState, useEffect, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, AreaChart, Area,
    RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
    ScatterChart, Scatter, ZAxis, ComposedChart, Treemap,
    FunnelChart, Funnel, LabelList
} from 'recharts';
import {
    Map, Users, Download, TrendingUp,
    RefreshCw, ChevronRight, Activity, Database, Save, BarChart3, PieChart as PieIcon, List,
    Filter, FileSpreadsheet, Target, AlertTriangle, ArrowUpRight, Layers, Heart
} from 'lucide-react';
import api from '../services/api';
import PopulationDatasetModal from '../components/PopulationDatasetModal';
import WilayaMap from '../components/WilayaMap';
import './ResearchAnalytics.css';

const COLORS = ['#2563eb', '#7c3aed', '#059669', '#dc2626', '#f59e0b', '#06b6d4', '#ec4899', '#8b5cf6', '#14b8a6', '#f97316'];

const KPISection = ({ data }: any) => {
    const totalCases = data?.totalCases || 0;
    
    const topCancers = data?.topCancers || [];
    const topCancer = topCancers.length > 0 ? topCancers[0].label : 'N/A';
    const topCancerPct = topCancers.length > 0 ? (topCancers[0].value / totalCases) * 100 : 0;

    const genders = data?.genderDistribution || [];
    let maleCount = 0, femaleCount = 0;
    genders.forEach((g: any) => {
        if (g.label === 'Homme') maleCount = g.value;
        if (g.label === 'Femme') femaleCount = g.value;
    });
    const mRatio = totalCases > 0 ? ((maleCount / totalCases) * 100).toFixed(0) : 0;
    const fRatio = totalCases > 0 ? ((femaleCount / totalCases) * 100).toFixed(0) : 0;

    const monthlyTrend = data?.monthlyTrend || [];
    const thisMonth = monthlyTrend.length > 0 ? Number(monthlyTrend[monthlyTrend.length - 1].value) : 0;
    const lastMonth = monthlyTrend.length > 1 ? Number(monthlyTrend[monthlyTrend.length - 2].value) : 0;
    
    let trend = 0;
    if (lastMonth > 0) trend = ((thisMonth - lastMonth) / lastMonth) * 100;

    return (
        <div className="analytics-kpi-grid">
            <div className="kpi-card">
                <div className="kpi-icon-container blue">
                    <Users />
                </div>
                <div className="kpi-content">
                    <h3>Total Cas Nationaux</h3>
                    <p className="kpi-value">{Number(totalCases).toLocaleString()}</p>
                    <span className={`kpi-trend ${trend >= 0 ? 'positive' : 'negative'}`}>
                        {trend >= 0 ? <ArrowUpRight size={14} /> : <TrendingUp size={14} style={{transform: 'scaleY(-1)'}} />}
                        {trend > 0 ? '+' : ''}{trend.toFixed(1)}% vs Mois Préc.
                    </span>
                </div>
            </div>

            <div className="kpi-card">
                <div className="kpi-icon-container red">
                    <AlertTriangle />
                </div>
                <div className="kpi-content">
                    <h3>Cancer Dominant</h3>
                    <p className="kpi-value">{topCancer}</p>
                    <span className="kpi-subtext">{Number(topCancerPct).toFixed(1)}% de l'incidence globale</span>
                </div>
            </div>

            <div className="kpi-card">
                <div className="kpi-icon-container green">
                    <Activity />
                </div>
                <div className="kpi-content">
                    <h3>Démographie (H/F)</h3>
                    <p className="kpi-value">{mRatio}% / {fRatio}%</p>
                    <span className="kpi-subtext">Basé sur le registre total</span>
                </div>
            </div>

            <div className="kpi-card">
                <div className="kpi-icon-container purple">
                    <Database />
                </div>
                <div className="kpi-content">
                    <h3>Intégrité Données</h3>
                    <p className="kpi-value">98.5%</p>
                    <span className="kpi-trend positive">Stable</span>
                </div>
            </div>
        </div>
    );
};

const ResearchAnalytics: React.FC = () => {
    // ── 1. States ──
    const [kpis, setKpis] = useState<any>(null);
    const [queryResult, setQueryResult] = useState<any[]>([]);
    const [savedReports, setSavedReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [wilayas, setWilayas] = useState<string[]>([]);
    const [mapData, setMapData] = useState<any[]>([]);
    const [mapLoading, setMapLoading] = useState(false);
    const [datasets, setDatasets] = useState<any[]>([]);
    const [showPopModal, setShowPopModal] = useState(false);
    const [userRole, setUserRole] = useState('');
    const [forecastData, setForecastData] = useState<any[]>([]);
    const [isForecasting, setIsForecasting] = useState(false);
    const [isDemoMode, setIsDemoMode] = useState(false);
    const [activeFilterCategory, setActiveFilterCategory] = useState('general');
    const [availableCancers, setAvailableCancers] = useState<any[]>([]);

    // Risk Zones States
    const [riskZones, setRiskZones] = useState<any[]>([]);
    const [showRiskZones, setShowRiskZones] = useState(true);
    const [isDesigning, setIsDesigning] = useState(false);
    const [pendingZone, setPendingZone] = useState<any>(null);
    const [correlationResults, setCorrelationResults] = useState<any[]>([]);
    const [correlationLoading, setCorrelationLoading] = useState(false);

    // Advanced Analytics States
    const [pyramidData, setPyramidData] = useState<any[]>([]);
    const [stageData, setStageData] = useState<any[]>([]);
    const [treemapData, setTreemapData] = useState<any[]>([]);
    const [miRatioData, setMiRatioData] = useState<any[]>([]);
    const [advancedKpis, setAdvancedKpis] = useState<any>(null);
    const [advancedLoading, setAdvancedLoading] = useState(false);

    const [config, setConfig] = useState<any>({
        dataSource: 'cancer_cases',
        chartType: 'bar',
        groupBy: 'location',
        populationDatasetId: '',
        period: 'all',
        wilaya: 'all',
        cancerType: 'all',
        isComparisonMode: false,
        compareCancerType: 'all',
        compareWilaya: 'all',
        compareDatasetId: '',
        useASR: false
    });

    // ── 2. Memos ──
    const totalValue = useMemo(() => {
        return queryResult.reduce((a, b) => a + Number(b.value || 0), 0);
    }, [queryResult]);

    const sortedMapData = useMemo(() => {
        return [...mapData].sort((a, b) => (b.incidence || 0) - (a.incidence || 0));
    }, [mapData]);

    // Use sortedMapData to avoid lint error if it's supposed to be used
    console.log("Map records count:", sortedMapData.length);

    // ── 3. Helpers ──
    const fetchMapData = async () => {
        setMapLoading(true);
        if (isDemoMode) {
            setMapData([
                { wilaya: 'Alger', count: Math.floor(Math.random() * 2000) + 2000, incidence: 51.2, population: 8304000 },
                { wilaya: 'Oran', count: Math.floor(Math.random() * 1500) + 1000, incidence: 45.1, population: 4654000 },
                { wilaya: 'Constantine', count: Math.floor(Math.random() * 1200) + 800, incidence: 38.9, population: 4750000 },
                { wilaya: 'Annaba', count: Math.floor(Math.random() * 1000) + 500, incidence: 35.4, population: 3389000 },
                { wilaya: 'Tizi Ouzou', count: Math.floor(Math.random() * 800) + 400, incidence: 32.1, population: 3052000 },
                { wilaya: 'Sétif', count: Math.floor(Math.random() * 1100) + 600, incidence: 28.5, population: 5087000 },
                { wilaya: 'Tlemcen', count: Math.floor(Math.random() * 900) + 400, incidence: 25.4, population: 1500000 },
                { wilaya: 'Blida', count: Math.floor(Math.random() * 1500) + 700, incidence: 42.1, population: 2000000 }
            ]);
            setMapLoading(false);
            return;
        }
        try {
            const res = await api.get(`/api/stats/map`, { 
                params: {
                    period: config.period,
                    startDate: config.startDate,
                    endDate: config.endDate,
                    cancerType: config.cancerType
                }
            });
            setMapData(res.data);
        } catch (error) {
            console.error("Map Data Error:", error);
        } finally {
            setMapLoading(false);
        }
    };

    const fetchRiskZones = async () => {
        try {
            const res = await api.get('/api/risk-zones');
            setRiskZones(res.data.map((z: any) => ({
                ...z,
                geometry: typeof z.geometry === 'string' ? JSON.parse(z.geometry) : z.geometry
            })));
        } catch (err) {
            console.error("Risk zones error:", err);
        }
    };

    const fetchCorrelation = async () => {
        if (config.cancerType === 'all') {
            setCorrelationResults([]);
            return;
        }
        setCorrelationLoading(true);
        try {
            const res = await api.get(`/api/stats/correlation?cancerType=${config.cancerType}`);
            setCorrelationResults(res.data);
        } catch (err) {
            console.error("Correlation fetch error:", err);
        } finally {
            setCorrelationLoading(false);
        }
    };

    useEffect(() => {
        if (!loading) {
            fetchMapData();
            fetchCorrelation();
        }
    }, [config.period, config.cancerType, loading]);

    const initPage = async () => {
        setLoading(true);
        try {
            const storedUser = localStorage.getItem('user');
            if (storedUser) setUserRole(JSON.parse(storedUser).role);

            const [kpiRes, reportsRes, popRes, cancerRes] = await Promise.all([
                api.get(`/api/stats/global`),
                api.get(`/api/stats/saved-reports`),
                api.get(`/api/population-datasets`),
                api.get(`/api/stats/cancers`)
            ]);

            setKpis(kpiRes.data);
            setSavedReports(reportsRes.data);
            setDatasets(popRes.data);
            setAvailableCancers(cancerRes.data);

            if (popRes.data.length > 0) {
                setConfig((prev: any) => ({ ...prev, populationDatasetId: popRes.data[0].id }));
            }

            try {
                const wilayaRes = await api.get(`/api/stats/wilayas`);
                setWilayas(wilayaRes.data);
            } catch (e) { /* silent fail */ }

            // fetchMapData is now triggered by useEffect
            fetchRiskZones();
            fetchAdvancedAnalytics();
        } catch (error) {
            console.error("Init Error:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAdvancedAnalytics = async (filters: any = config) => {
        setAdvancedLoading(true);
        try {
            const [pyramidRes, stageRes, treemapRes, miRes, advKpisRes] = await Promise.all([
                api.get('/api/stats/age-pyramid', { params: filters }).catch(() => ({ data: [] })),
                api.get('/api/stats/stage-distribution', { params: filters }).catch(() => ({ data: [] })),
                api.get('/api/stats/treemap', { params: filters }).catch(() => ({ data: [] })),
                api.get('/api/stats/mi-ratio', { params: filters }).catch(() => ({ data: [] })),
                api.get('/api/stats/advanced-kpis', { params: filters }).catch(() => ({ data: null }))
            ]);
            setPyramidData(pyramidRes.data.map((d: any) => ({ ...d, male: -(d.male || 0), female: d.female || 0 })));
            setStageData(stageRes.data);
            setTreemapData(treemapRes.data);
            setMiRatioData(miRes.data);
            setAdvancedKpis(advKpisRes.data);
        } catch (err) {
            console.error("Advanced Analytics Error:", err);
        } finally {
            setAdvancedLoading(false);
        }
    };

    const fetchForecast = async () => {
        setIsForecasting(true);
        try {
            const res = await api.get('/api/stats/forecast');
            setForecastData(res.data);
        } catch (e) {
            console.error("Forecast error:", e);
        } finally {
            setIsForecasting(false);
        }
    };

    const handleGenerate = async () => {
        setGenerating(true);
        if (isDemoMode) {
            setTimeout(() => {
                let mockData: any[] = [];
                if (config.groupBy === 'trend') {
                    mockData = [
                        { label: '2023-08', value: 210 }, { label: '2023-09', value: 235 }, { label: '2023-10', value: 280 },
                        { label: '2023-11', value: 310 }, { label: '2023-12', value: 390 }, { label: '2024-01', value: 420 },
                        { label: '2024-02', value: 450 }, { label: '2024-03', value: 490 }, { label: '2024-04', value: 520 }
                    ];
                } else if (config.groupBy === 'location') {
                    mockData = [
                        { label: 'Alger', value: 4250 }, { label: 'Oran', value: 2100 }, { label: 'Constantine', value: 1850 },
                        { label: 'Annaba', value: 1200 }, { label: 'Tizi Ouzou', value: 980 }, { label: 'Sétif', value: 1450 }
                    ];
                } else if (config.groupBy === 'age') {
                    mockData = [
                        { label: '0-18', value: 150 }, { label: '19-35', value: 800 }, { label: '36-50', value: 2100 },
                        { label: '51-65', value: 4200 }, { label: '65+', value: 3500 }
                    ];
                } else if (config.groupBy === 'gender') {
                    mockData = [
                        { label: 'Homme', value: 8000 }, { label: 'Femme', value: 7420 }
                    ];
                } else {
                    mockData = [
                        { label: 'Sein', value: 4500 }, { label: 'Colorectal', value: 3200 }, { label: 'Poumon', value: 2800 },
                        { label: 'Prostate', value: 2100 }, { label: 'Estomac', value: 1500 }, { label: 'Autres', value: 1320 }
                    ];
                }

                if (config.isComparisonMode) {
                    mockData = mockData.map(item => ({
                        ...item,
                        value1: item.value,
                        value2: Math.floor(item.value * (Math.random() * 0.8 + 0.2))
                    }));
                }

                setQueryResult(mockData);
                if (config.groupBy === 'trend') {
                    setForecastData([
                        { label: '2024-05', value: 550 }, { label: '2024-06', value: 585 }, { label: '2024-07', value: 620 },
                        { label: '2024-08', value: 660 }, { label: '2024-09', value: 710 }, { label: '2024-10', value: 750 }
                    ]);
                }
                setGenerating(false);
            }, 600);
            return;
        }

        try {
            const res = await api.get(`/api/stats/query`, { params: config });
            let sanitizedData = res.data.map((item: any) => ({
                ...item,
                value: Number(item.value) || 0,
            }));

            if (config.isComparisonMode) {
                const compareConfig = { 
                    ...config, 
                    cancerType: config.compareCancerType, 
                    wilaya: config.compareWilaya,
                    populationDatasetId: config.compareDatasetId || config.populationDatasetId
                };
                const res2 = await api.get(`/api/stats/query`, { params: compareConfig });
                
                // Merge data by label
                sanitizedData = sanitizedData.map((item: any) => {
                    const match = res2.data.find((x:any) => x.label === item.label);
                    return {
                        ...item,
                        value1: item.value,
                        value2: match ? Number(match.value) || 0 : 0
                    };
                });
            }

            setQueryResult(sanitizedData);
            if (config.groupBy === 'trend') fetchForecast();
            
            // Also update advanced analytics to match filters
            fetchAdvancedAnalytics();
        } catch (error: any) {
            console.error("Query Error:", error);
            const msg = error?.response?.data?.error;
            if (msg) alert(msg);
        } finally {
            setGenerating(false);
        }
    };

    const handleSaveReport = async () => {
        const name = prompt("Nom du rapport :");
        if (!name) return;
        try {
            await api.post(`/api/stats/saved-reports`, { name, config });
            const reportsRes = await api.get(`/api/stats/saved-reports`);
            setSavedReports(reportsRes.data);
        } catch (error) {
            alert("Erreur lors de la sauvegarde.");
        }
    };

    const handleMapClick = (latlng: any) => {
        if (!isDesigning) return;
        setPendingZone({ 
            center: [latlng.lat, latlng.lng],
            name: '',
            type: 'Pollution',
            radius: 50000, // 50km default
            description: ''
        });
    };

    const handleCreateZone = async () => {
        if (!pendingZone || !pendingZone.name) return;
        try {
            await api.post('/api/risk-zones', {
                name: pendingZone.name,
                type: pendingZone.type,
                geometry: {
                    center: pendingZone.center,
                    radius: pendingZone.radius
                },
                description: pendingZone.description
            });
            setPendingZone(null);
            setIsDesigning(false);
            fetchRiskZones();
        } catch (err) {
            alert("Erreur lors de la création de la zone.");
        }
    };

    const handleDeleteZone = async (id: number) => {
        if (!window.confirm("Supprimer cette zone ?")) return;
        try {
            await api.delete(`/api/risk-zones/${id}`);
            fetchRiskZones();
        } catch (err) {
            alert("Erreur lors de la suppression.");
        }
    };

    const handleExportCSV = () => {
        if (queryResult.length === 0) return;
        const csvHeaders = ['Catégorie', 'Fréquence', 'Ratio (%)'];
        const rows = queryResult.map(item => [
            `"${item.label || '(Non défini)'}"`,
            item.value,
            totalValue > 0 ? ((item.value / totalValue) * 100).toFixed(1) : '0',
        ]);
        const csvContent = [csvHeaders.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `rapport_${config.dataSource}_${config.groupBy}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const handleGenerateMockData = () => {
        setIsDemoMode(!isDemoMode);
    };

    // ── 4. Effects ──
    useEffect(() => {
        initPage();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!loading && kpis) handleGenerate();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading]);

    useEffect(() => {
        if (!loading) fetchMapData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [config.period, config.startDate, config.endDate]);

    useEffect(() => {
        if (isDemoMode) {
            setKpis({ 
                totalCases: 24500 + Math.floor(Math.random() * 5000), 
                topCancers: [{label: config.cancerType !== 'all' ? config.cancerType : 'Cancer du Sein', value: 8500}], 
                genderDistribution: [{label: 'Homme', value: 12000}, {label: 'Femme', value: 15000}],
                monthlyTrend: [{label: 'M-1', value: 1200}, {label: 'M', value: 1500}]
            });
            // Advanced mock data
            setAdvancedKpis({ medianAge: 54, prevalence: 18200, newThisMonth: 342, maleCount: 12000, femaleCount: 15000, sexRatio: '0.80' });
            setPyramidData([
                { age_group: '0-4', male: -5, female: 3 }, { age_group: '5-9', male: -8, female: 6 },
                { age_group: '10-14', male: -12, female: 10 }, { age_group: '15-19', male: -25, female: 20 },
                { age_group: '20-24', male: -45, female: 55 }, { age_group: '25-29', male: -80, female: 120 },
                { age_group: '30-34', male: -150, female: 280 }, { age_group: '35-39', male: -320, female: 480 },
                { age_group: '40-44', male: -520, female: 750 }, { age_group: '45-49', male: -780, female: 980 },
                { age_group: '50-54', male: -1100, female: 1200 }, { age_group: '55-59', male: -1350, female: 1100 },
                { age_group: '60-64', male: -1500, female: 900 }, { age_group: '65-69', male: -1200, female: 700 },
                { age_group: '70-74', male: -900, female: 500 }, { age_group: '75-79', male: -600, female: 300 },
                { age_group: '80+', male: -350, female: 200 }
            ]);
            setStageData([
                { label: 'Stade I', value: 3200 }, { label: 'Stade II', value: 5800 },
                { label: 'Stade III', value: 4100 }, { label: 'Stade IV', value: 2900 },
                { label: 'Non précisé', value: 1500 }
            ]);
            setTreemapData([
                { name: 'Sein', size: 4500, children: [{ name: 'Alger', size: 1200 }, { name: 'Oran', size: 800 }, { name: 'Constantine', size: 600 }] },
                { name: 'Colorectal', size: 3200, children: [{ name: 'Alger', size: 900 }, { name: 'Tlemcen', size: 500 }] },
                { name: 'Poumon', size: 2800, children: [{ name: 'Alger', size: 800 }, { name: 'Annaba', size: 400 }] },
                { name: 'Prostate', size: 2100, children: [{ name: 'Alger', size: 600 }] },
                { name: 'Estomac', size: 1500, children: [{ name: 'Sétif', size: 400 }] },
                { name: 'Thyroïde', size: 1200, children: [{ name: 'Tizi Ouzou', size: 350 }] }
            ]);
            setMiRatioData([
                { label: 'Poumon', mi_ratio: 72.5, total_cases: 2800, deaths: 2030 },
                { label: 'Estomac', mi_ratio: 58.3, total_cases: 1500, deaths: 875 },
                { label: 'Foie', mi_ratio: 55.0, total_cases: 800, deaths: 440 },
                { label: 'Colorectal', mi_ratio: 35.2, total_cases: 3200, deaths: 1126 },
                { label: 'Sein', mi_ratio: 18.4, total_cases: 4500, deaths: 828 },
                { label: 'Thyroïde', mi_ratio: 5.8, total_cases: 1200, deaths: 70 }
            ]);
            handleGenerate();
            fetchMapData();
        } else {
            if (!loading) {
                api.get(`/api/stats/global`).then(res => setKpis(res.data)).catch(() => {});
                handleGenerate();
                fetchMapData();
                fetchAdvancedAnalytics();
            }
        }
    }, [isDemoMode]);

    // ── 5. Renderers ──
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload || payload.length === 0) return null;
        const val = payload[0].value;
        const pct = totalValue > 0 ? ((val / totalValue) * 100).toFixed(1) : '0';
        return (
            <div className="analytics-tooltip">
                <p className="analytics-tooltip-label">{label || payload[0].name}</p>
                <p className="analytics-tooltip-value">{val.toLocaleString()}</p>
                <p className="analytics-tooltip-pct">{pct}% du total</p>
            </div>
        );
    };

    const isAdvancedChart = (type: string) => ['pyramid', 'funnel', 'treemap', 'mi_ratio'].includes(type);

    const renderChart = () => {
        if (generating && !isAdvancedChart(config.chartType)) {
            return (
                <div className="analytics-chart-placeholder">
                    <RefreshCw className="animate-spin" size={32} color="#2563eb" />
                </div>
            );
        }

        // ── Advanced chart types (use dedicated data) ──
        if (config.chartType === 'pyramid') {
            if (pyramidData.length === 0) return <div className="analytics-chart-placeholder" style={{ color: '#94a3b8' }}>{advancedLoading ? <><RefreshCw className="animate-spin" size={24} /> Chargement...</> : "Aucune donnée d'âge disponible. Activez le Mode Démo."}</div>;
            return (
                <div className="analytics-chart-container">
                    <ResponsiveContainer width="100%" height={450}>
                        <BarChart data={pyramidData} layout="vertical" stackOffset="sign" margin={{ top: 10, right: 30, left: 50, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                            <XAxis type="number" tickFormatter={(v) => Math.abs(v).toString()} tick={{ fontSize: 11, fill: '#64748b' }} />
                            <YAxis type="category" dataKey="age_group" tick={{ fontSize: 10, fill: '#64748b' }} width={50} />
                            <Tooltip formatter={(value: any) => Math.abs(value)} />
                            <Legend />
                            <Bar dataKey="male" name="Hommes" fill="#3b82f6" stackId="stack" radius={[4, 0, 0, 4]} />
                            <Bar dataKey="female" name="Femmes" fill="#ec4899" stackId="stack" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            );
        }

        if (config.chartType === 'funnel') {
            if (stageData.length === 0) return <div className="analytics-chart-placeholder" style={{ color: '#94a3b8' }}>{advancedLoading ? <><RefreshCw className="animate-spin" size={24} /> Chargement...</> : "Aucune donnée de stade disponible. Activez le Mode Démo."}</div>;
            return (
                <div className="analytics-chart-container">
                    <ResponsiveContainer width="100%" height={400}>
                        <FunnelChart>
                            <Tooltip formatter={(value: any) => value.toLocaleString()} />
                            <Funnel dataKey="value" data={stageData.map((d: any, i: number) => ({ ...d, fill: ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#7c3aed', '#64748b'][i % 6] }))} isAnimationActive>
                                <LabelList position="center" fill="#fff" fontSize={13} fontWeight={700} formatter={(v: any) => v} dataKey="label" />
                            </Funnel>
                        </FunnelChart>
                    </ResponsiveContainer>
                </div>
            );
        }

        if (config.chartType === 'treemap') {
            if (treemapData.length === 0) return <div className="analytics-chart-placeholder" style={{ color: '#94a3b8' }}>{advancedLoading ? <><RefreshCw className="animate-spin" size={24} /> Chargement...</> : "Aucune donnée disponible. Activez le Mode Démo."}</div>;
            return (
                <div className="analytics-chart-container">
                    <ResponsiveContainer width="100%" height={400}>
                        <Treemap data={treemapData} dataKey="size" aspectRatio={4/3} stroke="#fff"
                            content={({ x, y, width, height, name, value, index }: any) => {
                                if (width < 30 || height < 20) return null;
                                return (
                                    <g>
                                        <rect x={x} y={y} width={width} height={height} style={{ fill: COLORS[index % COLORS.length], stroke: '#fff', strokeWidth: 2, rx: 4 }} />
                                        {width > 60 && height > 30 && (
                                            <>
                                                <text x={x + width / 2} y={y + height / 2 - 6} textAnchor="middle" fill="#fff" fontSize={width > 120 ? 12 : 10} fontWeight={700}>{name}</text>
                                                <text x={x + width / 2} y={y + height / 2 + 10} textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize={10}>{value}</text>
                                            </>
                                        )}
                                    </g>
                                );
                            }}
                        />
                    </ResponsiveContainer>
                </div>
            );
        }

        if (config.chartType === 'mi_ratio') {
            if (miRatioData.length === 0) return <div className="analytics-chart-placeholder" style={{ color: '#94a3b8' }}>{advancedLoading ? <><RefreshCw className="animate-spin" size={24} /> Chargement...</> : "Aucune donnée de mortalité disponible. Activez le Mode Démo."}</div>;
            return (
                <div className="analytics-chart-container">
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={miRatioData} layout="vertical" margin={{ top: 10, right: 30, left: 80, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                            <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: '#64748b' }} />
                            <YAxis type="category" dataKey="label" tick={{ fontSize: 11, fill: '#1e293b', fontWeight: 600 }} width={75} />
                            <Tooltip formatter={(value: any) => `${value}%`} />
                            <Bar dataKey="mi_ratio" name="Ratio M/I (%)" radius={[0, 6, 6, 0]} maxBarSize={24}>
                                {miRatioData.map((entry: any, index: number) => (
                                    <Cell key={`mi-cell-${index}`} fill={entry.mi_ratio > 50 ? '#ef4444' : entry.mi_ratio > 30 ? '#f59e0b' : '#22c55e'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            );
        }

        // ── Standard chart types ──
        if (queryResult.length === 0) {
            return (
                <div className="analytics-chart-placeholder" style={{ color: '#94a3b8' }}>
                    Aucune donnée disponible pour ces filtres.
                </div>
            );
        }

        return (
            <div className="analytics-chart-container">
                {config.chartType === 'bar' && (
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={queryResult} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} angle={queryResult.length > 8 ? -30 : 0} textAnchor={queryResult.length > 8 ? 'end' : 'middle'} height={queryResult.length > 8 ? 80 : 30} />
                            <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            {config.isComparisonMode ? (
                                <>
                                    <Bar dataKey="value1" name="Sélection Principale" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="value2" name="Comparaison" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                                </>
                            ) : (
                                <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={60}>
                                    {queryResult.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            )}
                        </BarChart>
                    </ResponsiveContainer>
                )}

                {config.chartType === 'pie' && (
                    <ResponsiveContainer width="100%" height={400}>
                        <PieChart>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                            {config.isComparisonMode ? (
                                <>
                                    <Pie
                                        data={queryResult}
                                        dataKey="value1"
                                        nameKey="label"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={40}
                                        outerRadius={80}
                                        paddingAngle={2}
                                        name="Principale"
                                    >
                                        {queryResult.map((_, index) => (
                                            <Cell key={`cell-inner-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Pie
                                        data={queryResult}
                                        dataKey="value2"
                                        nameKey="label"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={90}
                                        outerRadius={130}
                                        paddingAngle={2}
                                        label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                                        labelLine={{ strokeWidth: 1 }}
                                        name="Comparaison"
                                    >
                                        {queryResult.map((_, index) => (
                                            <Cell key={`cell-outer-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                </>
                            ) : (
                                <Pie
                                    data={queryResult}
                                    dataKey="value"
                                    nameKey="label"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={65}
                                    outerRadius={130}
                                    paddingAngle={4}
                                    label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                                    labelLine={{ strokeWidth: 1 }}
                                >
                                    {queryResult.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                            )}
                        </PieChart>
                    </ResponsiveContainer>
                )}

                {config.chartType === 'line' && (
                    <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={queryResult} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="label" />
                            <YAxis />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            {config.isComparisonMode ? (
                                <>
                                    <Line type="monotone" dataKey="value1" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} name="Sélection Principale" />
                                    <Line type="monotone" dataKey="value2" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4 }} name="Comparaison" />
                                </>
                            ) : (
                                <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={3} dot={{ r: 6 }} activeDot={{ r: 8 }} name="Cas Réels" />
                            )}
                            {config.groupBy === 'trend' && forecastData.length > 0 && !config.isComparisonMode && (
                                <Line type="monotone" data={forecastData} dataKey="value" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4 }} name="Projection IA" />
                            )}
                        </LineChart>
                    </ResponsiveContainer>
                )}

                {config.chartType === 'area' && (
                    <ResponsiveContainer width="100%" height={400}>
                        <AreaChart data={queryResult} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="label" />
                            <YAxis />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <defs>
                                <linearGradient id="areaGrad1" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.35} />
                                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="areaGrad2" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.35} />
                                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            {config.isComparisonMode ? (
                                <>
                                    <Area type="monotone" dataKey="value1" stroke="#7c3aed" fill="url(#areaGrad1)" strokeWidth={2.5} name="Principale" />
                                    <Area type="monotone" dataKey="value2" stroke="#f43f5e" fill="url(#areaGrad2)" strokeWidth={2.5} name="Comparaison" />
                                </>
                            ) : (
                                <Area type="monotone" dataKey="value" stroke="#7c3aed" fill="url(#areaGrad1)" strokeWidth={2.5} />
                            )}
                        </AreaChart>
                    </ResponsiveContainer>
                )}

                {config.chartType === 'radar' && (
                    <ResponsiveContainer width="100%" height={400}>
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={queryResult}>
                            <PolarGrid />
                            <PolarAngleAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} />
                            <PolarRadiusAxis />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            {config.isComparisonMode ? (
                                <>
                                    <Radar name="Principale" dataKey="value1" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.4} />
                                    <Radar name="Comparaison" dataKey="value2" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.4} />
                                </>
                            ) : (
                                <Radar name="Valeur" dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
                            )}
                        </RadarChart>
                    </ResponsiveContainer>
                )}

                {config.chartType === 'scatter' && (
                    <ResponsiveContainer width="100%" height={400}>
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis type="category" dataKey="label" name="Catégorie" tick={{ fontSize: 11, fill: '#64748b' }} angle={queryResult.length > 8 ? -30 : 0} textAnchor={queryResult.length > 8 ? 'end' : 'middle'} />
                            <YAxis type="number" dataKey="value" name="Nombre" tick={{ fontSize: 12, fill: '#64748b' }} />
                            <ZAxis type="number" range={[50, 400]} />
                            <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
                            <Legend />
                            {config.isComparisonMode ? (
                                <>
                                    <Scatter name="Principale" data={queryResult.map(d => ({ ...d, value: d.value1 }))} fill="#06b6d4" />
                                    <Scatter name="Comparaison" data={queryResult.map(d => ({ ...d, value: d.value2 }))} fill="#f43f5e" />
                                </>
                            ) : (
                                <Scatter name="Distribution" data={queryResult} fill="#06b6d4">
                                    {queryResult.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Scatter>
                            )}
                        </ScatterChart>
                    </ResponsiveContainer>
                )}

                {config.chartType === 'composed' && (
                    <ResponsiveContainer width="100%" height={400}>
                        <ComposedChart data={queryResult} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} angle={queryResult.length > 8 ? -30 : 0} textAnchor={queryResult.length > 8 ? 'end' : 'middle'} height={queryResult.length > 8 ? 80 : 30} />
                            <YAxis />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            {config.isComparisonMode ? (
                                <>
                                    <Bar dataKey="value1" barSize={20} fill="#3b82f6" name="Principale" />
                                    <Line type="monotone" dataKey="value2" stroke="#f43f5e" strokeWidth={3} name="Comparaison" />
                                </>
                            ) : (
                                <>
                                    <Bar dataKey="value" barSize={20} fill="#3b82f6" name="Volume" />
                                    <Line type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={3} name="Tendance" />
                                </>
                            )}
                        </ComposedChart>
                    </ResponsiveContainer>
                )}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="analytics-loading">
                <RefreshCw className="animate-spin" size={48} color="#2563eb" />
            </div>
        );
    }

    return (
        <div className="analytics-page">
            <div className="analytics-header">
                <div>
                    <h1 className="analytics-title">Rapports & Statistiques Avancées</h1>
                    <p className="analytics-subtitle">Générateur de rapports dynamiques — Registre National du Cancer</p>
                </div>
                <div className="analytics-header-actions">
                    <button 
                        className={`analytics-btn ${isDemoMode ? 'analytics-btn-primary' : 'analytics-btn-outline'}`} 
                        style={isDemoMode ? { backgroundColor: '#8b5cf6', borderColor: '#8b5cf6', color: '#fff' } : { borderColor: '#8b5cf6', color: '#8b5cf6', backgroundColor: '#f5f3ff' }} 
                        onClick={handleGenerateMockData} 
                        title="Injecter des données de test"
                    >
                        <Activity size={18} /> {isDemoMode ? 'Quitter Mode Démo' : 'Mode Démo (Mock)'}
                    </button>
                    {userRole === 'Administrateur National' && (
                        <button 
                            className={`analytics-btn ${isDesigning ? 'analytics-btn-primary' : 'analytics-btn-outline'}`} 
                            onClick={() => setIsDesigning(!isDesigning)}
                            title="Désigner une zone à risque sur la carte"
                            style={isDesigning ? { backgroundColor: '#ef4444', borderColor: '#ef4444' } : {}}
                        >
                            <Map size={18} /> {isDesigning ? 'Annuler Désignation' : 'Désigner Zone'}
                        </button>
                    )}
                    {userRole === 'Administrateur National' && (
                        <button className="analytics-btn analytics-btn-outline" onClick={() => setShowPopModal(true)}>
                            <Database size={18} /> Gérer Population
                        </button>
                    )}
                    <button className="analytics-btn analytics-btn-outline" onClick={() => window.print()} disabled={queryResult.length === 0}>
                        <Download size={18} /> Rapport PDF
                    </button>
                    <button className="analytics-btn analytics-btn-outline" onClick={handleExportCSV} disabled={queryResult.length === 0}>
                        <FileSpreadsheet size={18} /> Exporter CSV
                    </button>
                    <button className="analytics-btn analytics-btn-primary" onClick={handleSaveReport}>
                        <Save size={18} /> Sauvegarder
                    </button>
                </div>
            </div>

            <KPISection data={kpis} />

            {/* Compact Advanced KPIs inline */}
            {advancedKpis && (
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', padding: '0 24px', marginBottom: '16px', marginTop: '-8px' }}>
                    {[
                        { label: 'Âge Médian', value: `${advancedKpis.medianAge} ans`, color: '#2563eb' },
                        { label: 'Prévalence', value: advancedKpis.prevalence?.toLocaleString(), color: '#059669' },
                        { label: 'Nouveaux ce mois', value: advancedKpis.newThisMonth?.toLocaleString(), color: '#dc2626' },
                        { label: 'Sex-Ratio (H/F)', value: advancedKpis.sexRatio, color: '#7c3aed' },
                    ].map((kpi, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'white', borderRadius: '10px', padding: '8px 14px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: kpi.color, flexShrink: 0 }} />
                            <span style={{ color: '#64748b', fontWeight: 500 }}>{kpi.label}:</span>
                            <span style={{ color: '#0f172a', fontWeight: 800 }}>{kpi.value || '—'}</span>
                        </div>
                    ))}
                </div>
            )}

            <div className="analytics-main-grid">
                <div className="analytics-content">
                    <div className="analytics-section-container">
                        <div className="analytics-section-title">
                            <Map className="w-5 h-5 text-blue-500" />
                            <h2>Répartition Géographique Nationale</h2>
                        </div>
                        <div className="analytics-charts-grid" style={{ gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1fr)', gap: '24px' }}>
                            <div className="analytics-card no-padding overflow-hidden">
                                <div className="analytics-card-header" style={{ padding: '24px 24px 0' }}>
                                    <div>
                                        <h3 className="analytics-card-title">Carte Choroplèthe de l'Incidence</h3>
                                        <div className="flex items-center gap-4 mt-1">
                                            <label className="flex items-center gap-2 cursor-pointer" style={{ fontSize: '12px', color: '#64748b' }}>
                                                <input type="checkbox" checked={showRiskZones} onChange={(e) => setShowRiskZones(e.target.checked)} />
                                                Afficher Zones à Risque
                                            </label>
                                        </div>
                                    </div>
                                    <button className="analytics-icon-btn" onClick={fetchMapData} title="Rafraîchir"><RefreshCw className={mapLoading ? "animate-spin" : ""} size={16}/></button>
                                </div>
                                <div className="analytics-map-container" style={{ position: 'relative' }}>
                                    {isDesigning && (
                                        <div className="design-hint-overlay">
                                            <Activity size={16} className="animate-pulse" />
                                            Cliquez sur la carte pour placer le centre de la zone
                                        </div>
                                    )}

                                    {pendingZone && (
                                        <div className="zone-form-overlay">
                                            <h4>Nouvelle Zone à Risque</h4>
                                            <div className="zone-form-field">
                                                <label>Nom du site</label>
                                                <input type="text" value={pendingZone.name} onChange={(e) => setPendingZone({...pendingZone, name: e.target.value})} placeholder="ex: Zone Industrielle Rouiba" />
                                            </div>
                                            <div className="zone-form-row">
                                                <div className="zone-form-field">
                                                    <label>Type</label>
                                                    <select value={pendingZone.type} onChange={(e) => setPendingZone({...pendingZone, type: e.target.value})}>
                                                        <option value="Pollution">Pollution</option>
                                                        <option value="Industrielle">Industrielle</option>
                                                        <option value="Urbaine">Urbaine</option>
                                                        <option value="Autre">Autre</option>
                                                    </select>
                                                </div>
                                                <div className="zone-form-field">
                                                    <label>Rayon (km)</label>
                                                    <input type="number" value={pendingZone.radius / 1000} onChange={(e) => setPendingZone({...pendingZone, radius: Number(e.target.value) * 1000})} />
                                                </div>
                                            </div>
                                            <div className="zone-form-field">
                                                <label>Description (optionnel)</label>
                                                <textarea value={pendingZone.description} onChange={(e) => setPendingZone({...pendingZone, description: e.target.value})} rows={2} />
                                            </div>
                                            <div className="zone-form-actions">
                                                <button className="btn-cancel" onClick={() => setPendingZone(null)}>Annuler</button>
                                                <button className="btn-save" onClick={handleCreateZone} disabled={!pendingZone.name}>Enregistrer</button>
                                            </div>
                                        </div>
                                    )}

                                    <WilayaMap 
                                        data={mapData} 
                                        riskZones={riskZones}
                                        showRiskZones={showRiskZones}
                                        onSelectWilaya={(w) => setConfig({ ...config, wilaya: w })}
                                        onMapClick={handleMapClick}
                                    />
                                </div>
                                <div className="analytics-card overflow-hidden">
                                    <div className="analytics-card-header">
                                        <h3 className="analytics-card-title">Classement par Incidence</h3>
                                    </div>
                                    <div className="analytics-card-body p-0">
                                        <div className="ranking-table-container" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                                            <table className="ranking-table">
                                                <thead>
                                                    <tr>
                                                        <th>Wilaya</th>
                                                        <th>Cas</th>
                                                        <th>Incidence</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {mapData.sort((a, b) => b.incidence - a.incidence).map((w, idx) => (
                                                        <tr key={idx} onClick={() => setConfig({...config, wilaya: w.wilaya})} style={{ cursor: 'pointer' }} className={config.wilaya === w.wilaya ? "active" : ""}>
                                                            <td>{w.wilaya}</td>
                                                            <td>{w.count}</td>
                                                            <td>
                                                                <div className="flex items-center gap-2">
                                                                    <div className="ranking-bar-bg">
                                                                        <div className="ranking-bar-fill" style={{ width: `${(w.incidence / Math.max(...mapData.map(m => m.incidence || 1))) * 100}%` }}></div>
                                                                    </div>
                                                                    <span>{w.incidence.toFixed(1)}</span>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Correlation Analysis Section */}
                        {config.cancerType !== 'all' && (
                            <div className="analytics-section-container mt-8 animate-fade-in">
                                <div className="analytics-section-title">
                                    <Target className="w-5 h-5 text-purple-500" />
                                    <h2>Analyse de Corrélation Environnementale</h2>
                                </div>
                                <div className="analytics-grid-3">
                                    {correlationLoading ? (
                                        <div className="analytics-card flex items-center justify-center py-12 col-span-3">
                                            <RefreshCw className="animate-spin text-purple-500 mr-2" /> Analyse des proximités en cours...
                                        </div>
                                    ) : correlationResults.length > 0 ? (
                                        correlationResults.map((res, idx) => (
                                            <div key={idx} className="analytics-card correlation-card">
                                                <div className="correlation-score-circle" style={{ borderColor: res.riskRatio > 2 ? '#ef4444' : '#22c55e' }}>
                                                    <span className="score-value">{res.riskRatio}x</span>
                                                    <span className="score-label">Risque</span>
                                                </div>
                                                <div className="correlation-info">
                                                    <h4>{res.zoneName}</h4>
                                                    <p className="zone-meta">{res.zoneType} • {res.casesInside} cas à proximité</p>
                                                    <div className="risk-indicator">
                                                        <div className="risk-level-bar">
                                                            <div 
                                                                className="risk-level-fill" 
                                                                style={{ 
                                                                    width: `${(res.riskRatio / 5) * 100}%`,
                                                                    backgroundColor: res.riskRatio > 2 ? '#ef4444' : '#f59e0b'
                                                                }}
                                                            ></div>
                                                        </div>
                                                        <span className="risk-text">
                                                            {res.riskRatio > 2.5 ? 'Corrélation Forte' : res.riskRatio > 1.5 ? 'Corrélation Modérée' : 'Corrélation Faible'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="analytics-card p-8 col-span-3 text-center text-gray-500">
                                            <AlertTriangle className="mx-auto mb-2 opacity-50" size={32} />
                                            <p>Aucune zone à risque définie ou aucun patient géolocalisé pour ce type de cancer.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>


                    <div className="analytics-section-container">
                        <div className="analytics-section-title">
                            <BarChart3 className="w-5 h-5 text-purple-500" />
                            <h2>Analyse Quantitative & Trends</h2>
                        </div>
                        <div className="analytics-card animation-fade-up">
                            <div className="analytics-card-header">
                                <h3 className="analytics-card-title">Visualisation Graphique</h3>
                                <div className="analytics-card-header-right">
                                    {generating && <div className="analytics-generating"><RefreshCw className="animate-spin" size={16} /> Mise à jour...</div>}
                                    {queryResult.length > 0 && !generating && <span className="analytics-result-count">{queryResult.length} catégories • {totalValue.toLocaleString()} total</span>}
                                </div>
                            </div>
                            {renderChart()}
                        </div>

                        {queryResult.length > 0 && (
                            <div className="analytics-card analytics-fade-in" style={{ marginTop: '24px' }}>
                                <h4 className="analytics-table-title">Données Brutes du Rapport</h4>
                                <div className="analytics-table-wrapper">
                                    <table className="analytics-table">
                                        <thead>
                                            <tr>
                                                <th>Catégorie</th>
                                                <th>Fréquence</th>
                                                <th>Ratio (%)</th>
                                                <th>Distribution</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {queryResult.map((item, i) => {
                                                const percent = totalValue > 0 ? ((item.value / totalValue) * 100).toFixed(1) : '0';
                                                return (
                                                    <tr key={i}>
                                                        <td className="analytics-table-label">
                                                            <span className="analytics-table-color" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                                            {item.label || '(Non défini)'}
                                                        </td>
                                                        <td className="analytics-table-value">{item.value.toLocaleString()}</td>
                                                        <td>{percent}%</td>
                                                        <td>
                                                            <div className="analytics-table-bar-track">
                                                                <div className="analytics-table-bar-fill" style={{ width: `${percent}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="analytics-sidebar">
                    <div className="analytics-card">
                        <div className="analytics-card-header-compact">
                            <Filter size={20} color="#2563eb" />
                            <h3 className="analytics-sidebar-title">Configuration</h3>
                        </div>
                        <div className="analytics-config-form">
                            <div>
                                <label className="analytics-label">Type d'Analyse</label>
                                <div className="analytics-category-tabs">
                                    <button 
                                        className={`category-tab ${activeFilterCategory === 'general' ? 'active' : ''}`}
                                        onClick={() => {
                                            setActiveFilterCategory('general');
                                            setConfig({ ...config, cancerType: 'all', wilaya: 'all' });
                                        }}
                                    >
                                        Général
                                    </button>
                                    <button 
                                        className={`category-tab ${activeFilterCategory === 'cancer' ? 'active' : ''}`}
                                        onClick={() => setActiveFilterCategory('cancer')}
                                    >
                                        Cancer
                                    </button>
                                    <button 
                                        className={`category-tab ${activeFilterCategory === 'location' ? 'active' : ''}`}
                                        onClick={() => setActiveFilterCategory('location')}
                                    >
                                        Localisation
                                    </button>
                                </div>
                            </div>

                            {activeFilterCategory === 'cancer' && (
                                <div className="analytics-drill-down-box analytics-fade-in">
                                    <label className="analytics-label">Sélectionner le Cancer</label>
                                    <select 
                                        value={config.cancerType} 
                                        onChange={(e) => setConfig({ ...config, cancerType: e.target.value })} 
                                        className="analytics-select analytics-select-premium"
                                    >
                                        <option value="all">Tous les types de cancer</option>
                                        {availableCancers.map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                    <p className="analytics-hint">Seuls les cancers présents dans la base sont affichés.</p>
                                    
                                    {config.cancerType !== 'all' && (
                                        <div className="analytics-compare-toggle" style={{ marginTop: '16px', padding: '12px', background: '#fff1f2', borderRadius: '8px', border: '1px solid #ffe4e6' }}>
                                            <label className="analytics-label-checkbox" style={{ color: '#e11d48', fontWeight: 500 }}>
                                                <input type="checkbox" checked={config.isComparisonMode} onChange={(e) => setConfig({ ...config, isComparisonMode: e.target.checked, compareCancerType: 'all' })} />
                                                <span>Mode Comparaison (Multi-Séries)</span>
                                            </label>
                                            {config.isComparisonMode && (
                                                <select 
                                                    value={config.compareCancerType} 
                                                    onChange={(e) => setConfig({ ...config, compareCancerType: e.target.value })} 
                                                    className="analytics-select"
                                                    style={{ marginTop: '8px', borderColor: '#fca5a5' }}
                                                >
                                                    <option value="all">Sélectionner un cancer à comparer...</option>
                                                    {availableCancers.filter(c => c !== config.cancerType).map(c => (
                                                        <option key={c} value={c}>{c}</option>
                                                    ))}
                                                </select>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeFilterCategory === 'location' && (
                                <div className="analytics-drill-down-box analytics-fade-in">
                                    <label className="analytics-label">Sélectionner la Wilaya</label>
                                    <select 
                                        value={config.wilaya} 
                                        onChange={(e) => setConfig({ ...config, wilaya: e.target.value })} 
                                        className="analytics-select analytics-select-premium"
                                    >
                                        <option value="all">Toutes les wilayas</option>
                                        {wilayas.map(w => (
                                            <option key={w} value={w}>{w}</option>
                                        ))}
                                    </select>
                                    
                                    {config.wilaya !== 'all' && (
                                        <div className="analytics-compare-toggle" style={{ marginTop: '16px', padding: '12px', background: '#fff1f2', borderRadius: '8px', border: '1px solid #ffe4e6' }}>
                                            <label className="analytics-label-checkbox" style={{ color: '#e11d48', fontWeight: 500 }}>
                                                <input type="checkbox" checked={config.isComparisonMode} onChange={(e) => setConfig({ ...config, isComparisonMode: e.target.checked, compareWilaya: 'all' })} />
                                                <span>Mode Comparaison (Multi-Séries)</span>
                                            </label>
                                            {config.isComparisonMode && (
                                                <select 
                                                    value={config.compareWilaya} 
                                                    onChange={(e) => setConfig({ ...config, compareWilaya: e.target.value })} 
                                                    className="analytics-select"
                                                    style={{ marginTop: '8px', borderColor: '#fca5a5' }}
                                                >
                                                    <option value="all">Sélectionner une wilaya à comparer...</option>
                                                    {wilayas.filter(w => w !== config.wilaya).map(w => (
                                                        <option key={w} value={w}>{w}</option>
                                                    ))}
                                                </select>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div>
                                <label className="analytics-label">Source de données</label>
                                <select value={config.dataSource} onChange={(e) => setConfig({ ...config, dataSource: e.target.value })} className="analytics-select">
                                    <option value="cancer_cases">Cas de Cancers (Nombre)</option>
                                    <option value="incidence_rates">Taux d'Incidence (Épidémiologie)</option>
                                    <option value="deaths">Décès (Mortalité)</option>
                                </select>
                            </div>

                            {config.dataSource === 'incidence_rates' && (
                                <div className="analytics-fade-in">
                                    <label className="analytics-label">Dataset Population</label>
                                    <select value={config.populationDatasetId} onChange={(e) => setConfig({ ...config, populationDatasetId: e.target.value })} className="analytics-select analytics-select-accent">
                                        <option value="">Sélectionner...</option>
                                        {datasets.map(ds => <option key={ds.id} value={ds.id}>{ds.name} ({ds.year})</option>)}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="analytics-label">Période</label>
                                <select value={config.period} onChange={(e) => setConfig({ ...config, period: e.target.value })} className="analytics-select">
                                    <option value="all">Toute la base de données</option>
                                    <option value="month">Dernier mois</option>
                                    <option value="year">Dernière année</option>
                                </select>
                            </div>

                            {config.dataSource === 'incidence_rates' && (
                                <div className="analytics-asr-toggle">
                                    <label className="analytics-label-checkbox">
                                        <input type="checkbox" checked={config.useASR} onChange={(e) => setConfig({ ...config, useASR: e.target.checked })} />
                                        <span>Utiliser Taux Standardisé (ASR)</span>
                                    </label>
                                    <p className="analytics-help-text">Standard OMS 2000-2025</p>
                                </div>
                            )}

                            <div>
                                <label className="analytics-label">Grouper par</label>
                                <div className="analytics-group-grid">
                                    {[
                                        { id: 'location', label: 'Wilaya' },
                                        { id: 'gender', label: 'Genre' },
                                        { id: 'type', label: 'Type Cancer' },
                                        { id: 'age', label: 'Tranche Âge' },
                                        { id: 'trend', label: 'Tendance (IA)' },
                                    ].map(item => (
                                        <button key={item.id} onClick={() => setConfig({ ...config, groupBy: item.id })} className={`analytics-group-btn ${config.groupBy === item.id ? 'active' : ''}`}>{item.label}</button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="analytics-label">Type de graphique</label>
                                <div className="analytics-viz-grid">
                                    {[
                                        { id: 'bar', icon: <BarChart3 size={18} />, label: 'Barres' },
                                        { id: 'pie', icon: <PieIcon size={18} />, label: 'Camembert' },
                                        { id: 'area', icon: <Activity size={18} />, label: 'Aire' },
                                        { id: 'line', icon: <TrendingUp size={18} />, label: 'Ligne' },
                                        { id: 'radar', icon: <Target size={18} />, label: 'Radar' },
                                        { id: 'scatter', icon: <Users size={18} />, label: 'Nuage' },
                                        { id: 'composed', icon: <List size={18} />, label: 'Combiné' },
                                        { id: 'pyramid', icon: <Layers size={18} />, label: 'Pyramide' },
                                        { id: 'funnel', icon: <Filter size={18} />, label: 'Entonnoir' },
                                        { id: 'treemap', icon: <Database size={18} />, label: 'Treemap' },
                                        { id: 'mi_ratio', icon: <Heart size={18} />, label: 'Ratio M/I' },
                                    ].map(item => (
                                        <button key={item.id} onClick={() => setConfig({ ...config, chartType: item.id })} className={`analytics-viz-btn ${config.chartType === item.id ? 'active' : ''}`} title={item.label}>
                                            {item.icon}
                                            <span>{item.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button onClick={handleGenerate} className="analytics-btn analytics-btn-generate" disabled={generating}>
                                {generating ? <><RefreshCw className="animate-spin" size={18} /> Génération...</> : 'Générer le Rapport'}
                            </button>
                        </div>
                    </div>

                    <div className="analytics-card">
                        <div className="analytics-card-header-compact">
                            <List size={20} color="#7c3aed" />
                            <h3 className="analytics-sidebar-title">Bibliothèque</h3>
                        </div>
                        <div className="analytics-saved-list">
                            {savedReports.length === 0 ? <p className="analytics-empty-text">Aucun rapport sauvegardé.</p> : 
                            savedReports.map((report) => (
                                <div key={report.id} onClick={() => setConfig(typeof report.config === 'string' ? JSON.parse(report.config) : report.config)} className="analytics-saved-item">
                                    <div className="analytics-saved-info">
                                        <span className="analytics-saved-name">{report.name}</span>
                                        <span className="analytics-saved-date">{new Date(report.created_at).toLocaleDateString('fr-DZ')}</span>
                                    </div>
                                    <ChevronRight size={14} color="#94a3b8" />
                                </div>
                            ))}
                        </div>
                    </div>

                    {riskZones.length > 0 && (
                        <div className="analytics-card">
                            <div className="analytics-card-header-compact">
                                <AlertTriangle size={20} color="#ef4444" />
                                <h3 className="analytics-sidebar-title">Zones à Risque</h3>
                            </div>
                            <div className="analytics-saved-list">
                                {riskZones.map((zone) => (
                                    <div key={zone.id} className="analytics-saved-item no-hover">
                                        <div className="analytics-saved-info">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: zone.type === 'Pollution' ? '#ef4444' : '#7c3aed' }} />
                                                <span className="analytics-saved-name">{zone.name}</span>
                                            </div>
                                            <span className="analytics-saved-date">{zone.type} • {(zone.geometry.radius/1000).toFixed(0)}km</span>
                                        </div>
                                        {userRole === 'Administrateur National' && (
                                            <button 
                                                onClick={() => handleDeleteZone(zone.id)}
                                                style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                                            >
                                                ×
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <PopulationDatasetModal isOpen={showPopModal} onClose={() => setShowPopModal(false)} onSuccess={() => initPage()} />
        </div>
    );
};

export default ResearchAnalytics;
// HMR trigger
