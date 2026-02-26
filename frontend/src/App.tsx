import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import UserManagement from './pages/UserManagement';
import Dashboard from './pages/Dashboard';
import RegistrationPage from './pages/RegistrationPage';
import HomePage from './pages/HomePage';
import TopNav from './components/TopNav';
import PatientManagement from './pages/PatientManagement';
import PatientDetailsPage from './pages/PatientDetailsPage';
import ResearchAnalytics from './pages/ResearchAnalytics';
import './App.css';

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    location: string;
}

const App: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser && token) {
            setUser(JSON.parse(storedUser));
        }
        setReady(true);
    }, [token]);

    const handleLogin = (userData: User, tokenData: string) => {
        localStorage.setItem('token', tokenData);
        localStorage.setItem('user', JSON.stringify(userData));
        setToken(tokenData);
        setUser(userData);
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
    };

    if (!ready) return null;

    return (
        <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
            <Route path="/register" element={<RegistrationPage />} />
            <Route
                path="/*"
                element={
                    token ? (
                        <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
                            <TopNav onLogout={handleLogout} user={user} />
                            <main>
                                <Routes>
                                    <Route path="/dashboard" element={<Dashboard />} />
                                    <Route path="/analytics" element={
                                        (user?.role.includes('Administrateur National') || user?.role.includes('Directeur'))
                                            ? <ResearchAnalytics />
                                            : <Navigate to="/dashboard" replace />
                                    } />
                                    <Route path="/users" element={<UserManagement />} />
                                    <Route path="/patients" element={<PatientManagement />} />
                                    <Route path="/patients/:id" element={<PatientDetailsPage />} />
                                    <Route path="/profile" element={<div className="p-8"><h1 className="text-2xl font-bold">Votre Profil</h1></div>} />
                                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                                </Routes>
                            </main>
                        </div>
                    ) : (
                        <Navigate to="/login" replace />
                    )
                }
            />
        </Routes>
    );
};

export default App;
