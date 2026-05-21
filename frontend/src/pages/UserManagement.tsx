import React, { useState, useEffect } from 'react';
import { UserPlus, CheckCircle, Clock, Shield, Building, MapPin, Search, Loader2, Trash2, Eye } from 'lucide-react';
import api from '../services/api';
import InviteModal from '../components/InviteModal';
import UserDetailsModal from '../components/UserDetailsModal';

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    location: string;
    status: 'active' | 'pending';
    created_at: string;
    specialty?: string;
    workplace_id?: string;
    workplace_type?: string;
}

const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setCurrentUser(JSON.parse(storedUser));
        }
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await api.get('/api/users');
            setUsers(response.data);
        } catch (error) {
            console.error("Fetch Users Error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id: string) => {
        try {
            await api.patch(`/api/users/${id}/approve`);
            setUsers(users.map(u => u.id === id ? { ...u, status: 'active' } : u));
        } catch (error) {
            console.error("Approval Error:", error);
            alert("Erreur lors de l'approbation de l'utilisateur.");
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`Êtes-vous sûr de vouloir supprimer le compte de ${name} ?`)) return;

        try {
            await api.delete(`/api/users/${id}`);
            setUsers(users.filter(u => u.id !== id));
        } catch (error: any) {
            console.error("Delete Error:", error);
            alert(error.response?.data?.error || "Erreur lors de la suppression.");
        }
    };

    const handleShowDetails = (user: User) => {
        setSelectedUser(user);
        setIsDetailsModalOpen(true);
    };

    // Filter users based on current user role and search term
    const filteredUsers = users.filter(user => {
        const matchesSearch =
            user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.location.toLowerCase().includes(searchTerm.toLowerCase());

        if (!currentUser) return false;

        // National Admin sees ONLY Wilaya Supervisors, Hospital Directors and Laboratories
        if (currentUser.role === 'Administrateur National') {
            return matchesSearch && (
                user.role?.includes('Wilaya') ||
                user.role === 'Directeur Hopital' ||
                user.role === 'Laboratoire'
            );
        }

        // Wilaya Supervisor sees everyone in their Wilaya
        if (currentUser.role?.includes('Wilaya')) {
            const userWilaya = currentUser.location;
            return matchesSearch && user.location.includes(userWilaya);
        }

        // Hospital Director sees everyone in their Hospital
        if (currentUser.role?.includes('Directeur')) {
            const userHospital = currentUser.location;
            return matchesSearch && user.location.includes(userHospital);
        }

        // Secretary sees only Doctors in their Hospital
        if (currentUser.role === 'Secrétaire') {
            const userHospital = currentUser.location;
            return matchesSearch && user.location.includes(userHospital) && user.role === 'Médecin';
        }

        // Laboratoire manager sees their own staff
        if (currentUser.role === 'Laboratoire') {
            return matchesSearch && user.workplace_id === currentUser.id;
        }

        return false;
    });

    const canInvite = currentUser?.role?.includes('Directeur') ||
        currentUser?.role === 'Administrateur National' ||
        currentUser?.role === 'Laboratoire' ||
        currentUser?.role === 'Secrétaire';
    const canDelete = currentUser?.role === 'Administrateur National' ||
        currentUser?.role === 'Directeur Hopital' ||
        currentUser?.role === 'Laboratoire' ||
        currentUser?.role === 'Secrétaire';

    return (
        <div className="dashboard-page">
            <div className="dashboard-header">
                <div>
                    <h1 className="page-title">Gestion Utilisateur</h1>
                    <p className="page-subtitle">
                        {currentUser?.role === 'Administrateur National'
                            ? "Administration globale du registre national"
                            : `Gestion des accès - ${currentUser?.location}`}
                    </p>
                </div>

                {canInvite && (
                    <button
                        onClick={() => setIsInviteModalOpen(true)}
                        className="btn-register"
                    >
                        <UserPlus size={18} />
                        <span>Envoyer Invitation</span>
                    </button>
                )}
            </div>

            <div className="card-container">
                <div className="search-bar-container">
                    <Search size={18} style={{ position: 'absolute', left: '36px', color: '#94a3b8' }} />
                    <input
                        type="text"
                        placeholder="Rechercher par nom, email ou localisation..."
                        className="search-input"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Utilisateur</th>
                                <th>Rôle</th>
                                <th>Localisation</th>
                                <th>Statut</th>
                                <th>Date Sub</th>
                                <th style={{ textAlign: 'center' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}>
                                        <Loader2 className="animate-spin" style={{ margin: '0 auto', color: '#00AAFF' }} />
                                        <p style={{ marginTop: '12px', fontSize: '14px', color: '#64748b' }}>Chargement...</p>
                                    </td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                                        Aucun utilisateur trouvé.
                                    </td>
                                </tr>
                            ) : filteredUsers.map((user) => (
                                <tr key={user.id}>
                                    <td>
                                        <div className="user-info">
                                            <span className="user-name">{user.name}</span>
                                            <span className="user-email">{user.email}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="flex-center" style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                                            {user.role?.includes('Wilaya') ? <Shield size={14} style={{ color: '#f59e0b' }} /> : <Building size={14} style={{ color: '#0ea5e9' }} />}
                                            {user.role}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="flex-center" style={{ fontSize: '12px', color: '#64748b' }}>
                                            <MapPin size={12} />
                                            {(() => {
                                                if (!user.location) return '';
                                                const parts = user.location.split(' - ');
                                                const uniqueParts = [...new Set(parts)];
                                                return uniqueParts.join(' - ');
                                            })()}
                                        </div>
                                    </td>
                                    <td>
                                        {user.status === 'active' ? (
                                            <span className="status-badge status-active">
                                                <CheckCircle size={10} /> ACTIF
                                            </span>
                                        ) : (
                                            <span className="status-badge status-pending">
                                                <Clock size={10} /> EN ATTENTE
                                            </span>
                                        )}
                                    </td>
                                    <td style={{ fontSize: '12px', color: '#94a3b8' }}>
                                        {new Date(user.created_at).toLocaleDateString('fr-FR')}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                                            {user.status === 'pending' && (
                                                <button
                                                    onClick={() => handleApprove(user.id)}
                                                    className="btn-action btn-approve"
                                                    title="Approuver"
                                                >
                                                    <CheckCircle size={16} />
                                                </button>
                                            )}
                                            <button
                                                className="btn-action btn-details"
                                                title="Détails"
                                                onClick={() => handleShowDetails(user)}
                                            >
                                                <Eye size={16} />
                                            </button>
                                            {canDelete && user.id !== currentUser.id && (
                                                <button
                                                    onClick={() => handleDelete(user.id, user.name)}
                                                    className="btn-action"
                                                    title="Supprimer"
                                                    style={{ color: '#ef4444', backgroundColor: '#fef2f2' }}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <InviteModal
                isOpen={isInviteModalOpen}
                onClose={() => setIsInviteModalOpen(false)}
                currentUser={currentUser}
            />

            <UserDetailsModal
                isOpen={isDetailsModalOpen}
                user={selectedUser}
                onClose={() => {
                    setIsDetailsModalOpen(false);
                    setSelectedUser(null);
                }}
            />
        </div>
    );
};

export default UserManagement;
