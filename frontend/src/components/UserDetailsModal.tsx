import React from 'react';
import { X, User, Mail, Shield, Building, MapPin, Calendar, CheckCircle, Clock } from 'lucide-react';

interface UserData {
    id: string;
    name: string;
    email: string;
    role: string;
    location: string;
    status: 'active' | 'pending';
    created_at: string;
    specialty?: string;
}

interface UserDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: UserData | null;
}

const UserDetailsModal: React.FC<UserDetailsModalProps> = ({ isOpen, onClose, user }) => {
    if (!isOpen || !user) return null;

    const isWilaya = user.role?.includes('Wilaya');

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            animation: 'fadeIn 0.2s ease-out'
        }}>
            <div style={{
                backgroundColor: 'white',
                width: '100%',
                maxWidth: '500px',
                borderRadius: '24px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                overflow: 'hidden',
                animation: 'slideUp 0.3s ease-out',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column'
            }}>
                {/* Header */}
                <div style={{
                    padding: '24px',
                    background: 'linear-gradient(135deg, #0f172a, #1e293b)',
                    color: 'white',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            backgroundColor: 'rgba(255,255,255,0.1)',
                            width: '40px',
                            height: '40px',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <User size={24} />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0 }}>Détails de l'utilisateur</h2>
                            <p style={{ fontSize: '12px', opacity: 0.7, margin: 0 }}>Consultation du profil</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            backgroundColor: 'rgba(255,255,255,0.1)',
                            border: 'none',
                            borderRadius: '50%',
                            padding: '8px',
                            cursor: 'pointer',
                            color: 'white',
                            display: 'flex'
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="custom-scrollbar" style={{ padding: '32px', overflowY: 'auto' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                        {/* Status Badge at the top */}
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <div style={{
                                padding: '8px 16px',
                                borderRadius: '100px',
                                fontSize: '12px',
                                fontWeight: '700',
                                letterSpacing: '0.05em',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                backgroundColor: user.status === 'active' ? '#ecfdf5' : '#fff7ed',
                                color: user.status === 'active' ? '#059669' : '#d97706',
                                border: `1px solid ${user.status === 'active' ? '#10b98133' : '#f59e0b33'}`
                            }}>
                                {user.status === 'active' ? <CheckCircle size={14} /> : <Clock size={14} />}
                                {user.status === 'active' ? 'COMPTE ACTIF' : 'EN ATTENTE D\'APPROBATION'}
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                            <div style={detailItemStyle}>
                                <label style={labelStyle}>Nom Complet</label>
                                <div style={valueStyle}>{user.name}</div>
                            </div>

                            <div style={detailItemStyle}>
                                <label style={labelStyle}>Email Professionnel</label>
                                <div style={{ ...valueStyle, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Mail size={16} color="#94a3b8" />
                                    {user.email}
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div style={detailItemStyle}>
                                    <label style={labelStyle}>Rôle</label>
                                    <div style={{ ...valueStyle, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {isWilaya ? <Shield size={16} color="#f59e0b" /> : <Building size={16} color="#0ea5e9" />}
                                        {user.role}
                                    </div>
                                </div>
                                <div style={detailItemStyle}>
                                    <label style={labelStyle}>Date d'inscription</label>
                                    <div style={{ ...valueStyle, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Calendar size={16} color="#94a3b8" />
                                        {new Date(user.created_at).toLocaleDateString('fr-FR')}
                                    </div>
                                </div>
                            </div>

                            <div style={detailItemStyle}>
                                <label style={labelStyle}>Localisation / Juridiction</label>
                                <div style={{ ...valueStyle, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <MapPin size={16} color="#ef4444" />
                                    {user.location}
                                </div>
                            </div>

                            {user.role === 'Médecin' && user.specialty && (
                                <div style={detailItemStyle}>
                                    <label style={labelStyle}>Spécialité Médicale</label>
                                    <div style={{ ...valueStyle, display: 'flex', alignItems: 'center', gap: '8px', color: '#0ea5e9', backgroundColor: '#e0f2fe', borderColor: '#bae6fd' }}>
                                        <div style={{ fontWeight: 'bold' }}>{user.specialty}</div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div style={{ marginTop: '16px' }}>
                            <button
                                onClick={onClose}
                                style={{
                                    width: '100%',
                                    padding: '14px',
                                    borderRadius: '12px',
                                    backgroundColor: '#f1f5f9',
                                    border: 'none',
                                    color: '#475569',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    transition: 'background 0.2s'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                            >
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const detailItemStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
};

const labelStyle: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: '800',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.025em'
};

const valueStyle: React.CSSProperties = {
    fontSize: '15px',
    fontWeight: '600',
    color: '#1e293b',
    backgroundColor: '#f8fafc',
    padding: '12px',
    borderRadius: '12px',
    border: '1px solid #f1f5f9'
};

export default UserDetailsModal;
