import React, { useState, useEffect } from 'react';
import {
    Users, Activity, Building, Shield,
    ArrowUpRight, ArrowDownRight,
    FileText, AlertCircle,
    Map as MapIcon,
    MessageSquare, UserPlus, Loader2,
    ClipboardCheck
} from 'lucide-react';
import api from '../services/api';

const Dashboard: React.FC = () => {
    const [user, setUser] = useState<any>(null);
    const [stats, setStats] = useState<any>(null);
    const [loadingStats, setLoadingStats] = useState(true);

    async function fetchStats() {
        try {
            const res = await api.get('/api/dashboard/stats');
            setStats(res.data);
        } catch (error) {
            console.error("Fetch Stats Error:", error);
        } finally {
            setLoadingStats(false);
        }
    }

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        fetchStats();
    }, []);

    if (!user) return null;

    const renderNationalAdminDashboard = () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* National KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
                <StatCard title="Patients Totaux" value={stats?.totalPatients} loading={loadingStats} icon={<Users color="#2563eb" />} />
                <StatCard title="Centres Actifs" value={stats?.activeCenters} loading={loadingStats} icon={<Building color="#7c3aed" />} />
                <StatCard title="Utilisateurs" value={stats?.totalUsers} loading={loadingStats} icon={<Shield color="#059669" />} />
                <StatCard title="En attente d'approbation" value={stats?.pendingApprovals} loading={loadingStats} icon={<AlertCircle color="#dc2626" />} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '32px' }}>
                <Section title="Répartition Nationale (Patients)">
                    <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', borderRadius: '16px' }}>
                        <MapIcon size={64} color="#cbd5e1" strokeWidth={1} />
                        <p style={{ color: '#94a3b8', fontSize: '14px', marginLeft: '12px' }}>Carte Interactive (Simulation)</p>
                    </div>
                </Section>
                <Section title="Dernières Inscriptions">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <ActivityItem user="Dr. Amine K." role="Médecin" location="CHU Oran" time="Il y a 2h" status="pending" />
                        <ActivityItem user="Dr. Sarah L." role="Directeur" location="EPH Tizi Ouzou" time="Il y a 5h" status="active" />
                        <ActivityItem user="Mme. Fatma B." role="Secrétaire" location="CAC Constantine" time="Hier" status="active" />
                    </div>
                </Section>
            </div>
        </div>
    );

    const renderDirectorDashboard = () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
                <StatCard title="Patients (Hôpital)" value={stats?.hospitalPatients} loading={loadingStats} icon={<Activity color="#2563eb" />} />
                <StatCard title="Médecins Actifs" value={stats?.activeDoctors} loading={loadingStats} icon={<Users color="#7c3aed" />} />
                <StatCard title="Dossiers RCP Actifs" value={stats?.activeRCP} loading={loadingStats} icon={<MessageSquare color="#059669" />} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px' }}>
                <Section title="Performances par Service">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <ProgressBar label="Oncologie Médicale" percent={85} />
                        <ProgressBar label="Radiothérapie" percent={62} />
                        <ProgressBar label="Chirurgie" percent={92} />
                        <ProgressBar label="Imagerie" percent={78} />
                    </div>
                </Section>
                <Section title="Activités Récentes - Hôpital">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <ActivityItem user="Dr. Benali" role="Médecin" location="Oncologie" time="10 min" label="Diagnostic ajouté" />
                        <ActivityItem user="Secrétariat" role="Staff" location="Accueil" time="1h" label="3 Nouveaux patients" />
                    </div>
                </Section>
            </div>
        </div>
    );

    const renderSecretaryDashboard = () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
                <StatCard title="Enregistrements (7j)" value={stats?.weeklyRegistrations} loading={loadingStats} icon={<UserPlus color="#2563eb" />} />
                <StatCard title="Documents Numérisés" value={stats?.totalDocuments} loading={loadingStats} icon={<FileText color="#7c3aed" />} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                <Section title="Tâches Prioritaires">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <TodoItem task="Vérifier identité Patient ID: #2345" prioritary />
                        <TodoItem task="Scanner analyses Dr. Mekki" />
                        <TodoItem task="Mettre à jour contact Patient ID: #1190" />
                    </div>
                </Section>
                <Section title="Derniers Documents Ajoutés">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <ActivityItem user="Scanner_ thoracique.pdf" role="Image" location="Patient #99" time="5 min" label="Posté par Secrétariat" />
                        <ActivityItem user="Bilan_bio.pdf" role="Analyse" location="Patient #42" time="20 min" label="Posté par Secrétariat" />
                    </div>
                </Section>
            </div>
        </div>
    );

    const renderDoctorDashboard = () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
                <StatCard title="Mes Patients Suivis" value={stats?.myPatients} loading={loadingStats} icon={<Users color="#2563eb" />} />
                <StatCard title="Diagnostics (Mois)" value={stats?.monthlyDiagnostics} loading={loadingStats} icon={<ClipboardCheck color="#059669" />} />
                <StatCard title="Discussions RCP" value={stats?.rcpDiscussions} loading={loadingStats} icon={<MessageSquare color="#7c3aed" />} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '32px' }}>
                <Section title="Calendrier Clinique">
                    <div style={{ padding: '20px', backgroundColor: '#f0f9ff', borderRadius: '16px', border: '1px solid #e0f2fe' }}>
                        <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: '#0369a1' }}>📅 Prochaines Visites</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <ScheduleItem patient="B. Ahmed" time="09:30" type="Suivi" />
                            <ScheduleItem patient="L. Karima" time="11:00" type="Nouveau" />
                            <ScheduleItem patient="M. Omar" time="14:30" type="Résultats" />
                        </div>
                    </div>
                </Section>
                <Section title="Activité RCP & Collaborations">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <ActivityItem user="RCP Poumon" role="Discussion" location="En cours" time="Maintenant" label="3 nouveaux messages" />
                        <ActivityItem user="Collaboration" role="Médecin" location="Dr. Hadid" time="1h" label="A consulté Patient #23" />
                    </div>
                </Section>
            </div>
        </div>
    );

    return (
        <div style={{ padding: '40px', maxWidth: '1400px', margin: '0 auto' }}>
            <div style={{ marginBottom: '40px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: '900', color: '#0f172a', marginBottom: '8px' }}>Tableau de Bord</h1>
                <p style={{ color: '#64748b', fontSize: '16px' }}>
                    Bienvenue, <span style={{ fontWeight: '700', color: '#0f172a' }}>{user.name}</span>.
                    Accès : <span style={{ color: '#2563eb', fontWeight: '700' }}>{user.role}</span>
                </p>
            </div>

            {user.role === 'Administrateur National' && renderNationalAdminDashboard()}
            {user.role === 'Directeur Hopital' && renderDirectorDashboard()}
            {user.role === 'Secrétaire' && renderSecretaryDashboard()}
            {user.role === 'Médecin' && renderDoctorDashboard()}
        </div>
    );
};

// Sub-components
const StatCard = ({ title, value, change, positive, icon, loading }: any) => (
    <div style={{
        padding: '24px', borderRadius: '24px', backgroundColor: 'white',
        border: '1px solid #f1f5f9', boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
    }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {icon}
            </div>
            {change && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '8px',
                    fontSize: '12px', fontWeight: '700',
                    backgroundColor: positive === undefined ? '#f1f5f9' : (positive ? '#f0fdf4' : '#fef2f2'),
                    color: positive === undefined ? '#64748b' : (positive ? '#15803d' : '#dc2626')
                }}>
                    {positive === true && <ArrowUpRight size={14} />}
                    {positive === false && <ArrowDownRight size={14} />}
                    {change}
                </div>
            )}
        </div>
        <div style={{ fontSize: '14px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>{title}</div>
        <div style={{ fontSize: '28px', fontWeight: '900', color: '#0f172a' }}>
            {loading ? <Loader2 className="animate-spin" size={24} style={{ color: '#cbd5e1' }} /> : (value ?? '0')}
        </div>
    </div>
);

const Section = ({ title, children }: any) => (
    <div style={{
        padding: '32px', borderRadius: '32px', backgroundColor: 'white',
        border: '1px solid #f1f5f9', boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
    }}>
        <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginBottom: '24px' }}>{title}</h3>
        {children}
    </div>
);

