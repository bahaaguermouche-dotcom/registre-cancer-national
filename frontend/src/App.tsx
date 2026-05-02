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
import LaboratoryDashboard from './pages/LaboratoryDashboard';
import LabRequestDetailPage from './pages/LabRequestDetailPage';
import CancerReferencePage from './pages/CancerReferencePage';
import AuditPage from './pages/AuditPage';
import { Toaster } from 'react-hot-toast';
import CommandPalette from './components/CommandPalette';
import './App.css';

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    location: string;
    workplace_id?: string;
    workplace_type?: string;
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

    const isLabStaff = user?.role === 'Laboratoire' || user?.workplace_type === 'laboratory';

    return (
        <>
            <Toaster position="top-right" reverseOrder={false} />
            <CommandPalette />
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
                                        <Route path="/dashboard" element={
                                            isLabStaff ? <Navigate to="/laboratory" replace /> : <Dashboard />
                                        } />
                                        <Route path="/laboratory" element={
                                            isLabStaff ? <LaboratoryDashboard /> : <Navigate to="/dashboard" replace />
                                        } />
                                        <Route path="/laboratory/request/:id" element={
                                            isLabStaff ? <LabRequestDetailPage /> : <Navigate to="/dashboard" replace />
                                        } />
                                        <Route path="/analytics" element={
                                            (user?.role?.includes('Administrateur National') || user?.role?.includes('Directeur'))
                                                ? <ResearchAnalytics />
                                                : <Navigate to="/dashboard" replace />
                                        } />
                                        <Route path="/reference" element={
                                            (user?.role === 'Administrateur National')
                                                ? <CancerReferencePage currentUser={user} />
                                                : <Navigate to="/dashboard" replace />
                                        } />
                                        <Route path="/users" element={<UserManagement />} />
                                        <Route path="/patients" element={<PatientManagement />} />
                                        <Route path="/patients/:id" element={<PatientDetailsPage />} />
                                        <Route path="/requests/:id" element={
                                            (isLabStaff || user?.role === 'Médecin' || user?.role?.includes('Administrateur') || user?.role?.includes('Directeur'))
                                                ? <LabRequestDetailPage /> : <Navigate to="/dashboard" replace />
                                        } />
                                        
                                        <Route path="/audit" element={
                                            (user?.role?.includes('Administrateur National') || user?.role?.includes('Directeur'))
                                                ? <AuditPage /> : <Navigate to="/" />
                                        } />

                                        <Route path="/profile" element={<div className="p-8"><h1 className="text-2xl font-bold">Votre Profil</h1></div>} />
                                        <Route path="*" element={
                                            isLabStaff ? <Navigate to="/laboratory" replace /> : <Navigate to="/dashboard" replace />
                                        } />
                                    </Routes>
                                </main>
                            </div>
                        ) : (
                            <Navigate to="/login" replace />
                        )
                    }
                />
            </Routes>
        </>
    );
};

export default App;
