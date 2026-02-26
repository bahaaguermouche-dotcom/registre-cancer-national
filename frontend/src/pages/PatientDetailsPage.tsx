import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, User, Activity, FileText, Image as ImageIcon,
    Plus, Clipboard, Calendar, Loader2, Save, Edit2,
    FileUp, Building, X, Shield, UserCheck, Stethoscope,
    CheckCircle, Clock, Check, MessageSquare, Send, Eye,
    Mic, MicOff
} from 'lucide-react';
import axios from 'axios';

interface Patient {
    id: string;
    national_id: string;
    name: string;
    first_name: string;
    last_name: string;
    age: number;
    gender: string;
    blood_type: string;
    date_of_birth?: string;
    rcp_active?: boolean;
    cancer_type: string;
    cancer_code?: string;
    hospital_location?: string;
    doctor_name?: string;
    // Extended Demographic & Administrative Fields
    cnas_number?: string;
    wilaya_residence?: string;
    commune_residence?: string;
    daira?: string;
    full_address?: string;
    residence_environment?: string;
    phone_primary?: string;
    profession?: string;
    education_level?: string;
    marital_status?: string;
    birth_date?: string;
    consent_status?: string;
}

interface Diagnostic {
    id: string;
    patient_id: string;
    doctor_id: string;
    doctor_name: string;
    content: string;
    date: string;
    type?: 'diagnosis' | 'treatment' | 'follow-up';
    stage?: string;
    grade?: string;
    treatment_type?: string;
    cycle?: string;
    outcome?: string;
    next_appointment?: string;
}

interface MedicalRecord {
    id: string;
    patient_id: string;
    doctor_id: string;
    doctor_name: string;
    type: 'analysis' | 'image';
    description: string;
    file_path: string;
    diagnostic_id?: string;
    created_at: string;
}

interface Tumor {
    id: string;
    patient_id: string;
    doctor_id: string;
    doctor_name: string;
    category?: string;
    sub_type?: string;
    icd10?: string;
    topography_code: string;
    topography_label: string;
    morphology_code: string;
    morphology_label: string;
    basis_of_diagnosis: string;
    stage: string;
    grade: string;
    date_of_incidence: string;
    status: string;
    created_at: string;
}

interface Message {
    id: string;
    patient_id: string;
    doctor_id: string;
    doctor_name: string;
    content: string;
    created_at: string;
}

const PatientDetailsPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [patient, setPatient] = useState<Patient | null>(null);
    const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
    const [records, setRecords] = useState<MedicalRecord[]>([]);
    const [tumors, setTumors] = useState<Tumor[]>([]);
    const [subtypes, setSubtypes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'info' | 'diagnostics' | 'records' | 'deposit' | 'tumors'>('info');
    const [selectedDiag, setSelectedDiag] = useState<Diagnostic | null>(null);
    const [showTimeline, setShowTimeline] = useState(false);
    const [depositHistory, setDepositHistory] = useState<{ name: string, type: string, time: string }[]>([]);

    // RCP & Chat state
    const [rcpMessages, setRcpMessages] = useState<Message[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isOwner, setIsOwner] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [rcpActionLoading, setRcpActionLoading] = useState(false);

    // Form states
    const [showDiagForm, setShowDiagForm] = useState(false);
    const [diagContent, setDiagContent] = useState('');
    const [editingDiagId, setEditingDiagId] = useState<string | null>(null);
    const [diagType, setDiagType] = useState<'diagnosis' | 'treatment' | 'follow-up'>('diagnosis');
    const [diagStage, setDiagStage] = useState('');
    const [diagGrade, setDiagGrade] = useState('');
    const [diagTreatmentType, setDiagTreatmentType] = useState('');
    const [diagCycle, setDiagCycle] = useState('');
    const [diagOutcome, setDiagOutcome] = useState('');
    const [diagNextAppointment, setDiagNextAppointment] = useState('');
    const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
    const [diagFile, setDiagFile] = useState<File | null>(null);
    const [diagFileDesc, setDiagFileDesc] = useState('');
    const [diagUploadType, setDiagUploadType] = useState<'analysis' | 'image'>('image');

    const [showRecordForm, setShowRecordForm] = useState(false);
    const [recordType, setRecordType] = useState<'analysis' | 'image'>('analysis');
    const [recordDesc, setRecordDesc] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    // Tumor Form State
    const [showTumorForm, setShowTumorForm] = useState(false);
    const [tumorFormData, setTumorFormData] = useState({
        category: '',
        sub_type: '',
        icd10: '',
        topography_code: '',
        topography_label: '',
        morphology_code: '',
        morphology_label: '',
        basis_of_diagnosis: 'Histologie',
        stage: '',
        grade: '',
        date_of_incidence: new Date().toISOString().split('T')[0]
    });

    const [isRecordingDiag, setIsRecordingDiag] = useState(false);
    const [isRecordingChat, setIsRecordingChat] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const recognitionRef = useRef<any>(null);

    // Get latest tumor data for sidebar display
    const latestTumor = tumors.length > 0 ? tumors[0] : null;

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            const user = JSON.parse(userStr);
            setCurrentUser(user);
            // Default tab logic based on role
            if (user.role === 'Médecin' || user.role === 'Administrateur National') {
                setActiveTab('diagnostics');
            } else {
                setActiveTab('info');
            }
        }
        fetchData();
    }, [id]);

    useEffect(() => {
        if (activeTab === 'tumors' && patient?.cancer_type) {
            fetchSubtypes(patient.cancer_type);
        }
    }, [activeTab, patient?.cancer_type]);

    const fetchSubtypes = async (category: string) => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`http://localhost:5000/api/reference/cancer-subtypes?category=${category}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSubtypes(res.data);
        } catch (error) {
            console.error("Error fetching subtypes:", error);
        }
    };

    const handleVoiceInput = (setter: React.Dispatch<React.SetStateAction<string>>, setRecording: React.Dispatch<React.SetStateAction<boolean>>) => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
            setRecording(false);
            return;
        }

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("La reconnaissance vocale n'est pas supportée par votre navigateur. Veuillez utiliser Chrome ou Edge.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'fr-FR'; // Default to French
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            setRecording(true);
        };

        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setter(prev => prev ? `${prev} ${transcript}` : transcript);
        };

        recognition.onerror = (event: any) => {
            console.error("Speech recognition error", event.error);
            setRecording(false);
            recognitionRef.current = null;
        };

        recognition.onend = () => {
            setRecording(false);
            recognitionRef.current = null;
        };

        recognitionRef.current = recognition;
        recognition.start();
    };

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`http://localhost:5000/api/patients/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPatient(response.data.patient);
            setDiagnostics(response.data.diagnostics);
            setRecords(response.data.medical_records);
            setTumors(response.data.tumors || []);
            setIsOwner(response.data.isOwner);

            // Also fetch chats
            const chatRes = await axios.get(`http://localhost:5000/api/patients/${id}/chats`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setRcpMessages(chatRes.data);
        } catch (error) {
            console.error("Fetch Data Error:", error);
            alert("Erreur lors de la récupération des données.");
        } finally {
            setLoading(false);
        }
    };

    const handleToggleRcp = async () => {
        if (!patient) return;
        setRcpActionLoading(true);
        try {
            const token = localStorage.getItem('token');
            const newStatus = !patient.rcp_active;
            await axios.patch(`http://localhost:5000/api/patients/${id}/rcp`,
                { active: newStatus },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setPatient({ ...patient, rcp_active: newStatus });
        } catch (error) {
            console.error("RCP Toggle Error:", error);
            alert("Erreur lors du changement de mode RCP.");
        } finally {
            setRcpActionLoading(false);
        }
    };

    const handleSendChatMessage = async () => {
        if (!chatInput.trim()) return;
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(`http://localhost:5000/api/rcp-chats`,
                { patient_id: id, content: chatInput },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setRcpMessages([...rcpMessages, response.data]);
            setChatInput('');
        } catch (error) {
            console.error("Send Chat Error:", error);
            alert("Erreur lors de l'envoi du message.");
        }
    };

    const handleSaveDiagnostic = async () => {
        if (!diagContent.trim()) return;
        setActionLoading(true);
        try {
            const token = localStorage.getItem('token');
            if (editingDiagId) {
                await axios.patch(`http://localhost:5000/api/diagnostics/${editingDiagId}`,
                    {
                        content: diagContent,
                        type: diagType,
                        stage: diagStage,
                        grade: diagGrade,
                        treatment_type: diagTreatmentType,
                        cycle: diagCycle,
                        outcome: diagOutcome,
                        next_appointment: diagNextAppointment
                    },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
            }

            const diagId = editingDiagId || (await axios.post(`http://localhost:5000/api/diagnostics`,
                {
                    patient_id: id,
                    content: diagContent,
                    type: diagType,
                    stage: diagStage,
                    grade: diagGrade,
                    treatment_type: diagTreatmentType,
                    cycle: diagCycle,
                    outcome: diagOutcome,
                    next_appointment: diagNextAppointment
                },
                { headers: { Authorization: `Bearer ${token}` } }
            )).data.id;

            // Link selected existing records to this diagnostic
            if (selectedRecordIds.length > 0) {
                await Promise.all(selectedRecordIds.map(recordId =>
                    axios.patch(`http://localhost:5000/api/medical-records/${recordId}`,
                        { diagnostic_id: diagId },
                        { headers: { Authorization: `Bearer ${token}` } }
                    )
                ));
            }

            // Upload and link NEW document if selected
            if (diagFile) {
                const formData = new FormData();
                formData.append('file', diagFile);
                formData.append('patient_id', id || '');
                formData.append('type', diagUploadType);
                formData.append('description', diagFileDesc || 'Sans description');
                formData.append('diagnostic_id', diagId);

                await axios.post(`http://localhost:5000/api/medical-records`, formData, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data'
                    }
                });
            }

            setDiagContent('');
            setSelectedRecordIds([]);
            setDiagFile(null);
            setDiagFileDesc('');
            setShowDiagForm(false);
            setEditingDiagId(null);
            fetchData();
        } catch (error) {
            console.error("Save Diagnostic Error:", error);
        } finally {
            setActionLoading(false);
        }
    };

    const handleUploadRecord = async () => {
        if (!selectedFile) return;
        setActionLoading(true);
        try {
            const token = localStorage.getItem('token');
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('patient_id', id || '');
            formData.append('type', recordType);
            formData.append('description', recordDesc);

            await axios.post(`http://localhost:5000/api/medical-records`, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (currentUser?.role === 'Secrétaire') {
                setDepositHistory(prev => [{
                    name: selectedFile.name,
                    type: recordType,
                    time: new Date().toLocaleTimeString()
                }, ...prev]);
            }

            setSelectedFile(null);
            setRecordDesc('');
            setShowRecordForm(false);
            fetchData();
        } catch (error) {
            console.error("Upload Record Error:", error);
        } finally {
            setActionLoading(false);
        }
    };

    const handleSaveTumor = async () => {
        if (!tumorFormData.topography_code) return;
        setActionLoading(true);
        try {
            const token = localStorage.getItem('token');
            await axios.post('http://localhost:5000/api/tumors', {
                ...tumorFormData,
                patient_id: id
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShowTumorForm(false);
            setTumorFormData({
                category: '',
                sub_type: '',
                icd10: '',
                topography_code: '',
                topography_label: '',
                morphology_code: '',
                morphology_label: '',
                basis_of_diagnosis: 'Histologie',
                stage: '',
                grade: '',
                date_of_incidence: new Date().toISOString().split('T')[0]
            });
            fetchData();
        } catch (error) {
            console.error("Save Tumor Error:", error);
            alert("Erreur lors de l'enregistrement de la tumeur.");
        } finally {
            setActionLoading(false);
        }
    };

    const handleUpdateRecordLink = async (recordId: string, diagId: string | null) => {
        setActionLoading(true);
        try {
            const token = localStorage.getItem('token');
            await axios.patch(`http://localhost:5000/api/medical-records/${recordId}`, {
                diagnostic_id: diagId
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchData();
        } catch (error) {
            console.error("Update Record Link Error:", error);
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f8fafc' }}>
                <Loader2 className="animate-spin" size={48} style={{ color: '#00AAFF' }} />
            </div>
        );
    }

    if (!patient) return <div>Patient non trouvé.</div>;

    return (
        <div className="dashboard-page animate-fadeIn" style={{ padding: '32px' }}>
            {/* Header */}
            <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                <button
                    onClick={() => navigate('/patients')}
                    style={{
                        padding: '10px', borderRadius: '12px', border: '1px solid #e2e8f0',
                        backgroundColor: 'white', cursor: 'pointer', display: 'flex'
                    }}
                >
                    <ArrowLeft size={20} style={{ color: '#64748b' }} />
                </button>
                <div>
                    <h1 className="page-title" style={{ margin: 0, fontSize: '24px' }}>Dossier Patient</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <p className="page-subtitle" style={{ margin: '4px 0 0' }}>
                            {patient.name}
                        </p>
                        <span style={{
                            fontSize: '11px', fontWeight: '800', backgroundColor: '#eff6ff',
                            color: '#2563eb', padding: '4px 10px', borderRadius: '8px',
                            display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #dbeafe'
                        }}>
                            Suivi Actif <CheckCircle size={12} />
                        </span>
                        {patient.rcp_active && (
                            <span style={{
                                fontSize: '11px', fontWeight: '800', backgroundColor: '#fdf2f8',
                                color: '#db2777', padding: '4px 10px', borderRadius: '8px',
                                display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #fce7f3'
                            }}>
                                Mode RCP Actif <Activity size={12} />
                            </span>
                        )}
                        {!isOwner && patient.rcp_active && (
                            <span style={{
                                fontSize: '11px', fontWeight: '800', backgroundColor: '#f0fdf4',
                                color: '#166534', padding: '4px 10px', borderRadius: '8px',
                                display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #dcfce7'
                            }}>
                                Lecture Seule <Eye size={12} />
                            </span>
                        )}
                    </div>
                </div>

                <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px' }}>
                    {currentUser?.role === 'Médecin' && (
                        <>
                            <button
                                onClick={() => setShowChat(!showChat)}
                                style={{
                                    padding: '10px 20px', borderRadius: '12px', border: '1px solid #e2e8f0',
                                    backgroundColor: showChat ? '#2563eb' : 'white',
                                    color: showChat ? 'white' : '#64748b',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                                    fontWeight: '700', fontSize: '14px', transition: 'all 0.2s'
                                }}
                            >
                                <MessageSquare size={18} />
                                {rcpMessages.length > 0 && <span style={{ backgroundColor: showChat ? 'rgba(255,255,255,0.2)' : '#eff6ff', borderRadius: '6px', padding: '2px 6px', fontSize: '10px' }}>{rcpMessages.length}</span>}
                                Discussion RCP
                            </button>

                            {isOwner && (
                                <button
                                    onClick={handleToggleRcp}
                                    disabled={rcpActionLoading}
                                    style={{
                                        padding: '10px 20px', borderRadius: '12px',
                                        border: patient.rcp_active ? '1px solid #db2777' : '1px solid #e2e8f0',
                                        backgroundColor: patient.rcp_active ? '#fff1f2' : 'white',
                                        color: patient.rcp_active ? '#db2777' : '#64748b',
                                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                                        fontWeight: '700', fontSize: '14px', transition: 'all 0.2s',
                                        boxShadow: patient.rcp_active ? '0 0 0 4px rgba(219, 39, 119, 0.1)' : 'none'
                                    }}
                                >
                                    {rcpActionLoading ? <Loader2 size={18} className="spin" /> : <Activity size={18} />}
                                    {patient.rcp_active ? 'Désactiver RCP' : 'Activer RCP'}
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '32px', alignItems: 'start' }}>
                {/* Left: Patient Profile Card */}
                <div className="card-container" style={{ padding: '24px' }}>
                    <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                        <div style={{
                            width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#f0f9ff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
                            border: '4px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                        }}>
                            <User size={40} style={{ color: '#00AAFF' }} />
                        </div>
                        <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px' }}>{patient.name}</h2>
                        <span style={{
                            fontSize: '12px', fontWeight: '700', backgroundColor: '#e0f2fe',
                            color: '#0369a1', padding: '4px 12px', borderRadius: '20px'
                        }}>
                            {patient.cancer_code}
                        </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                                    <Calendar size={20} />
                                </div>
                                <div>
                                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>Date of Birth:</div>
                                    <div style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b' }}>{patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'May 14, 1978'}</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                                    <Activity size={20} />
                                </div>
                                <div>
                                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>Gender:</div>
                                    <div style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b' }}>{patient.gender}</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                                    <Shield size={20} />
                                </div>
                                <div>
                                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>National ID:</div>
                                    <div style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b' }}>{patient.national_id.replace(/^(.{4}).*(.{4})$/, '$1-XXXX-$2')}</div>
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: '12px' }}>
                            <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>Additional Details</div>
                            {[
                                { label: 'Localisation', value: patient.hospital_location, icon: <Building size={16} /> },
                                { label: 'Type de Cancer', value: patient.cancer_type, icon: <Clipboard size={16} /> },
                                { label: 'Médecin Traitant', value: patient.doctor_name || 'Non assigné', icon: <User size={16} /> },
                                { label: 'Stade Clinique', value: latestTumor?.stage || 'Non défini', icon: <Activity size={16} /> },
                                { label: 'Grade Histologique', value: latestTumor?.grade || 'Non défini', icon: <Stethoscope size={16} /> },
                            ].map((item) => (
                                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                    <div style={{ color: '#94a3b8', display: 'flex' }}>{item.icon}</div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', marginBottom: '1px' }}>{item.label}</div>
                                        <div style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b' }}>{item.value}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right: Tabs and Content */}
                <div>
                    <div style={{
                        display: 'flex', gap: '8px', marginBottom: '24px',
                        backgroundColor: '#f1f5f9', padding: '6px', borderRadius: '16px',
                        width: 'fit-content'
                    }}>
                        {[
                            { id: 'info', label: 'Informations', icon: <User size={18} /> },
                            { id: 'tumors', label: 'Données Cliniques', icon: <Activity size={18} />, hidden: currentUser?.role === 'Secrétaire' },
                            { id: 'diagnostics', label: 'Diagnostics', icon: <FileText size={18} />, hidden: currentUser?.role === 'Secrétaire' },
                            { id: 'records', label: 'Analyses & Imagerie', icon: <ImageIcon size={18} />, hidden: currentUser?.role === 'Secrétaire' },
                            { id: 'deposit', label: 'Dépôt de Documents', icon: <FileUp size={18} />, hidden: currentUser?.role !== 'Secrétaire' }
                        ].filter(t => !t.hidden).map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    padding: '10px 20px', borderRadius: '12px', border: 'none',
                                    cursor: 'pointer', fontSize: '14px', fontWeight: '700',
                                    transition: 'all 0.2s',
                                    backgroundColor: activeTab === tab.id ? 'white' : 'transparent',
                                    color: activeTab === tab.id ? '#0f172a' : '#64748b',
                                    boxShadow: activeTab === tab.id ? '0 4px 12px rgba(0,0,0,0.05)' : 'none'
                                }}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {activeTab === 'tumors' && (
                        <div className="animate-fadeIn">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>Registres des Tumeurs (IARC)</h3>
                                {!showTumorForm && (
                                    <button className="login-button" onClick={() => setShowTumorForm(true)} style={{ width: 'auto', padding: '10px 20px', gap: '8px' }}>
                                        <Plus size={18} /> Nouvelle Tumeur
                                    </button>
                                )}
                            </div>

                            {showTumorForm && (
                                <div className="card-container" style={{ padding: '24px', marginBottom: '24px', border: '2px solid #00AAFF', backgroundColor: '#f0f9ff' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                        <h4 style={{ margin: 0, color: '#00AAFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Activity size={18} /> Saisie de Cas CanReg5
                                        </h4>
                                        <button onClick={() => setShowTumorForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                        <div style={{ gridColumn: 'span 2' }}>
                                            <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px', display: 'block' }}>Type de Tumeur (Morphologie Précise)</label>
                                            <select
                                                className="login-input" style={{ width: '100%' }}
                                                value={tumorFormData.sub_type}
                                                onChange={e => {
                                                    const sub = subtypes.find(s => s.sub_type === e.target.value);
                                                    setTumorFormData({
                                                        ...tumorFormData,
                                                        category: patient?.cancer_type || '',
                                                        sub_type: e.target.value,
                                                        icd10: sub?.icd10 || '',
                                                        morphology_code: sub?.icd10 || '', // Fallback to ICD-10 for now
                                                        topography_code: sub?.icd10 || ''  // Fallback to ICD-10 for now
                                                    });
                                                }}
                                            >
                                                <option value="" disabled>Sélectionner le type histologique...</option>
                                                {subtypes.map(s => (
                                                    <option key={s.id} value={s.sub_type}>{s.sub_type}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px', display: 'block' }}>Code CIM-10 / Topographie</label>
                                            <input
                                                readOnly
                                                className="login-input" style={{ width: '100%', backgroundColor: '#f8fafc' }}
                                                value={tumorFormData.icd10}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px', display: 'block' }}>Base du Diagnostic</label>
                                            <select
                                                className="login-input" style={{ width: '100%' }}
                                                value={tumorFormData.basis_of_diagnosis}
                                                onChange={e => setTumorFormData({ ...tumorFormData, basis_of_diagnosis: e.target.value })}
                                            >
                                                <option value="Clinique">Clinique uniquement</option>
                                                <option value="Cytologie">Cytologie / Hématologie</option>
                                                <option value="Histologie">Histologie (Primaire)</option>
                                                <option value="Autopsie">Autopsie</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px', display: 'block' }}>Stade Clinique</label>
                                            <select
                                                className="login-input" style={{ width: '100%' }}
                                                value={tumorFormData.stage}
                                                onChange={e => setTumorFormData({ ...tumorFormData, stage: e.target.value })}
                                            >
                                                <option value="">Sélectionner un stade...</option>
                                                <option value="Stade 0 (In situ)">Stade 0 (In situ)</option>
                                                <option value="Stade I">Stade I</option>
                                                <option value="Stade II">Stade II</option>
                                                <option value="Stade III">Stade III</option>
                                                <option value="Stade IV">Stade IV</option>
                                                <option value="Inconnu (X)">Inconnu (X)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px', display: 'block' }}>Grade Histologique</label>
                                            <select
                                                className="login-input" style={{ width: '100%' }}
                                                value={tumorFormData.grade}
                                                onChange={e => setTumorFormData({ ...tumorFormData, grade: e.target.value })}
                                            >
                                                <option value="">Sélectionner un grade...</option>
                                                <option value="Grade 1 (Bien différencié)">Grade 1 (Bien différencié)</option>
                                                <option value="Grade 2 (Moyennement différencié)">Grade 2 (Moyennement différencié)</option>
                                                <option value="Grade 3 (Peu différencié)">Grade 3 (Peu différencié)</option>
                                                <option value="Grade 4 (Indifférencié)">Grade 4 (Indifférencié)</option>
                                                <option value="GX (Non défini)">GX (Non défini)</option>
                                            </select>
                                        </div>
                                        <div style={{ gridColumn: 'span 2' }}>
                                            <button
                                                className="login-button"
                                                onClick={handleSaveTumor}
                                                disabled={actionLoading}
                                                style={{ marginTop: '10px' }}
                                            >
                                                {actionLoading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                                Valider l'enregistrement de la tumeur
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div style={{ display: 'grid', gap: '16px' }}>
                                {tumors.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '40px', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '16px', border: '1px dashed #e2e8f0' }}>
                                        Aucune tumeur enregistrée pour ce patient.
                                    </div>
                                ) : (
                                    tumors.map(tumor => (
                                        <div key={tumor.id} className="card-container" style={{ padding: '20px', display: 'flex', gap: '20px', position: 'relative' }}>
                                            <div style={{
                                                width: '48px', height: '48px', borderRadius: '12px',
                                                backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00AAFF'
                                            }}>
                                                <Activity size={24} />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                    <span style={{ fontWeight: '800', fontSize: '16px', color: '#0f172a' }}>
                                                        {tumor.category ? `${tumor.category} - ${tumor.sub_type}` : tumor.topography_code}
                                                    </span>
                                                    <span style={{
                                                        fontSize: '11px', fontWeight: '700', padding: '4px 8px', borderRadius: '6px',
                                                        backgroundColor: '#dcfce7', color: '#166534', textTransform: 'uppercase'
                                                    }}>
                                                        {tumor.status}
                                                    </span>
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                                                    <div>
                                                        <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase' }}>Structure / Code</div>
                                                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#475569' }}>{tumor.icd10 || tumor.morphology_code}</div>
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase' }}>Base Diagnostic</div>
                                                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#475569' }}>{tumor.basis_of_diagnosis}</div>
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase' }}>Stade / Grade</div>
                                                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#475569' }}>
                                                            {tumor.stage || 'N/A'} {tumor.grade ? ` / ${tumor.grade}` : ''}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                                                        Enregistré par <span style={{ fontWeight: '600', color: '#64748b' }}>Dr. {tumor.doctor_name}</span>
                                                    </div>
                                                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                                                        {new Date(tumor.created_at).toLocaleDateString()}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'info' && (
                        <div className="card-container" style={{ padding: '32px' }}>
                            <h3 style={{ margin: '0 0 24px', fontSize: '18px', fontWeight: '800' }}>Informations Administratives & Socio-Démographiques</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '32px' }}>
                                {/* Colonne 1 : Identification */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div>
                                        <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Nom Complet</div>
                                        <div style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>{patient.first_name} {patient.last_name}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Numéro CNI</div>
                                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>{patient.national_id}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Numéro CNAS</div>
                                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>{patient.cnas_number || 'Non renseigné'}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Date de Naissance</div>
                                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>
                                            {patient.birth_date ? new Date(patient.birth_date).toLocaleDateString() : 'Non renseignée'} ({patient.age} ans)
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Sexe & Groupe Sanguin</div>
                                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>{patient.gender} / {patient.blood_type}</div>
                                    </div>
                                </div>

                                {/* Colonne 2 : Domiciliation */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div>
                                        <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Wilaya / Commune</div>
                                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>{patient.wilaya_residence || 'Non renseignée'} / {patient.commune_residence || '-'}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Daïra (Tlemcen)</div>
                                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>{patient.daira || 'Non renseignée'}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Adresse ou Lieu-dit</div>
                                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>{patient.full_address || 'Non renseignée'}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Milieu de résidence</div>
                                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>{patient.residence_environment || 'Urbain'}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Hôpital d'Attache</div>
                                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>{patient.hospital_location}</div>
                                    </div>
                                </div>

                                {/* Colonne 3 : Socio-Démographique & Clinique de Base */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div>
                                        <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Profession / État Civil</div>
                                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>{patient.profession || 'Non renseignée'} / {patient.marital_status || 'Non renseigné'}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Niveau d'Instruction</div>
                                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>{patient.education_level || 'Non renseigné'}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Téléphone</div>
                                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>{patient.phone_primary || 'Non renseigné'}</div>
                                    </div>
                                    <div style={{
                                        padding: '12px', borderRadius: '12px',
                                        backgroundColor: patient.consent_status === 'Signé' ? '#dcfce7' : (patient.consent_status === 'Refusé' ? '#fee2e2' : '#fffbeb'),
                                        border: '1px solid',
                                        borderColor: patient.consent_status === 'Signé' ? '#bbf7d0' : (patient.consent_status === 'Refusé' ? '#fecaca' : '#fef3c7')
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Shield size={16} color={patient.consent_status === 'Signé' ? '#166534' : (patient.consent_status === 'Refusé' ? '#991b1b' : '#92400e')} />
                                            <span style={{ fontSize: '11px', fontWeight: '700', color: patient.consent_status === 'Signé' ? '#166534' : (patient.consent_status === 'Refusé' ? '#991b1b' : '#92400e'), textTransform: 'uppercase' }}>
                                                Consentement
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '14px', fontWeight: '800', marginTop: '4px', color: patient.consent_status === 'Signé' ? '#16a34a' : (patient.consent_status === 'Refusé' ? '#ef4444' : '#d97706') }}>
                                            {patient.consent_status || 'En attente'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {currentUser?.role === 'Secrétaire' && (
                                <div style={{
                                    marginTop: '32px', padding: '20px', borderRadius: '16px',
                                    backgroundColor: '#fff7ed', border: '1px solid #ffedd5',
                                    display: 'flex', alignItems: 'center', gap: '16px'
                                }}>
                                    <Shield size={24} style={{ color: '#ea580c' }} />
                                    <div style={{ fontSize: '14px', color: '#9a3412', fontWeight: '600' }}>
                                        Conformément au protocole de confidentialité médicale, l'accès aux diagnostics et analyses est strictement réservé au corps médical.
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'deposit' && (
                        <div className="card-container" style={{ padding: '32px' }}>
                            <div style={{ marginBottom: '32px' }}>
                                <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: '800' }}>Dépôt de Nouveaux Documents</h3>
                                <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
                                    Utilisez ce formulaire pour ajouter des analyses ou des images au dossier du patient.
                                    <br />Note: Une fois le document déposé, il ne sera plus consultable par vos services pour des raisons de confidentialité médicale.
                                </p>
                            </div>

                            <div style={{ padding: '24px', backgroundColor: '#f8fafc', borderRadius: '20px', border: '1px solid #e2e8f0', marginBottom: '32px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '20px' }}>
                                    <div>
                                        <label className="input-label">Type de document</label>
                                        <select
                                            className="login-input"
                                            style={{ width: '100%' }}
                                            value={recordType}
                                            onChange={(e) => setRecordType(e.target.value as any)}
                                        >
                                            <option value="analysis">Analyse Biologique</option>
                                            <option value="image">Imagerie (Radio/Scan)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="input-label">Fichier</label>
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                type="file"
                                                id="deposit-file"
                                                style={{ display: 'none' }}
                                                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                            />
                                            <button
                                                onClick={() => document.getElementById('deposit-file')?.click()}
                                                style={{
                                                    width: '100%', padding: '10px 16px', borderRadius: '12px',
                                                    border: '1px solid #e2e8f0', backgroundColor: 'white',
                                                    textAlign: 'left', fontSize: '14px', color: selectedFile ? '#1e293b' : '#64748b',
                                                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px'
                                                }}
                                            >
                                                <FileUp size={16} />
                                                {selectedFile ? selectedFile.name : 'Choisir un fichier...'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div style={{ marginBottom: '24px' }}>
                                    <label className="input-label">Description / Libellé</label>
                                    <input
                                        className="login-input"
                                        placeholder="Ex: Radio Thorax face - Janvier 2024"
                                        value={recordDesc}
                                        onChange={(e) => setRecordDesc(e.target.value)}
                                    />
                                </div>
                                <button
                                    className="login-button"
                                    style={{ width: 'auto', padding: '12px 32px' }}
                                    onClick={handleUploadRecord}
                                    disabled={actionLoading || !selectedFile}
                                >
                                    {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                    Déposer le document
                                </button>
                            </div>

                            {depositHistory.length > 0 && (
                                <div>
                                    <h4 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>Documents déposés lors de cette session</h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {depositHistory.map((item, idx) => (
                                            <div key={idx} style={{
                                                padding: '16px', borderRadius: '16px', backgroundColor: '#f0fdf4',
                                                border: '1px solid #dcfce7', display: 'flex', alignItems: 'center', gap: '16px'
                                            }}>
                                                <div style={{ backgroundColor: 'white', padding: '8px', borderRadius: '10px', color: '#22c55e' }}>
                                                    <UserCheck size={20} />
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#166534' }}>{item.name}</div>
                                                    <div style={{ fontSize: '12px', color: '#15803d' }}>
                                                        {item.type === 'image' ? '📸 Imagerie' : '📄 Analyse'} • Transmis avec succès à {item.time}
                                                    </div>
                                                </div>
                                                <div style={{ fontSize: '11px', fontWeight: '800', color: '#166534', backgroundColor: '#bbf7d0', padding: '4px 10px', borderRadius: '20px', textTransform: 'uppercase' }}>
                                                    Vérifié
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'diagnostics' && (
                        <div className="card-container" style={{ padding: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>Diagnostics & Suivi</h3>
                                {showTimeline && (
                                    <button
                                        onClick={() => setShowTimeline(false)}
                                        style={{ border: 'none', background: 'transparent', color: '#2563eb', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                    >
                                        <ArrowLeft size={16} /> Retour au Hub
                                    </button>
                                )}
                            </div>

                            {showTimeline ? (
                                <div style={{ position: 'relative', paddingLeft: '40px' }}>
                                    <div style={{
                                        position: 'absolute', left: '16px', top: '10px', bottom: '10px',
                                        width: '2px', backgroundColor: '#2563eb', opacity: 0.3
                                    }} />

                                    {diagnostics.length === 0 ? (
                                        <div style={{
                                            padding: '48px', borderRadius: '20px',
                                            backgroundColor: '#f8fafc', border: '2px dashed #e2e8f0',
                                            textAlign: 'center', color: '#94a3b8'
                                        }}>
                                            <FileText size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                                            <p>Aucun évènement clinique enregistré.</p>
                                        </div>
                                    ) : diagnostics.map((diag) => (
                                        <div key={diag.id} style={{ position: 'relative', marginBottom: '32px' }}>
                                            <div style={{
                                                position: 'absolute', left: '-33px', top: '24px',
                                                width: '18px', height: '18px', borderRadius: '50%',
                                                backgroundColor: '#2563eb', border: '4px solid white',
                                                boxShadow: '0 0 0 2px #dbeafe', zIndex: 2
                                            }} />
                                            <div style={{
                                                padding: '24px', borderRadius: '20px', backgroundColor: 'white',
                                                border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '16px',
                                                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <div style={{ color: '#2563eb' }}>
                                                            {diag.type === 'treatment' ? <Stethoscope size={20} /> :
                                                                diag.type === 'follow-up' ? <CheckCircle size={20} /> :
                                                                    <Activity size={20} />}
                                                        </div>
                                                        <div>
                                                            <div style={{ fontSize: '15px', fontWeight: '800', color: '#1e293b' }}>
                                                                {diag.type === 'treatment' ? 'Traitement En Cours' :
                                                                    diag.type === 'follow-up' ? 'Suivi Médical' :
                                                                        'Diagnostic'}
                                                            </div>
                                                            <div style={{ fontSize: '12px', color: '#64748b' }}>
                                                                {new Date(diag.date).toLocaleDateString()}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => setSelectedDiag(diag)} style={{ border: 'none', background: 'transparent', color: '#2563eb', cursor: 'pointer', fontSize: '13px', fontWeight: '700' }}>
                                                        Afficher Détails
                                                    </button>
                                                </div>

                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '16px' }}>
                                                    {diag.type === 'diagnosis' && (
                                                        <>
                                                            <div>
                                                                <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>Stade CLIN:</div>
                                                                <div style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b' }}>{diag.stage || 'N/A'}</div>
                                                            </div>
                                                            <div>
                                                                <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>Grade HISTO:</div>
                                                                <div style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b' }}>{diag.grade || 'N/A'}</div>
                                                            </div>
                                                        </>
                                                    )}
                                                    {/* Other types omitted for brevity in preview, but kept in full implementation */}
                                                    {diag.type === 'treatment' && (
                                                        <>
                                                            <div>
                                                                <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>Traitement:</div>
                                                                <div style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b' }}>{diag.treatment_type || 'N/A'}</div>
                                                            </div>
                                                            <div>
                                                                <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>Cycle:</div>
                                                                <div style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b' }}>{diag.cycle || 'N/A'}</div>
                                                            </div>
                                                        </>
                                                    )}
                                                    {diag.type === 'follow-up' && (
                                                        <>
                                                            <div>
                                                                <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>Résultat:</div>
                                                                <div style={{ fontSize: '13px', fontWeight: '800', color: '#10b981' }}>{diag.outcome || 'N/A'}</div>
                                                            </div>
                                                            <div>
                                                                <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>Prochain RDV:</div>
                                                                <div style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b' }}>
                                                                    {diag.next_appointment ? new Date(diag.next_appointment).toLocaleDateString() : 'N/A'}
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                                    <div
                                        onClick={() => setShowTimeline(true)}
                                        style={{
                                            padding: '40px 32px', borderRadius: '24px', backgroundColor: 'white',
                                            border: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s',
                                            display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '16px',
                                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
                                        }}
                                        className="hub-card"
                                    >
                                        <div style={{ width: '64px', height: '64px', borderRadius: '20px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                                            <Clipboard size={32} />
                                        </div>
                                        <div>
                                            <h4 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: '800' }}>Historique Clinique</h4>
                                            <p style={{ margin: 0, fontSize: '14px', color: '#64748b', lineHeight: '1.6' }}>Consulter les diagnostics précédents, traitements et comptes-rendus de suivi.</p>
                                        </div>
                                        <button className="login-button" style={{ width: 'auto', marginTop: '8px' }}>Consulter</button>
                                    </div>

                                    {isOwner && (currentUser?.role === 'Médecin' || currentUser?.role === 'Administrateur National') && (
                                        <div
                                            onClick={() => { setShowDiagForm(true); setEditingDiagId(null); setDiagContent(''); }}
                                            style={{
                                                padding: '40px 32px', borderRadius: '24px', backgroundColor: '#f8fafc',
                                                border: '2px dashed #cbd5e1', cursor: 'pointer', transition: 'all 0.2s',
                                                display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '16px'
                                            }}
                                            className="hub-card"
                                        >
                                            <div style={{ width: '64px', height: '64px', borderRadius: '20px', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', border: '1px solid #e2e8f0' }}>
                                                <Plus size={32} />
                                            </div>
                                            <div>
                                                <h4 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: '800', color: '#1e293b' }}>Nouveau Diagnostic</h4>
                                                <p style={{ margin: 0, fontSize: '14px', color: '#64748b', lineHeight: '1.6' }}>Ajouter une nouvelle entrée clinique, spécifier le stade, le grade ou le type de traitement.</p>
                                            </div>
                                            <button className="login-button" style={{ width: 'auto', marginTop: '8px', backgroundColor: '#2563eb' }}>Accéder au formulaire</button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {showDiagForm && (
                                <div style={{
                                    marginTop: showTimeline ? '0' : '32px',
                                    padding: '32px', backgroundColor: '#f8fafc', borderRadius: '24px', border: '1px solid #e2e8f0'
                                }}>
                                    <h4 style={{ margin: '0 0 24px', fontSize: '18px', fontWeight: '800' }}>{editingDiagId ? 'Modifier l\'évènement' : 'Nouvel évènement clinique'}</h4>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', marginBottom: '24px' }}>
                                        <div>
                                            <label className="input-label">Type d'évènement</label>
                                            <select
                                                className="login-input"
                                                style={{ width: '100%' }}
                                                value={diagType}
                                                onChange={(e) => setDiagType(e.target.value as any)}
                                            >
                                                <option value="diagnosis">Diagnostic Initial</option>
                                                <option value="treatment">Protocole de Traitement</option>
                                                <option value="follow-up">Consultation de Suivi</option>
                                            </select>
                                        </div>
                                        {/* ... render form fields based on type ... */}
                                        {diagType === 'diagnosis' && (
                                            <>
                                                <div>
                                                    <label className="input-label">Stade Clinique</label>
                                                    <input className="login-input" placeholder="Ex: T2N0M0" value={diagStage} onChange={e => setDiagStage(e.target.value)} />
                                                </div>
                                                <div>
                                                    <label className="input-label">Grade Histologique</label>
                                                    <select
                                                        className="login-input"
                                                        value={diagGrade}
                                                        onChange={e => setDiagGrade(e.target.value)}
                                                        style={{ width: '100%' }}
                                                    >
                                                        <option value="">Sélectionner un grade...</option>
                                                        <option value="Grade 1 (Bien différencié)">Grade 1 (Bien différencié)</option>
                                                        <option value="Grade 2 (Moyennement différencié)">Grade 2 (Moyennement différencié)</option>
                                                        <option value="Grade 3 (Peu différencié)">Grade 3 (Peu différencié)</option>
                                                        <option value="Grade 4 (Indifférencié/Anaplasique)">Grade 4 (Indifférencié/Anaplasique)</option>
                                                        <option value="GX (Non défini)">GX (Non défini)</option>
                                                    </select>
                                                </div>
                                            </>
                                        )}
                                        {diagType === 'treatment' && (
                                            <>
                                                <div>
                                                    <label className="input-label">Type de Traitement</label>
                                                    <input className="login-input" placeholder="Ex: Chirurgie, Chimio..." value={diagTreatmentType} onChange={e => setDiagTreatmentType(e.target.value)} />
                                                </div>
                                                <div>
                                                    <label className="input-label">Cycle / Phase</label>
                                                    <input className="login-input" placeholder="Ex: Cycle 2/6" value={diagCycle} onChange={e => setDiagCycle(e.target.value)} />
                                                </div>
                                            </>
                                        )}
                                        {diagType === 'follow-up' && (
                                            <>
                                                <div>
                                                    <label className="input-label">Résultat du Suivi</label>
                                                    <input className="login-input" placeholder="Ex: Rémission, Stable..." value={diagOutcome} onChange={e => setDiagOutcome(e.target.value)} />
                                                </div>
                                                <div>
                                                    <label className="input-label">Prochaine Échéance</label>
                                                    <input type="date" className="login-input" value={diagNextAppointment} onChange={e => setDiagNextAppointment(e.target.value)} />
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    <div style={{ marginBottom: '24px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                            <label className="input-label" style={{ margin: 0 }}>Observations Détaillées</label>
                                            <button
                                                type="button"
                                                onClick={() => handleVoiceInput(setDiagContent, setIsRecordingDiag)}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: '8px',
                                                    padding: '6px 12px', borderRadius: '10px',
                                                    border: `1px solid ${isRecordingDiag ? '#ef4444' : '#e2e8f0'}`,
                                                    backgroundColor: isRecordingDiag ? '#fef2f2' : 'white',
                                                    color: isRecordingDiag ? '#ef4444' : '#64748b',
                                                    fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                {isRecordingDiag ? (
                                                    <><MicOff size={14} className="animate-pulse" /> Arrêter</>
                                                ) : (
                                                    <><Mic size={14} /> Dicter</>
                                                )}
                                            </button>
                                        </div>
                                        <textarea
                                            style={{
                                                width: '100%', minHeight: '120px', padding: '16px', borderRadius: '16px',
                                                border: '1px solid #e2e8f0', resize: 'vertical', fontSize: '14px', lineHeight: '1.6',
                                                marginBottom: '20px'
                                            }}
                                            placeholder="Saisissez ici les détails cliniques, symptômes, ou notes spécifiques..."
                                            value={diagContent}
                                            onChange={(e) => setDiagContent(e.target.value)}
                                        />

                                        {records.length > 0 && (
                                            <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '20px' }}>
                                                <div style={{ fontSize: '12px', fontWeight: '800', color: '#64748b', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                    Documents à associer ({selectedRecordIds.length} sélectionnés)
                                                </div>
                                                <div style={{
                                                    display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '12px',
                                                    scrollbarWidth: 'thin', scrollbarColor: '#e2e8f0 transparent'
                                                }}>
                                                    {records.map(record => {
                                                        const isSelected = selectedRecordIds.includes(record.id);
                                                        return (
                                                            <div
                                                                key={record.id}
                                                                onClick={() => {
                                                                    if (isSelected) {
                                                                        setSelectedRecordIds(prev => prev.filter(rid => rid !== record.id));
                                                                    } else {
                                                                        setSelectedRecordIds(prev => [...prev, record.id]);
                                                                    }
                                                                }}
                                                                style={{
                                                                    flex: '0 0 140px', padding: '10px', borderRadius: '14px',
                                                                    border: `2px solid ${isSelected ? '#2563eb' : '#f1f5f9'}`,
                                                                    backgroundColor: isSelected ? '#eff6ff' : 'white',
                                                                    cursor: 'pointer', transition: 'all 0.2s', position: 'relative'
                                                                }}
                                                            >
                                                                {isSelected && (
                                                                    <div style={{
                                                                        position: 'absolute', top: '-8px', right: '-8px',
                                                                        backgroundColor: '#2563eb', color: 'white',
                                                                        borderRadius: '50%', padding: '2px'
                                                                    }}>
                                                                        <Check size={12} strokeWidth={4} />
                                                                    </div>
                                                                )}
                                                                <div style={{
                                                                    height: '80px', backgroundColor: '#f8fafc', borderRadius: '8px',
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px',
                                                                    overflow: 'hidden'
                                                                }}>
                                                                    {record.type === 'image' ? (
                                                                        <img
                                                                            src={`http://localhost:5000/api/medical-records/${record.id}/view`}
                                                                            alt=""
                                                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                                        />
                                                                    ) : (
                                                                        <FileText size={32} color="#94a3b8" />
                                                                    )}
                                                                    <div
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            window.open(`http://localhost:5000/api/medical-records/${record.id}/view`, '_blank');
                                                                        }}
                                                                        style={{
                                                                            position: 'absolute', top: '4px', left: '4px',
                                                                            backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: '6px',
                                                                            padding: '4px', display: 'flex', color: '#64748b', boxSizing: 'border-box'
                                                                        }}
                                                                        title="Ouvrir le document"
                                                                    >
                                                                        <Eye size={12} />
                                                                    </div>
                                                                </div>
                                                                <div style={{
                                                                    fontSize: '11px', fontWeight: '700', color: isSelected ? '#1e40af' : '#475569',
                                                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                                                }}>
                                                                    {record.description}
                                                                </div>
                                                                <div style={{ fontSize: '9px', color: '#94a3b8' }}>
                                                                    {new Date(record.created_at).toLocaleDateString()}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ padding: '20px', backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
                                        <div style={{ fontSize: '12px', fontWeight: '800', color: '#64748b', marginBottom: '16px', textTransform: 'uppercase' }}>Joindre un nouveau document</div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '16px' }}>
                                            <div>
                                                <label className="input-label">Type de document</label>
                                                <select
                                                    className="login-input"
                                                    style={{ width: '100%', height: '42px' }}
                                                    value={diagUploadType}
                                                    onChange={(e) => setDiagUploadType(e.target.value as any)}
                                                >
                                                    <option value="image">Imagerie (Radio/Scan)</option>
                                                    <option value="analysis">Analyse Biologique</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="input-label">Fichier</label>
                                                <input
                                                    type="file"
                                                    onChange={(e) => setDiagFile(e.target.files?.[0] || null)}
                                                    style={{ display: 'block', width: '100%', padding: '8px', fontSize: '12px' }}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="input-label">Description du document</label>
                                            <input
                                                className="login-input"
                                                placeholder="Ex: Scanner Thorax de contrôle"
                                                value={diagFileDesc}
                                                onChange={(e) => setDiagFileDesc(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                        <button
                                            className="login-button"
                                            style={{ width: 'auto', backgroundColor: '#f1f5f9', color: '#64748b' }}
                                            onClick={() => setShowDiagForm(false)}
                                        >
                                            Annuler
                                        </button>
                                        <button
                                            className="login-button"
                                            style={{ width: 'auto', padding: '10px 32px' }}
                                            onClick={handleSaveDiagnostic}
                                            disabled={actionLoading}
                                        >
                                            {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                            Enregistrer les données
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'records' && (
                        <div className="card-container" style={{ padding: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>Documents Médicaux</h3>
                                {(currentUser?.role === 'Médecin' || currentUser?.role === 'Administrateur National') && (
                                    <button
                                        className="login-button"
                                        style={{ width: 'auto', padding: '10px 20px', gap: '8px' }}
                                        onClick={() => setShowRecordForm(true)}
                                    >
                                        <FileUp size={18} /> Ajouter un document
                                    </button>
                                )}
                            </div>

                            {showRecordForm && (
                                <div style={{ marginBottom: '32px', padding: '24px', backgroundColor: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '16px' }}>
                                        <div>
                                            <label className="input-label">Type de document</label>
                                            <select
                                                className="login-input"
                                                style={{ width: '100%' }}
                                                value={recordType}
                                                onChange={(e) => setRecordType(e.target.value as any)}
                                            >
                                                <option value="analysis">Analyse Biologique</option>
                                                <option value="image">Imagerie (Radio/Scan)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="input-label">Fichier</label>
                                            <input
                                                type="file"
                                                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                                style={{ display: 'block', marginTop: '4px' }}
                                            />
                                        </div>
                                    </div>
                                    <div style={{ marginBottom: '16px' }}>
                                        <label className="input-label">Description / Libellé</label>
                                        <input
                                            className="login-input"
                                            placeholder="Ex: Scanner Thoracique - Janvier 2024"
                                            value={recordDesc}
                                            onChange={(e) => setRecordDesc(e.target.value)}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <button
                                            className="login-button"
                                            style={{ width: 'auto' }}
                                            onClick={handleUploadRecord}
                                            disabled={actionLoading || !selectedFile}
                                        >
                                            {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} uploader
                                        </button>
                                        <button
                                            className="login-button"
                                            style={{ width: 'auto', backgroundColor: '#f1f5f9', color: '#64748b' }}
                                            onClick={() => setShowRecordForm(false)}
                                        >
                                            Annuler
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
                                {records.length === 0 ? (
                                    <div style={{
                                        gridColumn: '1/-1', padding: '48px', borderRadius: '20px',
                                        backgroundColor: '#f8fafc', border: '2px dashed #e2e8f0',
                                        textAlign: 'center', color: '#94a3b8'
                                    }}>
                                        <ImageIcon size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                                        <p>Aucun document médical disponible.</p>
                                    </div>
                                ) : records.map(record => (
                                    <div key={record.id} style={{
                                        padding: '20px', borderRadius: '20px', backgroundColor: 'white',
                                        border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '16px',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.03)', position: 'relative'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{
                                                width: '44px', height: '44px', borderRadius: '12px',
                                                backgroundColor: record.type === 'image' ? '#fdf2f8' : '#eff6ff',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: record.type === 'image' ? '#db2777' : '#2563eb'
                                            }}>
                                                {record.type === 'image' ? <ImageIcon size={22} /> : <FileText size={22} />}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {record.type === 'image' ? 'Imagerie Médicale' : 'Analyse Biologique'}
                                                </div>
                                                <div style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <Clock size={12} /> {new Date(record.created_at).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{
                                            width: '100%', height: '140px', borderRadius: '12px', backgroundColor: '#f1f5f9',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'
                                        }}>
                                            {record.type === 'image' ? (
                                                <img
                                                    src={`http://localhost:5000/api/medical-records/${record.id}/view`}
                                                    alt={record.description}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                />
                                            ) : (
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: '#94a3b8' }}>
                                                    <FileText size={40} />
                                                    <span style={{ fontSize: '10px', fontWeight: '800' }}>DOCUMENT PDF</span>
                                                </div>
                                            )}
                                        </div>

                                        <div style={{ fontSize: '13px', color: '#64748b', minHeight: '3em' }}>
                                            {record.description || 'Sans description.'}
                                        </div>

                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <a
                                                href={`http://localhost:5000/api/medical-records/${record.id}/view`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="login-button"
                                                style={{ width: '100%', padding: '10px', fontSize: '12px', gap: '6px' }}
                                            >
                                                <FileText size={16} /> Consulter
                                            </a>
                                            <a
                                                href={`http://localhost:5000/api/medical-records/${record.id}/view`}
                                                download
                                                className="login-button"
                                                style={{ width: '100%', padding: '10px', fontSize: '12px', gap: '6px', backgroundColor: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0' }}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <FileUp size={16} /> Télécharger
                                            </a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Individual Diagnostic Detail Modal */}
            {selectedDiag && (
                <div className="modal-overlay" style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
                }}>
                    <div className="modal-container" style={{
                        maxWidth: '600px', width: '90%', padding: '0',
                        overflow: 'hidden', backgroundColor: 'white',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                    }}>
                        <div style={{ padding: '24px 32px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800' }}>
                                    {selectedDiag.type === 'diagnosis' ? 'Détails du Diagnostic' :
                                        selectedDiag.type === 'treatment' ? 'Détails du Traitement' :
                                            'Détail du Suivi'}
                                </h3>
                                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                                    Enregistré par Dr. {selectedDiag.doctor_name || 'Inconnu'} • {new Date(selectedDiag.date).toLocaleDateString()}
                                </div>
                            </div>
                            <button onClick={() => setSelectedDiag(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8' }}>
                                <X size={24} />
                            </button>
                        </div>

                        <div style={{ padding: '32px', maxHeight: '70vh', overflowY: 'auto', backgroundColor: 'white' }} className="custom-scrollbar">
                            <div style={{
                                display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px',
                                marginBottom: '32px', backgroundColor: '#f8fafc', padding: '24px',
                                borderRadius: '20px', border: '1px solid #e2e8f0'
                            }}>
                                {selectedDiag.type === 'diagnosis' && (
                                    <>
                                        <div>
                                            <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>Stade Clinique</div>
                                            <div style={{ fontSize: '15px', fontWeight: '800', color: '#1e293b' }}>{selectedDiag.stage || 'Non spécifié'}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>Grade Histologique</div>
                                            <div style={{ fontSize: '15px', fontWeight: '800', color: '#1e293b' }}>{selectedDiag.grade || 'Non spécifié'}</div>
                                        </div>
                                    </>
                                )}
                                {selectedDiag.type === 'treatment' && (
                                    <>
                                        <div>
                                            <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>Type de Traitement</div>
                                            <div style={{ fontSize: '15px', fontWeight: '800', color: '#1e293b' }}>{selectedDiag.treatment_type || 'Non spécifié'}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>Cycle / Phase</div>
                                            <div style={{ fontSize: '15px', fontWeight: '800', color: '#1e293b' }}>{selectedDiag.cycle || 'Non spécifié'}</div>
                                        </div>
                                    </>
                                )}
                                {selectedDiag.type === 'follow-up' && (
                                    <>
                                        <div>
                                            <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>Résultat du Suivi</div>
                                            <div style={{ fontSize: '15px', fontWeight: '800', color: '#10b981' }}>{selectedDiag.outcome || 'Non spécifié'}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>Prochain Rendez-vous</div>
                                            <div style={{ fontSize: '15px', fontWeight: '800', color: '#e11d48' }}>
                                                {selectedDiag.next_appointment ? new Date(selectedDiag.next_appointment).toLocaleDateString() : 'Non planifié'}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8', marginBottom: '8px' }}>Observations Cliniques</div>
                                <div style={{
                                    padding: '20px', borderRadius: '16px', backgroundColor: 'white',
                                    border: '1px solid #e2e8f0', color: '#475569', fontSize: '14px',
                                    lineHeight: '1.7', whiteSpace: 'pre-wrap', display: 'block',
                                    overflowWrap: 'anywhere', wordBreak: 'break-word', width: '100%',
                                    overflow: 'visible'
                                }}>
                                    {selectedDiag.content || 'Aucune observation supplémentaire.'}
                                </div>
                            </div>

                            {/* Linked Records Section */}
                            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '24px' }}>
                                <h4 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <ImageIcon size={18} style={{ color: '#2563eb' }} />
                                        Documents Associés
                                    </div>
                                    {(currentUser?.role === 'Médecin' || currentUser?.role === 'Administrateur National') && (
                                        <select
                                            className="login-input"
                                            style={{ padding: '6px 12px', fontSize: '12px', height: 'auto', width: '200px', margin: 0 }}
                                            onChange={(e) => {
                                                if (e.target.value) {
                                                    handleUpdateRecordLink(e.target.value, selectedDiag.id);
                                                }
                                            }}
                                            value=""
                                        >
                                            <option value="" disabled>Lier un document existant...</option>
                                            {records.filter(r => r.diagnostic_id !== selectedDiag.id).map(r => (
                                                <option key={r.id} value={r.id}>
                                                    {r.type === 'image' ? '📸' : '📄'} {new Date(r.created_at).toLocaleDateString()} - {r.description}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </h4>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
                                    {records.filter(r => r.diagnostic_id === selectedDiag.id).length === 0 ? (
                                        <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '12px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px dashed #e2e8f0' }}>
                                            Aucun document associé à ce diagnostic.
                                        </div>
                                    ) : records.filter(r => r.diagnostic_id === selectedDiag.id).map(record => (
                                        <a
                                            key={record.id}
                                            href={`http://localhost:5000/api/medical-records/${record.id}/view`}
                                            target="_blank"
                                            rel="noreferrer"
                                            style={{
                                                textDecoration: 'none', display: 'flex', flexDirection: 'column',
                                                gap: '8px', padding: '12px', borderRadius: '12px',
                                                backgroundColor: '#f8fafc', border: '1px solid #e2e8f0',
                                                transition: 'all 0.2s', position: 'relative'
                                            }}
                                        >
                                            <div style={{
                                                width: '100%', height: '80px', borderRadius: '8px',
                                                backgroundColor: '#f1f5f9', display: 'flex',
                                                alignItems: 'center', justifyContent: 'center',
                                                overflow: 'hidden'
                                            }}>
                                                {record.type === 'image' ? (
                                                    <img
                                                        src={`http://localhost:5000/api/medical-records/${record.id}/view`}
                                                        alt=""
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=Image+Indisponible';
                                                        }}
                                                    />
                                                ) : <FileText size={24} style={{ color: '#94a3b8' }} />}

                                                <div style={{ position: 'absolute', top: '4px', left: '4px', display: 'flex', gap: '4px' }}>
                                                    <a
                                                        href={`http://localhost:5000/api/medical-records/${record.id}/view`}
                                                        download
                                                        onClick={(e) => e.stopPropagation()}
                                                        style={{
                                                            width: '20px', height: '20px', borderRadius: '50%',
                                                            backgroundColor: 'rgba(255,255,255,0.9)', border: 'none',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            cursor: 'pointer', color: '#64748b', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                                        }}
                                                        title="Télécharger"
                                                    >
                                                        <FileUp size={10} />
                                                    </a>
                                                </div>

                                                {(currentUser?.role === 'Médecin' || currentUser?.role === 'Administrateur National') && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            handleUpdateRecordLink(record.id, null);
                                                        }}
                                                        style={{
                                                            position: 'absolute', top: '4px', right: '4px',
                                                            width: '20px', height: '20px', borderRadius: '50%',
                                                            backgroundColor: 'rgba(255,255,255,0.9)', border: 'none',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            cursor: 'pointer', color: '#ef4444', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                                        }}
                                                        title="Délier ce document"
                                                    >
                                                        <X size={10} />
                                                    </button>
                                                )}
                                            </div>
                                            <span style={{
                                                fontSize: '11px', fontWeight: '700', color: '#475569',
                                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                            }}>
                                                {record.description}
                                            </span>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div style={{ padding: '20px 32px', borderTop: '1px solid #f1f5f9', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '12px', backgroundColor: '#f8fafc' }}>
                            {isOwner && (
                                <button
                                    className="login-button"
                                    style={{ backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #dbeafe', width: 'auto' }}
                                    onClick={() => {
                                        setDiagContent(selectedDiag.content);
                                        setDiagType(selectedDiag.type || 'diagnosis');
                                        setDiagStage(selectedDiag.stage || '');
                                        setDiagGrade(selectedDiag.grade || '');
                                        setDiagTreatmentType(selectedDiag.treatment_type || '');
                                        setDiagCycle(selectedDiag.cycle || '');
                                        setDiagOutcome(selectedDiag.outcome || '');
                                        setDiagNextAppointment(selectedDiag.next_appointment ? new Date(selectedDiag.next_appointment).toISOString().split('T')[0] : '');
                                        setEditingDiagId(selectedDiag.id);
                                        setShowDiagForm(true);
                                        setSelectedDiag(null);
                                    }}
                                >
                                    <Edit2 size={18} /> Modifier
                                </button>
                            )}
                            <button
                                className="login-button"
                                style={{ width: 'auto', backgroundColor: '#f1f5f9', color: '#475569' }}
                                onClick={() => setSelectedDiag(null)}
                            >
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* RCP Chat Side Panel */}
            {showChat && currentUser?.role === 'Médecin' && (
                <div style={{
                    position: 'fixed', top: 0, right: 0, bottom: 0, width: '450px',
                    backgroundColor: 'white', boxShadow: '-10px 0 50px rgba(0,0,0,0.1)',
                    zIndex: 1000, display: 'flex', flexDirection: 'column',
                    animation: 'slideInRight 0.3s ease-out'
                }}>
                    {/* Chat Header */}
                    <div style={{
                        padding: '24px', borderBottom: '1px solid #f1f5f9',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        backgroundColor: '#0f172a', color: 'white'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.1)' }}>
                                <MessageSquare size={20} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800' }}>Discussion RCP</h3>
                                <p style={{ margin: 0, fontSize: '11px', opacity: 0.7 }}>Échangeez vos points de vue médicaux</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowChat(false)}
                            style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'white', opacity: 0.5 }}
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '24px', backgroundColor: '#f8fafc' }}>
                        {rcpMessages.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '100px 40px', color: '#94a3b8' }}>
                                <MessageSquare size={48} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
                                <p style={{ fontSize: '14px', fontWeight: '600' }}>Aucun message pour le moment.</p>
                                <p style={{ fontSize: '12px' }}>Soyez le premier à partager votre avis sur ce cas.</p>
                            </div>
                        ) : (
                            rcpMessages.map((msg) => {
                                const isMe = msg.doctor_id === currentUser?.id;
                                return (
                                    <div key={msg.id} style={{
                                        display: 'flex', flexDirection: 'column',
                                        alignItems: isMe ? 'flex-end' : 'flex-start',
                                        marginBottom: '20px'
                                    }}>
                                        <div style={{
                                            maxWidth: '85%', padding: '12px 16px', borderRadius: '16px',
                                            fontSize: '14px', lineHeight: '1.5',
                                            backgroundColor: isMe ? '#2563eb' : 'white',
                                            color: isMe ? 'white' : '#1e293b',
                                            boxShadow: isMe ? '0 4px 12px rgba(37,99,235,0.2)' : '0 2px 8px rgba(0,0,0,0.05)',
                                            border: isMe ? 'none' : '1px solid #e2e8f0',
                                            borderBottomRightRadius: isMe ? '4px' : '16px',
                                            borderBottomLeftRadius: isMe ? '16px' : '4px'
                                        }}>
                                            {msg.content}
                                        </div>
                                        <div style={{
                                            fontSize: '10px', color: '#94a3b8', marginTop: '6px',
                                            fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em'
                                        }}>
                                            {isMe ? 'Vous' : msg.doctor_name} • {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Chat Input */}
                    <div style={{ padding: '24px', borderTop: '1px solid #f1f5f9', backgroundColor: 'white' }}>
                        <div style={{ position: 'relative' }}>
                            <textarea
                                placeholder="Tapez votre message ici..."
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendChatMessage();
                                    }
                                }}
                                style={{
                                    width: '100%', padding: '16px 50px 16px 16px', borderRadius: '16px',
                                    border: '1px solid #e2e8f0', backgroundColor: '#f8fafc',
                                    fontSize: '14px', resize: 'none', height: '100px',
                                    fontFamily: 'inherit', outline: 'none', transition: 'all 0.2s'
                                }}
                            />
                            <button
                                onClick={() => handleVoiceInput(setChatInput, setIsRecordingChat)}
                                style={{
                                    position: 'absolute', bottom: '12px', right: '56px',
                                    width: '36px', height: '36px', borderRadius: '10px',
                                    backgroundColor: isRecordingChat ? '#fef2f2' : '#f1f5f9',
                                    color: isRecordingChat ? '#ef4444' : '#64748b',
                                    border: `1px solid ${isRecordingChat ? '#ef4444' : 'transparent'}`,
                                    cursor: 'pointer', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
                                }}
                                title="Dicter le message"
                            >
                                {isRecordingChat ? <MicOff size={18} className="animate-pulse" /> : <Mic size={18} />}
                            </button>
                            <button
                                onClick={handleSendChatMessage}
                                disabled={!chatInput.trim()}
                                style={{
                                    position: 'absolute', bottom: '12px', right: '12px',
                                    width: '36px', height: '36px', borderRadius: '10px',
                                    backgroundColor: chatInput.trim() ? '#2563eb' : '#f1f5f9',
                                    color: chatInput.trim() ? 'white' : '#94a3b8',
                                    border: 'none', cursor: 'pointer', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
                                }}
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes slideInRight {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                }
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default PatientDetailsPage;
