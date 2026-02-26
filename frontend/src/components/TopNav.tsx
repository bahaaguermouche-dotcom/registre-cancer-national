import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { LogOut, User as UserIcon, Shield } from 'lucide-react';

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
}

interface TopNavProps {
    user: User | null;
    onLogout: () => void;
}

const TopNav: React.FC<TopNavProps> = ({ user, onLogout }) => {
    return (
        <nav className="top-nav">
            <Link to="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px', marginRight: '40px' }}>
                <div style={{
                    backgroundColor: '#00AAFF',
                    color: 'white',
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold'
                }}>R</div>
                <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                    Registry PRO
                </div>
            </Link>

            <div style={{ display: 'flex', gap: '20px', flex: 1 }}>
                <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                    Dashboard
                </NavLink>
                {(user?.role.includes('Administrateur National') ||
                    user?.role.includes('Wilaya') ||
                    user?.role.includes('Directeur') ||
                    user?.role === 'Secrétaire') && (
                        <NavLink to="/users" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                            Gestion Utilisateurs
                        </NavLink>
                    )}
                {(user?.role.includes('Administrateur National') ||
                    user?.role === 'Secrétaire' ||
                    user?.role === 'Médecin') && (
                        <NavLink to="/patients" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                            Gestion Patients
                        </NavLink>
                    )}
                {(user?.role.includes('Administrateur National') ||
                    user?.role.includes('Directeur')) && (
                        <NavLink to="/analytics" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                            Recherche & Statistiques
                        </NavLink>
                    )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingRight: '24px', borderRight: '1px solid #e2e8f0' }}>
                    <div className="user-avatar-small">
                        {user?.role.includes('Wilaya') ? <Shield size={16} /> : <UserIcon size={16} />}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>{user?.name || 'Utilisateur'}</span>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>{user?.role}</span>
                    </div>
                </div>

                <button
                    onClick={onLogout}
                    title="Déconnexion"
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '600'
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#fef2f2')}
                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                    <LogOut size={18} />
                    <span>Quitter</span>
                </button>
            </div>
        </nav>
    );
};

export default TopNav;