const ActivityItem = ({ user, role, location, time, status, label }: any) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px', borderRadius: '16px', transition: 'background 0.2s' }} className="hover:bg-slate-50">
        <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', color: '#475569', fontSize: '14px' }}>
            {user.charAt(0)}
        </div>
        <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: '700', color: '#0f172a', fontSize: '14px' }}>{user}</span>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>{time}</span>
            </div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>
                {label || `${role} • ${location}`}
            </div>
        </div>
        {status && (
            <div style={{
                width: '8px', height: '8px', borderRadius: '50%',
                backgroundColor: status === 'active' ? '#10b981' : '#f59e0b'
            }} />
        )}
    </div>
);

const ProgressBar = ({ label, percent }: any) => (
    <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#475569' }}>
            <span>{label}</span>
            <span>{percent}%</span>
        </div>
        <div style={{ height: '8px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${percent}%`, backgroundColor: '#2563eb', borderRadius: '4px' }} />
        </div>
    </div>
);

const TodoItem = ({ task, prioritary }: any) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderLeft: prioritary ? '4px solid #f59e0b' : '4px solid #e2e8f0', backgroundColor: '#f8fafc', borderRadius: '0 12px 12px 0' }}>
        <input type="checkbox" style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
        <span style={{ fontSize: '14px', color: '#475569', fontWeight: '500' }}>{task}</span>
    </div>
);

const ScheduleItem = ({ patient, time, type }: any) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: 'white', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: '800', color: '#2563eb' }}>{time}</span>
            <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>{patient}</span>
        </div>
        <span style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', padding: '2px 8px', backgroundColor: '#f1f5f9', borderRadius: '6px' }}>{type}</span>
    </div>
);

// export default Dashboard;

export default Dashboard;
