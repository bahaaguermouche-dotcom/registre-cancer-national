import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Shield, Eye, LogIn, Activity, Settings, User, Clock, AlertCircle } from 'lucide-react';

interface AuditLog {
    id: number;
    user_id: string;
    user_name: string;
    user_role: string;
    action: string;
    resource_type: string;
    resource_id: string;
    details: any;
    created_at: string;
}

const AuditPage: React.FC = () => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const res = await api.get('/api/audit-logs');
                setLogs(res.data);
            } catch (err) {
                console.error("Error fetching logs", err);
            } finally {
                setLoading(false);
            }
        };

        fetchLogs();
    }, []);

    const getActionIcon = (action: string) => {
        if (action.includes('LOGIN')) return <LogIn size={16} className="text-blue-500" style={{ color: '#3b82f6' }} />;
        if (action.includes('VIEW')) return <Eye size={16} className="text-gray-500" style={{ color: '#6b7280' }} />;
        if (action.includes('UPDATE')) return <Settings size={16} className="text-orange-500" style={{ color: '#f97316' }} />;
        if (action.includes('CREATE')) return <Activity size={16} className="text-green-500" style={{ color: '#10b981' }} />;
        return <AlertCircle size={16} style={{ color: '#ef4444' }} />;
    };

    if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Chargement sécurisé...</div>;

    return (
        <div className="dashboard-page animate-fadeIn" style={{ padding: '32px' }}>
            <div style={{ marginBottom: '32px' }}>
                <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Shield style={{ color: '#dc2626' }} /> Registre de Traçabilité (Audit Trail)
                </h1>
                <p className="page-subtitle">Historique des accès et modifications sécurisées du système Hôpital / Wilaya.</p>
            </div>

            <div className="card-container" style={{ padding: '24px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b' }}>
                            <th style={{ padding: '12px 16px' }}>Date & Heure</th>
                            <th style={{ padding: '12px 16px' }}>Utilisateur / Rôle</th>
                            <th style={{ padding: '12px 16px' }}>Action</th>
                            <th style={{ padding: '12px 16px' }}>Cible (Resource)</th>
                            <th style={{ padding: '12px 16px' }}>Type Entité</th>
                            <th style={{ padding: '12px 16px' }}>Détails Spécifiques</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map((log) => (
                            <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '12px 16px', color: '#475569', fontSize: '13px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Clock size={14} opacity={0.5} />
                                        {new Date(log.created_at).toLocaleString('fr-FR')}
                                    </div>
                                </td>
                                <td style={{ padding: '12px 16px' }}>
                                    <div style={{ fontWeight: '700', color: '#0f172a' }}>{log.user_name}</div>
                                    <div style={{ fontSize: '11px', color: '#64748b', backgroundColor: '#f1f5f9', display: 'inline-block', padding: '2px 6px', borderRadius: '4px' }}>{log.user_role}</div>
                                </td>
                                <td style={{ padding: '12px 16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', color: '#334155' }}>
                                        {getActionIcon(log.action)} {log.action}
                                    </div>
                                </td>
                                <td style={{ padding: '12px 16px', color: '#2563eb', fontWeight: '700', fontSize: '12px' }}>
                                    {log.resource_id ? log.resource_id.substring(0, 8) + '...' : '-'}
                                </td>
                                <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '13px' }}>
                                    {log.resource_type || '-'}
                                </td>
                                <td style={{ padding: '12px 16px', fontSize: '12px', color: '#475569', fontFamily: 'monospace' }}>
                                    {log.details ? JSON.stringify(log.details) : ''}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {logs.length === 0 && (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                        Aucune trace détectée.
                    </div>
                )}
            </div>
        </div>
    );
};

export default AuditPage;
