import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Search, Loader2, User, UserCheck, Trash2 } from 'lucide-react';
import axios from 'axios';
import AddPatientModal from '../components/AddPatientModal';

interface Patient {
    id: string;
    name: string;
    age: number;
    gender: string;
    doctor_name: string;
    hospital_location: string;
    created_at: string;
}

const PatientManagement: React.FC = () => {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const navigate = useNavigate();

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setCurrentUser(JSON.parse(storedUser));
        }
        fetchPatients();
    }, []);

    const fetchPatients = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5000/api/patients', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPatients(response.data);
        } catch (error) {
            console.error("Fetch Patients Error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce dossier patient ?")) return;

        try {
            const token = localStorage.getItem('token');
            await axios.delete(`http://localhost:5000/api/patients/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchPatients();
        } catch (error: any) {
            console.error("Delete Error:", error);
            alert(error.response?.data?.error || "Erreur lors de la suppression.");
        }
    };

    // Reset to page 1 when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const filteredPatients = patients.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPages = Math.ceil(filteredPatients.length / itemsPerPage);
    const paginatedPatients = filteredPatients.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Clean location display (remove duplicates)
    const displayLocation = (loc: string) => {
        if (!loc) return '';
        const parts = loc.split(' - ');
        const uniqueParts = [...new Set(parts)];
        return uniqueParts.join(' - ');
    };

    return (
        <div className="dashboard-page animate-fadeIn">
            <div className="dashboard-header">
                <div>
                    <h1 className="page-title">Gestion Patients</h1>
                    <p className="page-subtitle">
                        Suivi des dossiers et affectations médicales • {displayLocation(currentUser?.location)}
                    </p>
                </div>
                {currentUser?.role === 'Secrétaire' && (
                    <button className="login-button" onClick={() => setIsModalOpen(true)} style={{ width: 'auto', padding: '12px 24px' }}>
                        <UserPlus size={18} />
                        Enregistrer Patient
                    </button>
                )}
            </div>

            <div className="stats-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '24px',
                marginBottom: '32px'
            }}>
                <div className="card-container" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ padding: '12px', borderRadius: '16px', backgroundColor: '#f0f9ff', color: '#00AAFF' }}>
                        <User size={24} />
                    </div>
                    <div>
                        <div style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a' }}>{patients.length}</div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Total Patients</div>
                    </div>
                </div>
            </div>

            <div className="card-container">
                <div className="search-bar-container">
                    <Search className="search-icon" size={18} style={{ color: '#94a3b8', marginRight: '12px' }} />
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Rechercher un patient par nom..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Patient</th>
                                <th>Âge / Genre</th>
                                <th>Médecin Assigné</th>
                                <th>Date d'Enregistrement</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: 'center', padding: '60px' }}>
                                        <Loader2 className="animate-spin" size={24} style={{ margin: '0 auto', color: '#00AAFF' }} />
                                    </td>
                                </tr>
                            ) : filteredPatients.length === 0 ? (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                                            <Search size={32} style={{ opacity: 0.2 }} />
                                            <span>Aucun patient trouvé dans cet établissement.</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                paginatedPatients.map(patient => (
                                    <tr key={patient.id} className="table-row-hover">
                                        <td>
                                            <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '15px' }}>{patient.name}</div>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: '14px', color: '#64748b', fontWeight: '500' }}>
                                                {patient.age} ans • {patient.gender}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #f1f5f9' }}>
                                                <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <User size={12} style={{ color: '#64748b' }} />
                                                </div>
                                                <span style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>{patient.doctor_name || 'Non assigné'}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: '13px', color: '#64748b' }}>
                                                {new Date(patient.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                                                <button
                                                    className="btn-action btn-details"
                                                    title="Voir Dossier"
                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                                    onClick={() => navigate(`/patients/${patient.id}`)}
                                                >
                                                    <UserCheck size={16} />
                                                    <span>Dossier</span>
                                                </button>
                                                {currentUser?.role === 'Secrétaire' && (
                                                    <button
                                                        className="btn-action btn-delete"
                                                        title="Supprimer Dossier Vide"
                                                        onClick={() => handleDelete(patient.id)}
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            width: '32px',
                                                            height: '32px',
                                                            borderRadius: '8px',
                                                            color: '#ef4444',
                                                            backgroundColor: '#fee2e2',
                                                            border: 'none',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination UI */}
                {totalPages > 1 && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px',
                        marginTop: '24px',
                        padding: '16px',
                        borderTop: '1px solid #f1f5f9'
                    }}>
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '8px',
                                border: '1px solid #e2e8f0',
                                backgroundColor: currentPage === 1 ? '#f8fafc' : 'white',
                                color: currentPage === 1 ? '#94a3b8' : '#475569',
                                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                fontSize: '14px',
                                fontWeight: '600'
                            }}
                        >
                            Précédent
                        </button>

                        <div style={{ display: 'flex', gap: '8px' }}>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                <button
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '8px',
                                        border: '1px solid',
                                        borderColor: currentPage === page ? '#00AAFF' : '#e2e8f0',
                                        backgroundColor: currentPage === page ? '#00AAFF' : 'white',
                                        color: currentPage === page ? 'white' : '#475569',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        fontWeight: '700'
                                    }}
                                >
                                    {page}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '8px',
                                border: '1px solid #e2e8f0',
                                backgroundColor: currentPage === totalPages ? '#f8fafc' : 'white',
                                color: currentPage === totalPages ? '#94a3b8' : '#475569',
                                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                fontSize: '14px',
                                fontWeight: '600'
                            }}
                        >
                            Suivant
                        </button>
                    </div>
                )}
            </div>

            <AddPatientModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    fetchPatients();
                }}
                currentUser={currentUser}
            />
        </div>
    );
};

export default PatientManagement;
