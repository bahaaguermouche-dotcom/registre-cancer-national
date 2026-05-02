import React, { useState } from 'react';
import { X, Send, Mail, User, MapPin, Loader2 } from 'lucide-react';
import api from '../services/api';
import { ALGERIAN_WILAYAS } from '../constants/wilayas';
import { LAB_TYPES } from '../constants/labData';

interface InviteModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUser: any;
}

const InviteModal: React.FC<InviteModalProps> = ({ isOpen, onClose, currentUser }) => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [location, setLocation] = useState(ALGERIAN_WILAYAS[0]);
    const [hospitalName, setHospitalName] = useState('Hôpital Régional');
    const [labTypes, setLabTypes] = useState<string[]>([LAB_TYPES.ANAPATH.code]);

    const isDirector = currentUser?.role === 'Directeur Hopital';
    const isSecretary = currentUser?.role === 'Secrétaire';
    const isNationalAdmin = currentUser?.role === 'Administrateur National';
    const isLabManager = currentUser?.role === 'Laboratoire';

    const getAvailableRoles = () => {
        if (isNationalAdmin) {
            return ['Superviseur Wilaya', 'Directeur Hopital', 'Laboratoire', 'Secrétaire', 'Médecin'];
        }
        if (isDirector || isLabManager) {
            return ['Secrétaire', 'Médecin'];
        }
        if (isSecretary) {
            return ['Médecin'];
        }
        return ['Médecin'];
    };

    const availableRoles = getAvailableRoles();
    const [role, setRole] = useState(availableRoles[0]);

    const toggleLabType = (typeCode: string) => {
        setLabTypes(prev =>
            prev.includes(typeCode)
                ? prev.filter(t => t !== typeCode)
                : [...prev, typeCode]
        );
    };

    // Update form when modal opens or user context changes
    React.useEffect(() => {
        if (isOpen && currentUser) {
            const roles = getAvailableRoles();
            setRole(roles[0]);

            // For Directors, Labs and Secretaries, pre-fill and lock location
            if (isDirector || isSecretary || isLabManager) {
                setLocation(currentUser.location || '');
            } else if (!location || !ALGERIAN_WILAYAS.includes(location)) {
                setLocation(ALGERIAN_WILAYAS[15]); // Default to Alger (16) or first
            }
            // Reset hospitalName when modal opens or user context changes
            setHospitalName('');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setStatus('idle');

        try {
            let finalLocation = location;
            // Append hospital/lab name if Admin is inviting Director or Laboratoire
            if (isNationalAdmin && (role === 'Directeur Hopital' || role === 'Laboratoire') && hospitalName) {
                finalLocation = `${location} - ${hospitalName}`;
            }

            let workplaceId = undefined;
            let workplaceType = undefined;
            if (isDirector) {
                workplaceId = currentUser.id;
                workplaceType = 'hospital';
            } else if (isLabManager) {
                workplaceId = currentUser.id;
                workplaceType = 'laboratory';
            }

            const response = await api.post('/api/invitations/send', {
                email,
                role,
                location: finalLocation,
                labType: role === 'Laboratoire' ? labTypes : undefined,
                workplaceId,
                workplaceType
            });

            if (response.data.success) {
                setStatus('success');
                setTimeout(() => {
                    onClose();
                    setEmail('');
                    setLocation('');
                    setStatus('idle');
                }, 2000);
            }
        } catch (error: any) {
            console.error("Invitation failed:", error);
            setStatus('error');
        } finally {
            setLoading(false);
        }
    };

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
                animation: 'slideUp 0.3s ease-out'
            }}>
                {/* Header */}
                <div style={{
                    padding: '24px',
                    background: status === 'success' ? '#10b981' : 'linear-gradient(135deg, #00AAFF, #0088FF)',
                    color: 'white',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'background 0.3s'
                }}>
                    <div>
                        <h2 style={{ fontSize: '20px', fontWeight: '800', margin: 0 }}>
                            {status === 'success' ? 'Invitation Envoyée !' : (isDirector || isLabManager) ? 'Inviter du personnel' : 'Inviter un Responsable'}
                        </h2>
                        <p style={{ fontSize: '12px', opacity: 0.8, margin: 0 }}>
                            {status === 'success' ? 'Le lien a été transmis par email.' : 'Envoyez un lien d\'inscription sécurisé'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            backgroundColor: 'rgba(255,255,255,0.2)',
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

                {/* Form */}
                <form onSubmit={handleSubmit} style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Email Professionnel</label>
                        <div style={{ position: 'relative' }}>
                            <Mail style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={16} />
                            <input
                                type="email"
                                required
                                placeholder="exemple@sante.dz"
                                style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '14px' }}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Rôle Attribué</label>
                        <div style={{ position: 'relative' }}>
                            <User style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={16} />
                            <select
                                style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '14px', appearance: 'none' }}
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                            >
                                {availableRoles.map(r => (
                                    <option key={r} value={r}>{r}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Wilaya / Établissement</label>
                        <div style={{ position: 'relative' }}>
                            <MapPin style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={16} />
                            {isDirector || isSecretary || isLabManager ? (
                                <input
                                    type="text"
                                    readOnly
                                    value={location}
                                    style={{
                                        width: '100%',
                                        padding: '12px 12px 12px 40px',
                                        borderRadius: '12px',
                                        border: '1px solid #e2e8f0',
                                        outline: 'none',
                                        fontSize: '14px',
                                        backgroundColor: '#f8fafc',
                                        color: '#64748b'
                                    }}
                                />
                            ) : (
                                <select
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '12px 12px 12px 40px',
                                        borderRadius: '12px',
                                        border: '1px solid #e2e8f0',
                                        outline: 'none',
                                        fontSize: '14px',
                                        appearance: 'none',
                                        backgroundColor: 'white'
                                    }}
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                >
                                    {ALGERIAN_WILAYAS.map(w => (
                                        <option key={w} value={w}>{w}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>

                    {/* Hospital/Lab Name Input for National Admin inviting Director or Lab */}
                    {isNationalAdmin && (role === 'Directeur Hopital' || role === 'Laboratoire') && (
                        <>
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>
                                    {role === 'Laboratoire' ? "Nom du Laboratoire" : "Nom de l'Hôpital"}
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <User style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={16} />
                                    <input
                                        type="text"
                                        placeholder={role === 'Laboratoire' ? "Laboratoire Central" : "Hôpital Régional"}
                                        style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '14px' }}
                                        value={hospitalName}
                                        onChange={(e) => setHospitalName(e.target.value)}
                                    />
                                </div>
                            </div>

                            {role === 'Laboratoire' && (
                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>
                                        Type(s) de Laboratoire
                                    </label>
                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '8px',
                                        padding: '12px',
                                        backgroundColor: '#f8fafc',
                                        borderRadius: '12px',
                                        border: '1px solid #e2e8f0'
                                    }}>
                                        {Object.values(LAB_TYPES).map(t => (
                                            <label key={t.code} style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '10px',
                                                fontSize: '13px',
                                                color: '#475569',
                                                cursor: 'pointer'
                                            }}>
                                                <input
                                                    type="checkbox"
                                                    checked={labTypes.includes(t.code)}
                                                    onChange={() => toggleLabType(t.code)}
                                                    style={{ width: '16px', height: '16px', accentColor: '#00AAFF' }}
                                                />
                                                {t.label}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {status === 'error' && (
                        <p style={{ color: '#ef4444', fontSize: '12px', textAlign: 'center', margin: 0 }}>
                            Échec de l'envoi. Veuillez réessayer.
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading || status === 'success'}
                        className="login-button"
                        style={{
                            width: '100%',
                            marginTop: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            opacity: (loading || status === 'success') ? 0.7 : 1
                        }}
                    >
                        {loading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                        {loading ? 'Envoi en cours...' : status === 'success' ? 'Envoyé !' : 'Envoyer l\'invitation'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default InviteModal;
