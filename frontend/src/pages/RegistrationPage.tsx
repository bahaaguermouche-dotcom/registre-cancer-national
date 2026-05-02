import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Shield, Building, User, Mail, Phone, Lock, CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { LAB_TYPES } from '../constants/labData';

const RegistrationPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const roleParam = searchParams.get('role') || 'Superviseur-Wilaya';
    const emailParam = searchParams.get('email') || '';
    const locationParam = searchParams.get('location') || 'Alger';

    const role = roleParam.replace(/-/g, ' ');
    const isWilayaSupervisor = role.toLowerCase().includes('wilaya');
    const isHospitalDirector = role === 'Directeur Hopital';
    const isDoctor = role === 'Médecin';
    const isLaboratory = role === 'Laboratoire';

    // Auto-detect if hospital name is already in location (e.g. from invite)
    const hasHospitalInLocation = locationParam.includes(' - ');
    const showHospitalInput = (isHospitalDirector || isLaboratory) && !hasHospitalInLocation;

    // Laboratory specific params
    const labTypeParam = searchParams.get('labType') || '';
    const initialLabTypes = labTypeParam ? labTypeParam.split(',') : [] as string[];
    const workplaceTypeParam = searchParams.get('workplaceType') || '';

    const [formData, setFormData] = useState({
        fullName: '',
        phone: '',
        password: '',
        confirmPassword: '',
        hospitalName: '',
        specialty: [] as string[],
        labType: initialLabTypes,
        labActivities: [] as string[]
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [specialties, setSpecialties] = useState<string[]>([]);
    const [loadingSpecialties, setLoadingSpecialties] = useState(false);

    const navigate = useNavigate();

    // Fetch specialties from DB
    React.useEffect(() => {
        if (isDoctor && workplaceTypeParam !== 'laboratory') {
            setLoadingSpecialties(true);
            api.get('/api/reference/specialties')
                .then(res => setSpecialties(res.data))
                .catch(err => console.error("Error fetching specialties:", err))
                .finally(() => setLoadingSpecialties(false));
        }
    }, [isDoctor, workplaceTypeParam]);

    // Effect to handle labType change or initialization
    React.useEffect(() => {
        if (labTypeParam && isLaboratory) {
            setFormData(prev => ({ ...prev, labType: labTypeParam.split(',') }));
        }
    }, [labTypeParam, isLaboratory]);

    const toggleLabType = (typeCode: string) => {
        setFormData(prev => {
            const nextLabTypes = prev.labType.includes(typeCode)
                ? prev.labType.filter(t => t !== typeCode)
                : [...prev.labType, typeCode];

            return {
                ...prev,
                labType: nextLabTypes,
                // Optional: Clear activities that don't belong to any remaining type?
                // For now, simpler to just keep them.
            };
        });
    };

    const toggleSpecialty = (spec: string) => {
        setFormData(prev => ({
            ...prev,
            specialty: prev.specialty.includes(spec)
                ? prev.specialty.filter(s => s !== spec)
                : [...prev.specialty, spec]
        }));
    };

    const toggleActivity = (activity: string) => {
        setFormData(prev => ({
            ...prev,
            labActivities: prev.labActivities.includes(activity)
                ? prev.labActivities.filter(a => a !== activity)
                : [...prev.labActivities, activity]
        }));
    };

    const getAllAvailableActivities = () =>
        Array.from(new Set(
            formData.labType.flatMap(code =>
                Object.values(LAB_TYPES).find(t => t.code === code)?.activities || []
            )
        ));

    const handleToggleAllActivities = () => {
        const all = getAllAvailableActivities();
        const allSelected = all.every(a => formData.labActivities.includes(a));
        setFormData(prev => ({
            ...prev,
            labActivities: allSelected ? [] : all
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            setError("Les mots de passe ne correspondent pas.");
            return;
        }

        if (isLaboratory && (formData.labType.length === 0 || formData.labActivities.length === 0)) {
            setError("Veuillez sélectionner au moins un type de laboratoire et au moins une activité.");
            return;
        }

        setLoading(true);
        setError('');

        try {
            await api.post('/api/auth/register', {
                name: formData.fullName,
                email: emailParam || 'invite@sante.dz',
                phone: formData.phone,
                password: formData.password,
                role: role,
                location: locationParam,
                hospitalName: showHospitalInput ? formData.hospitalName : '',
                specialty: (isDoctor && workplaceTypeParam !== 'laboratory') ? formData.specialty : '',
                lab_type: formData.labType,
                lab_activities: formData.labActivities,
                workplaceId: searchParams.get('workplaceId') || undefined,
                workplaceType: workplaceTypeParam || undefined
            });

            toast.success("Compte créé avec succès ! Votre accès est en attente d'approbation.");
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
                        Inscription {isWilayaSupervisor ? 'Wilaya' : isLaboratory ? 'Laboratoire' : 'Hospitalière'}
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
                            <input type="email" disabled className="login-input" value={emailParam || "invite@sante.dz"} />
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

                    {isDoctor && workplaceTypeParam !== 'laboratory' && (
                        <div style={{ gridColumn: 'span 2' }}>
                            <label className="input-label">Spécialité(s) Médicale(s)</label>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                                gap: '10px',
                                padding: '16px',
                                backgroundColor: '#f8fafc',
                                borderRadius: '16px',
                                border: '1px solid #e2e8f0',
                                maxHeight: '200px',
                                overflowY: 'auto'
                            }}>
                                {loadingSpecialties ? (
                                    <div style={{ gridColumn: 'span 2', textAlign: 'center', padding: '10px', color: '#64748b' }}>
                                        <Loader2 size={16} className="animate-spin" style={{ display: 'inline', marginRight: '8px' }} />
                                        Chargement...
                                    </div>
                                ) : specialties.length > 0 ? (
                                    specialties.map(spec => (
                                        <label key={spec} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            fontSize: '13px',
                                            cursor: 'pointer',
                                            padding: '4px 8px',
                                            borderRadius: '8px',
                                            backgroundColor: formData.specialty.includes(spec) ? '#f0f9ff' : 'transparent',
                                            border: `1px solid ${formData.specialty.includes(spec) ? '#00AAFF30' : 'transparent'}`,
                                            transition: 'all 0.2s'
                                        }}>
                                            <input
                                                type="checkbox"
                                                checked={formData.specialty.includes(spec)}
                                                onChange={() => toggleSpecialty(spec)}
                                                style={{ width: '16px', height: '16px', accentColor: '#00AAFF' }}
                                            />
                                            <span style={{ fontWeight: formData.specialty.includes(spec) ? '600' : '400' }}>{spec}</span>
                                        </label>
                                    ))
                                ) : (
                                    <div style={{ gridColumn: 'span 2', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                                        Aucune spécialité trouvée.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {showHospitalInput && (
                        <div style={{ gridColumn: 'span 2' }}>
                            <label className="input-label">{isLaboratory ? "Nom du Laboratoire" : "Nom de l'Hôpital"}</label>
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

                    {isLaboratory && (
                        <>
                            <div style={{ gridColumn: 'span 2' }}>
                                <label className="input-label">Type(s) de Laboratoire</label>
                                <div style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '12px',
                                    padding: '16px',
                                    backgroundColor: labTypeParam ? '#f8fafc' : 'white',
                                    borderRadius: '12px',
                                    border: '1px solid #e2e8f0'
                                }}>
                                    {Object.values(LAB_TYPES).map(t => (
                                        <label key={t.code} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            fontSize: '14px',
                                            cursor: labTypeParam ? 'not-allowed' : 'pointer',
                                            color: '#334155',
                                            padding: '4px 8px'
                                        }}>
                                            <input
                                                type="checkbox"
                                                disabled={!!labTypeParam}
                                                checked={formData.labType.includes(t.code)}
                                                onChange={() => toggleLabType(t.code)}
                                                style={{ width: '18px', height: '18px', accentColor: '#00AAFF' }}
                                            />
                                            {t.label}
                                        </label>
                                    ))}
                                </div>
                                {labTypeParam && <p style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', marginLeft: '4px' }}>Type défini par l'invitation de l'administrateur.</p>}
                            </div>

                            {formData.labType.length > 0 && (
                                <div style={{ gridColumn: 'span 2', marginTop: '10px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                        <label className="input-label" style={{ marginBottom: 0 }}>Activités du Laboratoire (Sélectionnez vos activités)</label>
                                        <button
                                            type="button"
                                            onClick={handleToggleAllActivities}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                color: '#00AAFF',
                                                fontWeight: '600',
                                                fontSize: '13px',
                                                padding: '4px 8px',
                                                borderRadius: '8px',
                                                transition: 'background 0.2s'
                                            }}
                                            onMouseEnter={e => (e.currentTarget.style.background = '#f0f9ff')}
                                            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                                        >
                                            {getAllAvailableActivities().every(a => formData.labActivities.includes(a))
                                                ? '☑ Tout désélectionner'
                                                : '☐ Tout sélectionner'
                                            }
                                        </button>
                                    </div>
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                                        gap: '12px',
                                        padding: '20px',
                                        backgroundColor: '#f8fafc',
                                        borderRadius: '20px',
                                        border: '1px solid #e2e8f0'
                                    }}>
                                        {/* Combine activities from all selected lab types */}
                                        {Array.from(new Set(
                                            formData.labType.flatMap(code =>
                                                Object.values(LAB_TYPES).find(t => t.code === code)?.activities || []
                                            )
                                        )).map(activity => (
                                            <label key={activity} style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '10px',
                                                fontSize: '13px',
                                                color: '#334155',
                                                cursor: 'pointer',
                                                padding: '8px 12px',
                                                borderRadius: '10px',
                                                backgroundColor: formData.labActivities.includes(activity) ? '#f0f9ff' : 'transparent',
                                                border: `1px solid ${formData.labActivities.includes(activity) ? '#bae6fd' : 'transparent'}`,
                                                transition: 'all 0.2s'
                                            }}>
                                                <input
                                                    type="checkbox"
                                                    checked={formData.labActivities.includes(activity)}
                                                    onChange={() => toggleActivity(activity)}
                                                    style={{
                                                        width: '18px',
                                                        height: '18px',
                                                        borderRadius: '6px',
                                                        accentColor: '#00AAFF'
                                                    }}
                                                />
                                                <span style={{ fontWeight: formData.labActivities.includes(activity) ? '600' : '400' }}>
                                                    {activity}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}

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
