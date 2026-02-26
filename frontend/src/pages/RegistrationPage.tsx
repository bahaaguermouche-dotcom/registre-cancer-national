import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Shield, Building, User, Mail, Phone, Lock, CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import axios from 'axios';
import { MEDICAL_SPECIALTIES } from '../constants/medicalData';

const RegistrationPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const roleParam = searchParams.get('role') || 'Superviseur-Wilaya';
    const emailParam = searchParams.get('email') || '';
    const locationParam = searchParams.get('location') || 'Alger';

    const role = roleParam.replace(/-/g, ' ');
    const isWilayaSupervisor = role.toLowerCase().includes('wilaya');
    const isHospitalDirector = role === 'Directeur Hopital';
    const isDoctor = role === 'Médecin';

    // Auto-detect if hospital name is already in location (e.g. from invite)
    const hasHospitalInLocation = locationParam.includes(' - ');
    const showHospitalInput = isHospitalDirector && !hasHospitalInLocation;

    const [formData, setFormData] = useState({
        fullName: '',
        phone: '',
        password: '',
        confirmPassword: '',
        hospitalName: '',
        specialty: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            setError("Les mots de passe ne correspondent pas.");
            return;
        }

        setLoading(true);
        setError('');

        try {
            await axios.post('http://localhost:5000/api/auth/register', {
                name: formData.fullName,
                email: emailParam || 'invite@sante.dz',
                phone: formData.phone,
                password: formData.password,
                role: role,
                location: locationParam,
                hospitalName: showHospitalInput ? formData.hospitalName : '',
                specialty: isDoctor ? formData.specialty : ''
            });

            alert("Compte créé avec succès ! Votre accès est en attente d'approbation par l'administrateur national.");
            navigate('/login');
        } catch (err: any) {
            console.error("Registration Error:", err);
            setError(err.response?.data?.error || "Une erreur est survenue lors de l'inscription.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card" style={{ maxWidth: '640px' }}>
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{
                        display: 'inline-flex',
                        padding: '12px',
                        borderRadius: '20px',
                        backgroundColor: '#f0f9ff',
                        color: '#00AAFF',
                        marginBottom: '16px'
                    }}>
                        {isWilayaSupervisor ? <Shield size={32} /> : <Building size={32} />}
                    </div>
                    <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>
                        Inscription {isWilayaSupervisor ? 'Wilaya' : 'Hospitalière'}
                    </h1>
                    <p style={{ color: '#64748b', fontSize: '14px' }}>
                        Rôle : <span style={{ fontWeight: '700', color: '#00AAFF' }}>{role}</span>
                    </p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 20px' }}>
                    {/* Full Name */}
                    <div style={{ gridColumn: 'span 2' }}>
                        <label className="input-label">Nom et Prénom</label>
                        <div className="input-wrapper">
                            <User size={18} className="input-icon" />
                            <input
                                type="text"
                                required
                                className="login-input"
                                placeholder="Dr. Mohamed Alali"
                                value={formData.fullName}
                                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Email */}
                    <div style={{ gridColumn: 'span 2' }}>
                        <label className="input-label">Email Professionnel</label>
                        <div className="input-wrapper">
                            <Mail size={18} className="input-icon" />
                            <input type="email" disabled className="login-input" value="invite@sante.dz" />
                        </div>
                    </div>

                    {/* Phone */}
                    <div style={{ gridColumn: 'span 2' }}>
                        <label className="input-label">Téléphone</label>
                        <div className="input-wrapper">
                            <Phone size={18} className="input-icon" />
                            <input
                                type="tel"
                                required
                                className="login-input"
                                placeholder="05 55 55 55 55"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>
                    </div>

                    {isDoctor && (
                        <div style={{ gridColumn: 'span 2' }}>
                            <label className="input-label">Spécialité Médicale</label>
                            <div className="input-wrapper">
                                <User size={18} className="input-icon" />
                                <select
                                    required
                                    className="login-input"
                                    style={{ width: '100%' }}
                                    value={formData.specialty}
                                    onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                                >
                                    <option value="" disabled>Sélectionner votre spécialité</option>
                                    {MEDICAL_SPECIALTIES.map(spec => (
                                        <option key={spec} value={spec}>{spec}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {showHospitalInput && (
                        <div style={{ gridColumn: 'span 2' }}>
                            <label className="input-label">Nom de l'Hôpital</label>
                            <div className="input-wrapper">
                                <Building size={18} className="input-icon" />
                                <input
                                    type="text"
                                    required
                                    className="login-input"
                                    placeholder="CHU Mustapha Bacha"
                                    value={formData.hospitalName}
                                    onChange={(e) => setFormData({ ...formData, hospitalName: e.target.value })}
                                />
                            </div>
                        </div>
                    )}

                    {/* Wilaya Zone */}
                    <div style={{ gridColumn: 'span 2' }}>
                        <label className="input-label">Zone de Responsabilité</label>
                        <div className="input-wrapper">
                            <Shield size={18} className="input-icon" />
                            <input type="text" disabled className="login-input" value={locationParam} />
                        </div>
                    </div>

                    {/* Password */}
                    <div>
                        <label className="input-label">Mot de passe</label>
                        <div className="input-wrapper">
                            <Lock size={18} className="input-icon" />
                            <input
                                type="password"
                                required
                                className="login-input"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <label className="input-label">Confirmer</label>
                        <div className="input-wrapper">
                            <Lock size={18} className="input-icon" />
                            <input
                                type="password"
                                required
                                className="login-input"
                                value={formData.confirmPassword}
                                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            />
                        </div>
                    </div>

                    {error && (
                        <div style={{ gridColumn: 'span 2', padding: '12px', borderRadius: '12px', backgroundColor: '#fef2f2', color: '#dc2626', fontSize: '13px', textAlign: 'center' }}>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="login-button"
                        style={{ gridColumn: 'span 2', marginTop: '12px', opacity: loading ? 0.7 : 1 }}
                    >
                        {loading ? <Loader2 className="animate-spin" size={18} /> : null}
                        {loading ? 'Traitement en cours...' : 'Finaliser l\'Inscription'}
                        {!loading && <ArrowRight size={18} style={{ marginLeft: '8px' }} />}
                    </button>
                </form>

                <div style={{
                    marginTop: '24px',
                    padding: '16px',
                    borderRadius: '16px',
                    backgroundColor: '#FFFBEB',
                    border: '1px solid #FEF3C7',
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'flex-start'
                }}>
                    <CheckCircle size={18} style={{ color: '#D97706', marginTop: '2px' }} />
                    <p style={{ fontSize: '12px', color: '#92400E', margin: 0, lineHeight: 1.5 }}>
                        Votre compte est soumis à une validation manuelle par l'Administrateur National. Vous recevrez une notification d'activation par email.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default RegistrationPage;
