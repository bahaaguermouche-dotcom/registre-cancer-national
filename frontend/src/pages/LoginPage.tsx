import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Loader2, AlertCircle } from 'lucide-react';
import axios from 'axios';

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    location: string;
}

interface LoginPageProps {
    onLogin: (user: User, token: string) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await axios.post('http://localhost:5000/api/auth/login', {
                email,
                password
            });

            const { user, token } = response.data;
            onLogin(user, token);
            navigate('/dashboard');
        } catch (err: any) {
            console.error("Login failed:", err);
            setError(err.response?.data?.error || "Une erreur est survenue lors de la connexion.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>
                        Connexion
                    </h1>
                    <p style={{ color: '#64748b', fontSize: '14px' }}>
                        Accédez au Registre National du Cancer
                    </p>
                </div>

                {error && (
                    <div style={{
                        backgroundColor: '#fef2f2',
                        border: '1px solid #fee2e2',
                        padding: '12px',
                        borderRadius: '12px',
                        display: 'flex',
                        gap: '10px',
                        marginBottom: '24px',
                        color: '#dc2626',
                        fontSize: '13px'
                    }}>
                        <AlertCircle size={18} />
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleLogin}>
                    <div className="input-group">
                        <label className="input-label">Email Professionnel</label>
                        <div className="input-wrapper">
                            <Mail size={18} className="input-icon" />
                            <input
                                type="email"
                                required
                                className="login-input"
                                placeholder="nom@sante.dz"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="input-group">
                        <label className="input-label">Mot de passe</label>
                        <div className="input-wrapper">
                            <Lock size={18} className="input-icon" />
                            <input
                                type="password"
                                required
                                className="login-input"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="login-button"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : "Se Connecter"}
                    </button>
                </form>

                <div style={{ marginTop: '32px', textAlign: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '24px' }}>
                    <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '16px' }}>
                        Nouveau sur la plateforme ?
                    </p>
                    <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.5 }}>
                        L'accès est réservé au personnel autorisé. <br />
                        Veuillez demander une invitation à votre superviseur.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
