import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { LogOut, User as UserIcon, Shield, Search, Sun, Moon, ChevronDown } from 'lucide-react';
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
            <Link to="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px', marginRight: '20px' }}>
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
                <div style={{ fontSize: '18px', fontWeight: '800', color: isDark ? 'white' : '#0f172a' }}>
                    Registry PRO
                </div>
            </Link>

            <div className="nav-links-container">
                <NavLink to={user?.role === 'Laboratoire' ? "/laboratory" : "/dashboard"} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                    {user?.role === 'Laboratoire' ? 'Espace Laboratoire' : 'Dashboard'}
                </NavLink>

                {/* Dropdown Menu: Gestion */}
                {(user?.role?.includes('Administrateur National') || user?.role?.includes('Directeur') || user?.role === 'Secrétaire' || user?.role === 'Médecin') && (
                    <div className="nav-dropdown">
                        <button className="nav-link dropdown-trigger">
                            Gestion <ChevronDown size={14} style={{ marginLeft: '4px' }} />
                        </button>
                        <div className="dropdown-menu">
                            {(user?.role?.includes('Administrateur National') || user?.role?.includes('Directeur') || user?.role === 'Secrétaire' || user?.role === 'Médecin') && (
                                <NavLink to="/patients" className="dropdown-item">Gestion Patients</NavLink>
                            )}
                            {(user?.role?.includes('Administrateur National') || user?.role?.includes('Directeur') || user?.role === 'Secrétaire') && (
                                <NavLink to="/users" className="dropdown-item">Gestion Utilisateurs</NavLink>
                            )}
                            {(user?.role?.includes('Administrateur National') || user?.role?.includes('Directeur')) && (
                                <NavLink to="/duplicates" className="dropdown-item">Doublons</NavLink>
                            )}
                        </div>
                    </div>
                )}

                {(user?.role?.includes('Administrateur National') || user?.role?.includes('Directeur')) && (
                    <NavLink to="/analytics" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        Recherche & Statistiques
                    </NavLink>
                )}
                {user?.role === 'Administrateur National' && (
                    <NavLink to="/reference" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        Référentiel
                    </NavLink>
                )}
                {(user?.role?.includes('Administrateur National') || user?.role?.includes('Directeur')) && (
                    <NavLink to="/audit" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        Audit Trail
                    </NavLink>
                )}
            </div>

            {/* Search Trigger */}
            <div 
                className="search-trigger"
                onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
            >
                <Search size={16} style={{ color: '#64748b' }} />
                <span style={{ fontSize: '13px', color: '#64748b', flex: 1, fontWeight: '500' }}>Recherche rapide...</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '2px', padding: '2px 4px', backgroundColor: 'white', borderRadius: '4px', border: '1px solid #e2e8f0', color: '#94a3b8', fontSize: '10px', fontWeight: '800' }}>
                    <span>⌘</span>
                    <span>K</span>
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {/* User Section */}
                <div className="user-profile-nav">
                    <div className="user-avatar-small">
                        {user?.role?.includes('Wilaya') ? <Shield size={18} /> : <UserIcon size={18} />}
                    </div>
                    <div className="user-info-text">
                        <span className="user-name-nav">{user?.name || 'Utilisateur'}</span>
                        <span className="user-role-nav">{user?.role}</span>
                    </div>
                </div>

                {/* Theme Toggle */}
                <button
                    onClick={() => setIsDark(!isDark)}
                    title={isDark ? "Passer au mode clair" : "Passer au mode sombre"}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: isDark ? '#fbbf24' : '#64748b',
                        cursor: 'pointer',
                        padding: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        borderRadius: '8px',
                        transition: 'all 0.2s'
                    }}
                >
                    {isDark ? <Sun size={20} /> : <Moon size={20} />}
                </button>

                {/* Logout Button */}
                <button onClick={onLogout} className="logout-btn" title="Déconnexion">
                    <LogOut size={18} />
                    <span>Quitter</span>
                </button>
            </div>
        </nav>
    );
};

export default TopNav;
