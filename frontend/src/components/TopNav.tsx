import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { LogOut, User as UserIcon, Shield, Search, Sun, Moon } from 'lucide-react';
import { useState, useEffect } from 'react';

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
    const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark');

    useEffect(() => {
        if (isDark) {
            document.body.classList.add('dark-theme');
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.classList.remove('dark-theme');
            localStorage.setItem('theme', 'light');
        }
    }, [isDark]);

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
                <NavLink to={user?.role === 'Laboratoire' ? "/laboratory" : "/dashboard"} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                    {user?.role === 'Laboratoire' ? 'Espace Laboratoire' : 'Dashboard'}
                </NavLink>
                {(user?.role?.includes('Administrateur National') ||
                    user?.role?.includes('Wilaya') ||
                    user?.role?.includes('Directeur') ||
                    user?.role === 'Laboratoire' ||
                    user?.role === 'Secrétaire') && (
                        <NavLink to="/users" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                            Gestion Utilisateurs
                        </NavLink>
                    )}
                {(user?.role?.includes('Administrateur National') ||
                    user?.role === 'Secrétaire' ||
                    user?.role === 'Médecin') && (
                        <NavLink to="/patients" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                            Gestion Patients
                        </NavLink>
                    )}
                {(user?.role?.includes('Administrateur National') ||
                    user?.role?.includes('Directeur')) && (
                        <NavLink to="/analytics" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                            Recherche & Statistiques
                        </NavLink>
                    )}
                {user?.role === 'Administrateur National' && (
                    <NavLink to="/reference" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        Référentiel CIM-O-3
                    </NavLink>
                )}
                {(user?.role?.includes('Administrateur National') || user?.role?.includes('Directeur')) && (
                    <NavLink to="/audit" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        Audit Trail
                    </NavLink>
                )}
            </div>

            <div 
                onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
                style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px', 
                    backgroundColor: '#f1f5f9', 
                    padding: '8px 16px', 
                    borderRadius: '12px', 
                    cursor: 'pointer',
                    marginRight: '20px',
                    border: '1px solid #e2e8f0',
                    transition: 'all 0.2s',
                    width: '260px'
                }}
                onMouseOver={e => {
                    e.currentTarget.style.backgroundColor = '#e2e8f0';
                    e.currentTarget.style.borderColor = '#cbd5e1';
                }}
                onMouseOut={e => {
                    e.currentTarget.style.backgroundColor = '#f1f5f9';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                }}
            >
                <Search size={16} style={{ color: '#64748b' }} />
                <span style={{ fontSize: '13px', color: '#64748b', flex: 1, fontWeight: '500' }}>Recherche rapide...</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '2px', padding: '2px 4px', backgroundColor: 'white', borderRadius: '4px', border: '1px solid #e2e8f0', color: '#94a3b8', fontSize: '10px', fontWeight: '800' }}>
                    <span>⌘</span>
                    <span>K</span>
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingRight: '24px', borderRight: '1px solid #e2e8f0' }}>
                    <div className="user-avatar-small">
                        {user?.role?.includes('Wilaya') ? <Shield size={16} /> : <UserIcon size={16} />}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>{user?.name || 'Utilisateur'}</span>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>{user?.role}</span>
                    </div>
                </div>

                <button
                    onClick={() => setIsDark(!isDark)}
                    title={isDark ? "Passer au mode clair" : "Passer au mode sombre"}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: isDark ? '#fbbf24' : '#64748b',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px',
                        borderRadius: '8px',
                        transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.backgroundColor = isDark ? 'rgba(251, 191, 36, 0.1)' : '#f1f5f9')}
                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                    {isDark ? <Sun size={20} /> : <Moon size={20} />}
                </button>

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
