import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Activity, Clock, CheckCircle, FileText, AlertCircle, Search, Filter, ArrowRight } from 'lucide-react';

interface LabRequest {
    id: string;
    patient_id: string;
    doctor_id: string;
    doctor_name: string;
    tests_requested: any;
    status: 'pending' | 'in_progress' | 'completed';
    notes: string;
    result_url: string | null;
    created_at: string;
    assigned_to?: string;
    assigned_to_name?: string;
}

const LaboratoryDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [requests, setRequests] = useState<LabRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');
    const [doctors, setDoctors] = useState<any[]>([]);
    const [assignLoadingId, setAssignLoadingId] = useState<string | null>(null);
    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            setCurrentUser(user);
            const workplaceId = user.workplace_id || user.id;

            let endpoint = `/api/lab-requests?laboratory_id=${workplaceId}`;
            if (user.role === 'Médecin') {
                endpoint = `/api/lab-requests?assigned_to=${user.id}`;
            }

            const response = await api.get(endpoint);
            setRequests(response.data);

            if (user.role === 'Laboratoire' || user.role === 'Secrétaire') {
                const usersRes = await api.get('/api/users');
                const labDoctors = usersRes.data.filter((u: any) => u.role === 'Médecin' && u.workplace_id === workplaceId);
                setDoctors(labDoctors);
            }
        } catch (error) {
            console.error('Error fetching data', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAssign = async (id: string, assignedTo: string, assignedToName: string) => {
        if (!assignedTo) return;
        setAssignLoadingId(id);
        try {
            const res = await api.patch(`/api/lab-requests/${id}/assign`, {
                assigned_to: assignedTo,
                assigned_to_name: assignedToName
            });
            setRequests(requests.map(req => req.id === id ? { ...req, assigned_to: res.data.assigned_to, assigned_to_name: res.data.assigned_to_name, status: res.data.status } : req));
        } catch (error) {
            console.error('Error assigning request', error);
            alert('Erreur lors de l\'assignation.');
        } finally {
            setAssignLoadingId(null);
        }
    };

    const handleUpdateStatus = async (id: string, newStatus: string) => {
        setActionLoadingId(id);
        try {
            const res = await api.patch(`/api/lab-requests/${id}`, { status: newStatus });
            setRequests(requests.map(req => req.id === id ? { ...req, status: res.data.status } : req));
        } catch (error) {
            console.error('Error updating status', error);
            alert('Erreur lors de la mise à jour du statut.');
        } finally {
            setActionLoadingId(null);
        }
    };

    // The handleUploadResults function is removed as per the instruction's implied change
    // and the comment "removed legacy upload logic as we now use structured forms".
    // Navigation to a dedicated page for result entry is now handled directly in the table actions.

    const filteredRequests = requests.filter(req => {
        const matchSearch = req.doctor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            req.id.toLowerCase().includes(searchTerm.toLowerCase());
        const matchStatus = statusFilter === 'all' || req.status === statusFilter;
        return matchSearch && matchStatus;
    });

    return (
        <div style={{ padding: '40px', maxWidth: '1400px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '16px', backgroundColor: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5' }}>
                            <Activity size={24} />
                        </div>
                        Tableau de Bord Laboratoire
                    </h1>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '15px' }}>
                        Gérez les demandes d'examens et téléchargez les résultats.
                    </p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '32px' }}>
                {[
                    { label: 'Total Demandes', value: requests.length, color: '#3b82f6', bgColor: '#eff6ff', icon: <FileText size={24} /> },
                    { label: 'En Attente', value: requests.filter(r => r.status === 'pending').length, color: '#f59e0b', bgColor: '#fef3c7', icon: <Clock size={24} /> },
                    { label: 'En Analyse', value: requests.filter(r => r.status === 'in_progress').length, color: '#8b5cf6', bgColor: '#f3e8ff', icon: <Activity size={24} /> },
                    { label: 'Traités', value: requests.filter(r => r.status === 'completed').length, color: '#10b981', bgColor: '#ecfdf5', icon: <CheckCircle size={24} /> },
                ].map((stat, idx) => (
                    <div key={idx} style={{ padding: '24px', borderRadius: '24px', backgroundColor: 'white', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '16px', backgroundColor: stat.bgColor, color: stat.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {stat.icon}
                        </div>
                        <div>
                            <div style={{ fontSize: '13px', fontWeight: '700', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</div>
                            <div style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', lineHeight: '1' }}>{stat.value}</div>
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ backgroundColor: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '16px', alignItems: 'center', backgroundColor: '#f8fafc' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input
                            type="text"
                            placeholder="Rechercher par médecin ou ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ width: '100%', padding: '12px 16px 12px 44px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none' }}
                        />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Filter size={18} color="#64748b" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as any)}
                            style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px', backgroundColor: 'white', color: '#475569', fontWeight: '600', outline: 'none', cursor: 'pointer' }}
                        >
                            <option value="all">Tous les statuts</option>
                            <option value="pending">En Attente</option>
                            <option value="in_progress">En Analyse</option>
                            <option value="completed">Traités</option>
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>Chargement des demandes...</div>
                ) : filteredRequests.length === 0 ? (
                    <div style={{ padding: '60px', textAlign: 'center' }}>
                        <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#94a3b8' }}>
                            <AlertCircle size={32} />
                        </div>
                        <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#475569', margin: '0 0 8px' }}>Aucune demande trouvée</h3>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '15px' }}>
                            {currentUser?.role === 'Médecin' ? 'Traitez les analyses qui vous sont assignées' : 'Gérez les demandes d\'analyses reçues et leurs résultats'}
                        </p>
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <tr>
                                <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date & ID</th>
                                <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Prescripteur</th>
                                <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Examens Requis</th>
                                <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Statut</th>
                                <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRequests.map(req => {
                                const parsedTests = typeof req.tests_requested === 'string' ? JSON.parse(req.tests_requested) : req.tests_requested;

                                return (
                                    <tr key={req.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.2s' }}>
                                        <td style={{ padding: '20px 24px' }}>
                                            <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>{new Date(req.created_at).toLocaleDateString()}</div>
                                            <div style={{ fontSize: '12px', color: '#94a3b8', fontFamily: 'monospace' }}>PAT-{req.patient_id.substring(0, 8)}</div>
                                        </td>
                                        <td style={{ padding: '20px 24px' }}>
                                            <div style={{ fontSize: '14px', fontWeight: '600', color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                Dr. {req.doctor_name}
                                            </div>
                                        </td>
                                        <td style={{ padding: '20px 24px', maxWidth: '300px' }}>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                {parsedTests.map((t: string, i: number) => (
                                                    <span key={i} style={{ fontSize: '11px', fontWeight: '600', padding: '4px 8px', backgroundColor: '#f1f5f9', color: '#475569', borderRadius: '6px' }}>
                                                        {t}
                                                    </span>
                                                ))}
                                            </div>
                                            {req.notes && (
                                                <div style={{ marginTop: '8px', fontSize: '12px', color: '#64748b', fontStyle: 'italic', backgroundColor: '#f8fafc', padding: '8px', borderRadius: '6px' }}>
                                                    Note: {req.notes}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ padding: '20px 24px' }}>
                                            <span style={{
                                                fontSize: '12px', fontWeight: '700', padding: '6px 12px', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                backgroundColor: req.status === 'completed' ? '#dcfce7' : req.status === 'in_progress' ? '#f3e8ff' : '#fef3c7',
                                                color: req.status === 'completed' ? '#166534' : req.status === 'in_progress' ? '#6b21a8' : '#92400e'
                                            }}>
                                                {req.status === 'completed' ? <CheckCircle size={14} /> : req.status === 'in_progress' ? <Activity size={14} /> : <Clock size={14} />}
                                                {req.status === 'completed' ? 'Traité' : req.status === 'in_progress' ? 'En Analyse' : 'En Attente'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '20px 24px', textAlign: 'right' }}>
                                            {req.status === 'pending' && currentUser?.role !== 'Médecin' && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                                                    <select
                                                        value={req.assigned_to || ''}
                                                        onChange={(e) => handleAssign(req.id, e.target.value, e.target.options[e.target.selectedIndex].text)}
                                                        disabled={assignLoadingId === req.id}
                                                        style={{ padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', backgroundColor: '#f8fafc', outline: 'none', cursor: 'pointer' }}
                                                    >
                                                        <option value="">Assigner à un médecin...</option>
                                                        {doctors.map(d => (
                                                            <option key={d.id} value={d.id}>Dr. {d.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                            {req.status === 'pending' && currentUser?.role === 'Médecin' && (
                                                <button
                                                    onClick={() => handleUpdateStatus(req.id, 'in_progress')}
                                                    disabled={actionLoadingId === req.id}
                                                    style={{ padding: '8px 16px', borderRadius: '8px', backgroundColor: '#4f46e5', color: 'white', border: 'none', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                                                >
                                                    <Activity size={16} /> Démarrer l'analyse
                                                </button>
                                            )}
                                            {req.status === 'in_progress' && currentUser?.role !== 'Médecin' && (
                                                <span style={{ fontSize: '13px', color: '#64748b', display: 'inline-block', padding: '8px 12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                                    Assigné à: <strong>Dr. {req.assigned_to_name?.replace('Dr. ', '')}</strong>
                                                </span>
                                            )}
                                            {req.status === 'in_progress' && (currentUser?.role === 'Médecin' || currentUser?.role === 'Laboratoire') && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); navigate(`/laboratory/request/${req.id}`); }}
                                                    style={{ padding: '8px 16px', borderRadius: '8px', backgroundColor: '#3b82f6', color: 'white', border: 'none', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                                                >
                                                    Saisir les résultats <ArrowRight size={16} />
                                                </button>
                                            )}
                                            {req.status === 'completed' && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); navigate(`/laboratory/request/${req.id}`); }}
                                                    style={{ padding: '8px 16px', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                                                >
                                                    <FileText size={16} /> Voir les Résultats
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default LaboratoryDashboard;
