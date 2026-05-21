import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, User, Activity, FileText, Image as ImageIcon,
    Plus, Clipboard, Calendar, Loader2, Save, Edit2,
    FileUp, Building, X, Shield, UserCheck, Stethoscope,
    CheckCircle, Clock, Check, MessageSquare, Send, Eye,
    Mic, MicOff, AlertCircle, FlaskConical, TrendingUp,
    ChevronLeft, ChevronRight
} from 'lucide-react';
import axios from 'axios';
import api from '../services/api';
import LabResultForm from '../components/LabResultForm';
import BodyMapViewer from '../components/BodyMap/BodyMapViewer';
import CancerDiagnosisForm from '../components/BodyMap/CancerDiagnosisForm';
import OrganDetailView from '../components/BodyMap/OrganDetailView';
import { RESULT_TEMPLATES } from '../constants/resultTemplates';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    AreaChart, Area, XAxis, YAxis, Tooltip, 
    ResponsiveContainer, CartesianGrid, ReferenceArea, ReferenceLine 
} from 'recharts';

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
    owner_hospital_id?: string;
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
    owner_hospital_id?: string;
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
    owner_hospital_id?: string;
}

interface Message {
    id: string;
    patient_id: string;
    doctor_id: string;
    doctor_name: string;
    content: string;
    created_at: string;
}

// Constants for Reference Ranges
const NORMAL_RANGES: Record<string, { min: number; max: number }> = {
    "Hémoglobine": { min: 12, max: 16 },
    "Leucocytes": { min: 4000, max: 10000 },
    "Plaquettes": { min: 150000, max: 450000 },
    "Créatinine": { min: 6, max: 12 },
    "Glycémie": { min: 0.7, max: 1.1 },
    "PSA": { min: 0, max: 4 },
    "CA 125": { min: 0, max: 35 },
    "CEA": { min: 0, max: 5 },
    "AFP": { min: 0, max: 10 }
};

const getBiomarkerStatus = (name: string, value: number) => {
    const range = NORMAL_RANGES[name.replace(/離/g, '').trim()];
    if (!range) return { label: 'Inconnu', color: '#64748b' };
    if (value < range.min) return { label: 'Bas', color: '#f59e0b' };
    if (value > range.max) return { label: 'Élevé', color: '#ef4444' };
    return { label: 'Normal', color: '#10b981' };
};

const PatientDetailsPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    // Print Modal & Config
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [printConfig, setPrintConfig] = useState({
        info: true,
        tumors: true,
        allDiagnostics: true,
        selectedDiagnostics: [] as string[],
        allRecords: true,
        selectedRecords: [] as string[],
        allLabResults: true,
        selectedLabResults: [] as string[]
    });
    const [isPrinting, setIsPrinting] = useState(false);

    useEffect(() => {
        if (isPrinting) {
            // Give React enough time to render complex components like LabResultForm
            const timer = setTimeout(() => {
                window.print();
                // We keep a small delay after print to reset the state
                const resetTimer = setTimeout(() => {
                    setIsPrinting(false);
                    setShowPrintModal(false);
                }, 1000);
                return () => clearTimeout(resetTimer);
            }, 3000); // Increased to 3s for complex medical forms
            return () => clearTimeout(timer);
        }
    }, [isPrinting]);

    // Lab Request states
    const [labRequests, setLabRequests] = useState<any[]>([]);
    const [laboratories, setLaboratories] = useState<any[]>([]);
    const [matchingLabs, setMatchingLabs] = useState<any[]>([]);
    const [isMatchingLabs, setIsMatchingLabs] = useState(false);
    const [bilanPackages, setBilanPackages] = useState<any[]>([]);
    const [selectedPhase, setSelectedPhase] = useState<'initial' | 'confirmation' | 'extension' | 'suivi'>('initial');
    const [selectedLabId, setSelectedLabId] = useState('');
    const [selectedTests, setSelectedTests] = useState<string[]>([]);
    const [labNotes, setLabNotes] = useState('');
    const [showLabRequestForm, setShowLabRequestForm] = useState(false);
    const [labEntries, setLabEntries] = useState<any[]>([]);
    const [hospitalLinks, setHospitalLinks] = useState<any[]>([]);
    const [selectedSectorId, setSelectedSectorId] = useState<string | 'all'>('all'); // Filter for multi-hospital sectors

    const [patient, setPatient] = useState<Patient | null>(null);
    const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
    const [cancerDiagnoses, setCancerDiagnoses] = useState<any[]>([]);
    const [showCancerDiagnosisForm, setShowCancerDiagnosisForm] = useState(false);
    const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
    const [selectedRegionDiagnoses, setSelectedRegionDiagnoses] = useState<any[]>([]);
    const [records, setRecords] = useState<MedicalRecord[]>([]);
    const [tumors, setTumors] = useState<Tumor[]>([]);
    const [subtypes, setSubtypes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'info' | 'diagnostics' | 'records' | 'deposit' | 'tumors' | 'lab_results' | 'lab_requests'>('info');
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
        basis_of_diagnosis: '',
        stage: '',
        grade: '',
        date_of_incidence: '',
        status: 'active'
    });

    // Package Editing states
    const [showPackageEditor, setShowPackageEditor] = useState(false);
    const [editingPackage, setEditingPackage] = useState<any>(null);
    const [packageEditForm, setPackageEditForm] = useState({
        examens_obligatoires: '',
        examens_optionnels: '',
        note_clinique: ''
    });
    const [isSavingPackage, setIsSavingPackage] = useState(false);

    const [isRecordingDiag, setIsRecordingDiag] = useState(false);
    const [isRecordingChat, setIsRecordingChat] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const recognitionRef = useRef<any>(null);

    // --- TIMELINE & BIOMARKER DRAG-TO-SCROLL LOGIC ---
    const timelineRef = useRef<HTMLDivElement>(null);
    const biomarkerRef = useRef<HTMLDivElement>(null);
    const [isDraggingTimeline, setIsDraggingTimeline] = useState(false);
    const [isDraggingBiomarker, setIsDraggingBiomarker] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [selectedBiomarker, setSelectedBiomarker] = useState<any>(null);

    const handleMouseDown = (e: React.MouseEvent, ref: React.RefObject<HTMLDivElement>, setter: (val: boolean) => void) => {
        if (!ref.current) return;
        setter(true);
        setStartX(e.pageX - ref.current.offsetLeft);
        setScrollLeft(ref.current.scrollLeft);
    };

    const handleMouseMove = (e: React.MouseEvent, ref: React.RefObject<HTMLDivElement>, isDragging: boolean) => {
        if (!isDragging || !ref.current) return;
        e.preventDefault();
        const x = e.pageX - ref.current.offsetLeft;
        const walk = (x - startX) * 2;
        ref.current.scrollLeft = scrollLeft - walk;
    };

    const stopDragging = () => {
        setIsDraggingTimeline(false);
        setIsDraggingBiomarker(false);
    };

    const scrollContainer = (ref: React.RefObject<HTMLDivElement>, direction: 'left' | 'right') => {
        if (!ref.current) return;
        const scrollAmount = 400;
        ref.current.scrollTo({
            left: ref.current.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount),
            behavior: 'smooth'
        });
    };

    // Get latest tumor data for sidebar display
    const latestTumor = tumors.length > 0 ? tumors[0] : null;

    // Multi-sector context helper
    const activeSector = hospitalLinks.find(l => l.id === selectedSectorId);
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
        console.log("PatientDetailsPage: fetchData triggering for ID:", id);
        fetchData();
    }, [id]);

    useEffect(() => {
        if (activeTab === 'tumors' && patient?.cancer_type) {
            fetchSubtypes(patient.cancer_type);
        }
    }, [activeTab, patient?.cancer_type]);

    const fetchSubtypes = async (category: string) => {
        try {
            const res = await api.get(`/api/reference/cancer-subtypes?category=${category}`);
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
            const response = await api.get(`/api/patients/${id}`);
            setPatient(response.data.patient);
            setDiagnostics(response.data.diagnostics);
            setRecords(response.data.medical_records);
            setTumors(response.data.tumors || []);
            setIsOwner(response.data.isOwner);

            // Also fetch chats
            const chatRes = await api.get(`/api/patients/${id}/chats`);
            setRcpMessages(chatRes.data);

            // Fetch Lab Requests
            try {
                const labReqRes = await api.get(`/api/lab-requests/patient/${id}`);
                setLabRequests(labReqRes.data);
            } catch (err) { console.error("Error fetching lab requests", err); }

            // Fetch Lab Entries
            try {
                const labEntriesRes = await api.get(`/api/patients/${id}/lab-entries`);
                setLabEntries(labEntriesRes.data);
            } catch (err) { console.error("Error fetching lab entries", err); }

            try {
                const diagRes = await api.get(`/api/patients/${id}/diagnosis`);
                setCancerDiagnoses(diagRes.data);
            } catch (err) { console.error("Error fetching cancer diagnoses", err); }

            try {
                const linksRes = await api.get(`/api/patients/${id}/hospital-links`);
                const links = linksRes.data || [];
                setHospitalLinks(links);

                // Safe User Identification
                const userJson = localStorage.getItem('user');
                const userObj = userJson ? JSON.parse(userJson) : null;

                if (userObj?.workplace_id) {
                    const userLink = links.find((l: any) => l.hospital_id === userObj.workplace_id);
                    if (userLink) {
                        setSelectedSectorId(userLink.id);
                    } else {
                        setSelectedSectorId('all');
                    }
                } else {
                    setSelectedSectorId('all');
                }

                if (userObj?.role === 'Médecin') {
                    const labsRes = await api.get('/api/laboratories');
                    setLaboratories(labsRes.data);

                    if (response.data.patient?.cancer_type) {
                        fetchPackages(response.data.patient.cancer_type, selectedPhase);
                    }
                }
            } catch (err) {
                console.error("Error fetching supplementary context data", err);
            }
        } catch (error) {
            console.error("Fetch Data Error:", error);
            alert("Erreur lors de la récupération des données.");
        } finally {
            setLoading(false);
        }
    };

    const fetchPackages = async (category: string, phase: string) => {
        try {
            const res = await api.get(`/api/bilan-packages?cancer_nom=${encodeURIComponent(category)}&phase=${phase}`);
            setBilanPackages(res.data);

            // Automatically select mandatory tests if it's the first time
            if (res.data.length > 0) {
                const pkg = res.data[0];
                const mandatory = pkg.examens_obligatoires || [];
                setSelectedTests(mandatory);
            } else {
                setSelectedTests([]);
            }
        } catch (error) {
            console.error("Error fetching packages:", error);
        }
    };

    const handleUpdatePackage = async () => {
        if (!editingPackage) return;
        setIsSavingPackage(true);
        try {
            const updatedData = {
                examens_obligatoires: packageEditForm.examens_obligatoires.split('\n').map(s => s.trim()).filter(s => s),
                examens_optionnels: packageEditForm.examens_optionnels.split('\n').map(s => s.trim()).filter(s => s),
                note_clinique: packageEditForm.note_clinique
            };

            await api.put(`/api/bilan-packages/${editingPackage.id}`, updatedData);

            // Refresh
            if (patient?.cancer_type) {
                await fetchPackages(patient.cancer_type, selectedPhase);
            }
            setShowPackageEditor(false);
            setEditingPackage(null);
            alert("Protocole mis à jour avec succès.");
        } catch (error) {
            console.error("Error updating package:", error);
            alert("Erreur lors de la mise à jour du protocole.");
        } finally {
            setIsSavingPackage(false);
        }
    };

    useEffect(() => {
        if (patient?.cancer_type && showLabRequestForm) {
            fetchPackages(patient.cancer_type, selectedPhase);
        }
    }, [selectedPhase, patient?.cancer_type, showLabRequestForm]);

    useEffect(() => {
        const matchLaboratories = async () => {
            if (selectedTests.length === 0) {
                setMatchingLabs(laboratories);
                return;
            }
            setIsMatchingLabs(true);
            try {
                const res = await api.post('/api/laboratories/match', { tests: selectedTests });
                setMatchingLabs(res.data);

                // Reset selected lab if it's no longer in the matching list
                if (selectedLabId && !res.data.find((l: any) => l.id === selectedLabId)) {
                    setSelectedLabId('');
                }
            } catch (error) {
                console.error("Error matching labs:", error);
            } finally {
                setIsMatchingLabs(false);
            }
        };

        if (showLabRequestForm) {
            matchLaboratories();
        }
    }, [selectedTests, laboratories, showLabRequestForm]);

    const handleToggleRcp = async () => {
        if (!patient) return;
        setRcpActionLoading(true);
        try {
            const newStatus = !patient.rcp_active;
            await api.patch(`/api/patients/${id}/rcp`, { active: newStatus });
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
            const response = await api.post(`/api/rcp-chats`, { patient_id: id, content: chatInput });
            setRcpMessages([...rcpMessages, response.data]);
            setChatInput('');
        } catch (error) {
            console.error("Send Chat Error:", error);
            alert("Erreur lors de l'envoi du message.");
        }
    };
    // --- ENCODING FIXER (Safeguard against Mojibake) ---
    const decodeEncoding = (str: string) => {
        if (!str) return '';

        // If it already contains accented characters, it's probably fine
        if (/[éàèôûîâêùç]/.test(str)) return str;

        // Detect common UTF-8 Mojibake
        if (/Ã[©à¨ôûîâêùç]/.test(str)) {
            return str.replace(/Ã©/g, 'é')
                .replace(/Ã /g, 'à')
                .replace(/Ã¨/g, 'è')
                .replace(/Ã´/g, 'ô')
                .replace(/Ã»/g, 'û')
                .replace(/Ã®/g, 'î')
                .replace(/Ã¢/g, 'â')
                .replace(/Ãª/g, 'ê')
                .replace(/Ã¹/g, 'ù')
                .replace(/Ã§/g, 'ç')
                .replace(/â€™/g, "'");
        }

        // Fix the specific '離' prefix bug (mojibake from certain excel exports)
        if (str.includes('離')) {
            return str.replace(/離/g, '').trim();
        }

        try {
            // Only attempt if it looks like raw Latin-1 bytes
            return decodeURIComponent(escape(str));
        } catch (e) {
            return str;
        }
    };

    // --- TIMELINE LOGIC ---
    const getTimelineEvents = () => {
        const events: any[] = [];

        // 1. Tumors (Inception)
        tumors.forEach(t => {
            events.push({
                id: `tumor-${t.id}`,
                date: new Date(t.created_at),
                type: 'tumor',
                title: t.category ? `${t.category} - ${t.sub_type}` : t.topography_label,
                subtitle: `Stade: ${t.stage || 'N/A'}`,
                color: '#ef4444',
                icon: <Activity size={14} />,
                ref: 'tumors'
            });
        });

        // 2. Diagnostics
        diagnostics.forEach(d => {
            events.push({
                id: `diag-${d.id}`,
                date: new Date(d.date),
                type: 'diag',
                title: d.type === 'treatment' ? 'Traitement' : d.type === 'follow-up' ? 'Suivi' : 'Diagnostic',
                subtitle: decodeEncoding((d.content || '').substring(0, 40) + (d.content && d.content.length > 40 ? '...' : '')),
                color: '#3b82f6',
                icon: <Stethoscope size={14} />,
                ref: 'diagnostics'
            });
        });

        // 3. Lab Entries
        labEntries.forEach(le => {
            if (!le.test_name && !le.result_value) return; // Skip empty entries
            events.push({
                id: `lab-${le.id}`,
                date: new Date(le.created_at || new Date()),
                type: 'lab',
                title: decodeEncoding(le.test_name || 'Analyse Médicale'),
                subtitle: `${le.result_value || 'N/A'} ${le.unit || ''}`,
                color: '#8b5cf6',
                icon: <Plus size={14} />,
                ref: 'lab_results'
            });
        });

        // 4. Records (Imaging)
        records.forEach(r => {
            events.push({
                id: `record-${r.id}`,
                date: new Date(r.created_at),
                type: 'record',
                title: r.type === 'image' ? 'Imagerie' : 'Analyse',
                subtitle: decodeEncoding(r.description),
                color: '#f59e0b',
                icon: <ImageIcon size={14} />,
                ref: 'records'
            });
        });

        return events.sort((a, b) => b.date.getTime() - a.date.getTime());
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
                date_of_incidence: new Date().toISOString().split('T')[0],
                status: 'active'
            });
            fetchData();
        } catch (error: any) {
            console.error("Save Tumor Error:", error);
            const msg = error.response?.data?.error || "Erreur lors de l'enregistrement de la tumeur.";
            alert(msg);
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

    async function handleCreateLabRequest() {
        if (!selectedLabId || selectedTests.length === 0) {
            alert("Veuillez sélectionner un laboratoire et au moins un examen.");
            return;
        }
        console.log("Creating Lab Request for patient:", id, "Lab:", selectedLabId);
        setActionLoading(true);
        try {
            const token = localStorage.getItem('token');
            const selectedLab = laboratories.find(l => l.id === selectedLabId);
            const res = await axios.post('http://localhost:5000/api/lab-requests', {
                patient_id: id,
                laboratory_id: selectedLabId,
                laboratory_name: selectedLab ? selectedLab.name : '',
                tests_requested: selectedTests,
                notes: labNotes
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setLabRequests([res.data, ...labRequests]);
            setShowLabRequestForm(false);
            setSelectedLabId('');
            setSelectedTests([]);
            setLabNotes('');
        } catch (error: any) {
            console.error("Create Lab Request Error:", error);
            const errorMsg = error.response?.data?.details || error.message;
            alert("Erreur lors de la création de la demande: " + errorMsg);
        } finally {
            setActionLoading(false);
        }
    }

    if (loading) {
        return <PatientDetailsSkeleton />;
    }

    if (!patient) return <div>Patient non trouvé.</div>;

    return (
        <div className="dashboard-page animate-fadeIn" style={{ padding: '32px' }}>
            {/* Styles pour le rendu PDF (RCP) */}
            <style>
                {`
                @media print {
                    body { 
                        background-color: white !important; 
                        -webkit-print-color-adjust: exact !important; 
                        print-color-adjust: exact !important; 
                        color: #000 !important;
                    }
                    .print-hide { display: none !important; }
                    .dashboard-page { padding: 0 !important; margin: 0 !important; width: 100% !important; }
                    .print-container { width: 100% !important; margin: 0 !important; }
                    nav, .top-nav, .sidebar, button, .lucide { display: none !important; }
                    ::-webkit-scrollbar { display: none; }
                    
                    .card-container { 
                        box-shadow: none !important; 
                        border: 1px solid #e2e8f0 !important; 
                        break-inside: avoid; 
                    }
                    
                    .print-section {
                        page-break-inside: avoid;
                        margin-bottom: 24px;
                        border-bottom: 1px solid #eee;
                        padding-bottom: 16px;
                    }

                    h1, h2, h3, h4 { color: #000 !important; page-break-after: avoid; }
                    
                    @page { 
                        margin: 1.5cm; 
                        size: A4 portrait;
                    }
                }
                `}
            </style>

            {/* Custom Print Layout */}
            {isPrinting && (
                <div style={{ backgroundColor: 'white', color: 'black', fontFamily: 'sans-serif', padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #000', paddingBottom: '20px', marginBottom: '20px' }}>
                        <div>
                            <h2 style={{ margin: '0 0 8px' }}>Dossier RCP - {patient.name} {patient.last_name}</h2>
                            <p style={{ margin: '4px 0' }}><strong>ID National:</strong> {patient.national_id}</p>
                            <p style={{ margin: '4px 0' }}><strong>CANCER:</strong> {patient.cancer_type}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ margin: '4px 0' }}><strong>Date d'impression:</strong> {new Date().toLocaleDateString()}</p>
                            {currentUser && <p style={{ margin: '4px 0' }}><strong>Imprimé par:</strong> {currentUser.name}</p>}
                        </div>
                    </div>

                    {printConfig.info && (
                        <div className="print-section">
                            <h3 style={{ borderBottom: '2px solid #000', paddingBottom: '8px', marginBottom: '16px', fontSize: '18px' }}>Informations Administratives</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px' }}>
                                <div><strong>ID National:</strong> {patient.national_id}</div>
                                <div><strong>Âge:</strong> {patient.age} ans</div>
                                <div><strong>Sexe:</strong> {patient.gender === 'male' ? 'Homme' : 'Femme'}</div>
                                <div><strong>Groupe Sanguin:</strong> {patient.blood_type}</div>
                                <div><strong>Tél:</strong> {patient.phone_primary || 'Non renseigné'}</div>
                                <div><strong>Wilaya:</strong> {patient.wilaya_residence || 'Non renseignée'}</div>
                                <div style={{ gridColumn: '1 / -1' }}><strong>Adresse:</strong> {patient.full_address || 'Non renseignée'}</div>
                            </div>
                        </div>
                    )}

                    {printConfig.tumors && tumors.length > 0 && (
                        <div className="print-section">
                            <h3 style={{ borderBottom: '2px solid #000', paddingBottom: '8px', marginBottom: '16px', fontSize: '18px' }}>Données Oncologiques (Tumeurs)</h3>
                            {tumors.map((t: any) => (
                                <div key={t.id} style={{ marginBottom: '16px', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
                                        <div style={{ gridColumn: '1 / -1' }}><strong>Topographie:</strong> [{t.topography_code}] {t.topography_label}</div>
                                        <div style={{ gridColumn: '1 / -1' }}><strong>Morphologie:</strong> [{t.morphology_code}] {t.morphology_label}</div>
                                        <div><strong>Stade:</strong> {t.stage || 'N/A'}</div>
                                        <div><strong>Grade:</strong> {t.grade || 'N/A'}</div>
                                        <div><strong>Diagnostic:</strong> {t.basis_of_diagnosis}</div>
                                        <div><strong>Incidence:</strong> {new Date(t.date_of_incidence).toLocaleDateString()}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {(printConfig.allDiagnostics || printConfig.selectedDiagnostics.length > 0) && (
                        <div className="print-section">
                            <h3 style={{ borderBottom: '2px solid #000', paddingBottom: '8px', marginBottom: '16px', fontSize: '18px' }}>Diagnostics & Traitements</h3>
                            {diagnostics.filter((d: any) => printConfig.allDiagnostics || printConfig.selectedDiagnostics.includes(d.id)).map((d: any) => (
                                <div key={d.id} style={{ marginBottom: '15px', padding: '15px', backgroundColor: '#f9f9f9', borderLeft: '4px solid #2563eb', pageBreakInside: 'avoid' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                        <strong>{new Date(d.date).toLocaleDateString()} - {d.doctor_name}</strong>
                                        <span style={{ textTransform: 'capitalize', fontSize: '12px', fontWeight: 'bold' }}>{d.type || 'Diagnostic'}</span>
                                    </div>
                                    <p style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '14px' }}>{d.content}</p>
                                    {(d.stage || d.grade || d.treatment_type) && (
                                        <div style={{ marginTop: '10px', fontSize: '12px', color: '#475569' }}>
                                            {d.stage && <span style={{ marginRight: '12px' }}><strong>Stade:</strong> {d.stage} </span>}
                                            {d.grade && <span style={{ marginRight: '12px' }}><strong>Grade:</strong> {d.grade} </span>}
                                            {d.treatment_type && <span><strong>Traitement:</strong> {d.treatment_type}</span>}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {(printConfig.allRecords || printConfig.selectedRecords.length > 0) && (
                        <div className="print-section">
                            <h3 style={{ borderBottom: '2px solid #000', paddingBottom: '8px', marginBottom: '16px', fontSize: '18px' }}>Documents & Imagerie</h3>
                            {records.filter((r: any) => printConfig.allRecords || printConfig.selectedRecords.includes(r.id)).map((r: any) => (
                                <div key={r.id} style={{ marginBottom: '12px', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', pageBreakInside: 'avoid' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                        <strong>{new Date(r.created_at).toLocaleDateString()} - {r.doctor_name}</strong>
                                        <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b' }}>{r.type}</span>
                                    </div>
                                    <p style={{ margin: 0, fontSize: '13px', color: '#475569' }}><strong>Description:</strong> {r.description}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {(printConfig.allLabResults || printConfig.selectedLabResults.length > 0) && labEntries.length > 0 && (
                        <div className="print-section">
                            <h3 style={{ borderBottom: '2px solid #000', paddingBottom: '8px', marginBottom: '16px', fontSize: '18px' }}>Résultats de Laboratoire</h3>
                            {labEntries.filter((le: any) => printConfig.allLabResults || printConfig.selectedLabResults.includes(le.id)).map((le: any) => (
                                <div key={le.id} style={{ marginBottom: '24px', padding: '16px', border: '1px solid #e2e8f0', borderRadius: '12px', pageBreakInside: 'avoid' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #edf2f7', paddingBottom: '8px', marginBottom: '12px' }}>
                                        <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#1e293b' }}>{le.test_name}</span>
                                        <span style={{ fontSize: '12px', color: '#64748b' }}>{le.laboratory_name} | {le.created_at ? new Date(le.created_at).toLocaleDateString() : ''}</span>
                                    </div>

                                    <div style={{ padding: '4px 0' }}>
                                        {RESULT_TEMPLATES[le.template_id] ? (
                                            <LabResultForm
                                                template={RESULT_TEMPLATES[le.template_id]}
                                                initialData={le.result_data}
                                                onSave={() => { }}
                                                readOnly={true}
                                            />
                                        ) : (
                                            <div style={{ color: '#ef4444', fontSize: '13px' }}>Template non configuré (ID: {le.template_id})</div>
                                        )}
                                    </div>
                                    {(le.is_abnormal || le.notes) && (
                                        <div style={{ marginTop: '12px', padding: '8px', backgroundColor: le.is_abnormal ? '#fff1f2' : '#f8fafc', borderRadius: '6px', border: `1px solid ${le.is_abnormal ? '#fecdd3' : '#e2e8f0'}` }}>
                                            {le.is_abnormal && <div style={{ color: '#e11d48', fontWeight: 'bold', fontSize: '12px', marginBottom: '4px' }}>⚠️ RÉSULTAT ANORMAL</div>}
                                            {le.notes && <div style={{ fontSize: '12px', color: '#475569' }}><strong>Note:</strong> {le.notes}</div>}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div className={isPrinting ? "print-hide" : ""}>
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

                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px' }} className="print-hide">
                        <button
                            onClick={() => setShowPrintModal(true)}
                            style={{
                                padding: '10px 20px', borderRadius: '12px', border: '1px solid #e2e8f0',
                                backgroundColor: 'white', color: '#0f172a', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '8px',
                                fontWeight: '700', fontSize: '14px', transition: 'all 0.2s',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                            }}
                        >
                            <FileText size={18} />
                            Exporter RCP (PDF)
                        </button>

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

                {/* Cross-Hospital Partnership Banner */}
                {hospitalLinks.length > 1 && (
                    <div style={{
                        marginBottom: '32px', padding: '24px', borderRadius: '24px',
                        backgroundColor: '#f8fafc', border: '1px solid #e2e8f0',
                        display: 'flex', alignItems: 'center', gap: '20px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                        animation: 'fadeInUp 0.5s ease'
                    }}>
                        <div style={{
                            width: '56px', height: '56px', borderRadius: '16px',
                            backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#2563eb', border: '1px solid #dbeafe'
                        }}>
                            <Building size={28} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <h4 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: '800', color: '#1e293b' }}>
                                Prise en Charge Multi-Établissements
                            </h4>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                                {hospitalLinks.map((link: any) => {
                                    const isActive = selectedSectorId === link.id;
                                    return (
                                        <button
                                            key={link.id}
                                            onClick={() => setSelectedSectorId(link.id)}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '8px',
                                                padding: '8px 16px', borderRadius: '12px',
                                                backgroundColor: isActive ? '#2563eb' : 'white',
                                                border: isActive ? '1px solid #2563eb' : '1px solid #e2e8f0',
                                                fontSize: '13px', fontWeight: '700',
                                                color: isActive ? 'white' : '#475569',
                                                cursor: 'pointer', transition: 'all 0.2s',
                                                boxShadow: isActive ? '0 4px 12px rgba(37, 99, 235, 0.2)' : 'none'
                                            }}
                                        >
                                            <div style={{
                                                width: '8px', height: '8px', borderRadius: '50%',
                                                backgroundColor: isActive ? 'white' : (link.hospital_id === currentUser?.workplace_id ? '#10b981' : '#3b82f6')
                                            }} />
                                            {link.hospital_name} : <span style={{ fontWeight: '800', opacity: isActive ? 1 : 0.8 }}>{link.cancer_type}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <button
                            onClick={() => setSelectedSectorId('all')}
                            style={{
                                padding: '10px 20px', borderRadius: '14px',
                                backgroundColor: selectedSectorId === 'all' ? '#ecfdf5' : 'white',
                                border: '1px solid',
                                borderColor: selectedSectorId === 'all' ? '#d1fae5' : '#e2e8f0',
                                color: selectedSectorId === 'all' ? '#065f46' : '#64748b',
                                fontSize: '13px', fontWeight: '800',
                                cursor: 'pointer', transition: 'all 0.2s',
                                display: 'flex', alignItems: 'center', gap: '8px'
                            }}
                        >
                            {selectedSectorId === 'all' && <Check size={16} />}
                            Dossier Consolidé
                        </button>
                    </div>
                )}

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
                    <div style={{ minWidth: 0 }}>
                        {/* JOURNEY TIMELINE (Premium Feature) */}
                        <div style={{
                            marginBottom: '32px',
                            padding: '24px',
                            backgroundColor: 'white',
                            borderRadius: '24px',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)',
                            overflow: 'hidden',
                            position: 'relative'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <TrendingUp size={22} style={{ color: '#2563eb' }} />
                                    Patient Journey Timeline
                                </h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        <button
                                            onClick={() => scrollContainer(timelineRef, 'left')}
                                            style={{
                                                padding: '6px', borderRadius: '8px', border: '1px solid #e2e8f0',
                                                backgroundColor: 'white', color: '#64748b', cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                                            }}
                                            title="Précédent"
                                        >
                                            <ChevronLeft size={16} />
                                        </button>
                                        <button
                                            onClick={() => scrollContainer(timelineRef, 'right')}
                                            style={{
                                                padding: '6px', borderRadius: '8px', border: '1px solid #e2e8f0',
                                                backgroundColor: 'white', color: '#64748b', cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                                            }}
                                            title="Suivant"
                                        >
                                            <ChevronRight size={16} />
                                        </button>
                                    </div>
                                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', backgroundColor: '#f1f5f9', padding: '4px 12px', borderRadius: '20px' }}>
                                        {getTimelineEvents().length} Événements
                                    </span>
                                </div>
                            </div>

                            <div
                                ref={timelineRef}
                                onMouseDown={(e) => handleMouseDown(e, timelineRef, setIsDraggingTimeline)}
                                onMouseLeave={stopDragging}
                                onMouseUp={stopDragging}
                                onMouseMove={(e) => handleMouseMove(e, timelineRef, isDraggingTimeline)}
                                style={{
                                    display: 'flex',
                                    gap: '16px',
                                    overflowX: 'auto',
                                    padding: '10px 5px 20px',
                                    scrollbarWidth: 'none',
                                    msOverflowStyle: 'none',
                                    cursor: isDraggingTimeline ? 'grabbing' : 'grab',
                                    userSelect: 'none'
                                }}
                                className="hide-scrollbar"
                            >
                                {getTimelineEvents().length === 0 ? (
                                    <div style={{ color: '#94a3b8', fontSize: '14px', fontStyle: 'italic', padding: '20px' }}>
                                        Aucun événement chronologique enregistré.
                                    </div>
                                ) : (
                                    getTimelineEvents().map((ev, idx) => (
                                        <div key={ev.id} style={{
                                            minWidth: '220px',
                                            position: 'relative',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '12px'
                                        }}>
                                            {/* Connector Line */}
                                            {idx < getTimelineEvents().length - 1 && (
                                                <div style={{
                                                    position: 'absolute',
                                                    top: '18px',
                                                    left: '28px',
                                                    right: '-16px',
                                                    height: '2px',
                                                    backgroundColor: '#f1f5f9',
                                                    zIndex: 0
                                                }} />
                                            )}

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', position: 'relative', zIndex: 1 }}>
                                                <div style={{
                                                    width: '36px',
                                                    height: '36px',
                                                    borderRadius: '10px',
                                                    backgroundColor: ev.color + '15',
                                                    color: ev.color,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    border: `2px solid ${ev.color}20`
                                                }}>
                                                    {ev.icon}
                                                </div>
                                                <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748b' }}>
                                                    {ev.date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
                                                </div>
                                            </div>

                                            <div style={{
                                                padding: '12px',
                                                backgroundColor: '#f8fafc',
                                                borderRadius: '12px',
                                                border: '1px solid #f1f5f9',
                                                flex: 1,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '2px'
                                            }}>
                                                <div style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b' }}>{ev.title}</div>
                                                <div style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.4' }}>{ev.subtitle}</div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* BIOMARKER TRENDS (Glassmorphism Style) */}
                        {Object.keys(labEntries.reduce((acc: any, curr) => {
                            if (curr.test_name && !isNaN(parseFloat(curr.result_value))) {
                                if (!acc[curr.test_name]) acc[curr.test_name] = [];
                                acc[curr.test_name].push(curr);
                            }
                            return acc;
                        }, {})).length > 0 && (
                                <div style={{
                                    marginBottom: '32px',
                                    padding: '24px',
                                    background: 'rgba(255, 255, 255, 0.7)',
                                    backdropFilter: 'blur(12px)',
                                    WebkitBackdropFilter: 'blur(12px)',
                                    borderRadius: '24px',
                                    border: '1px solid rgba(255, 255, 255, 0.4)',
                                    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
                                    overflow: 'hidden'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <FlaskConical size={18} style={{ color: '#8b5cf6' }} />
                                            Suivi des Biomarqueurs & Tendances
                                        </h3>
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            <button
                                                onClick={() => scrollContainer(biomarkerRef, 'left')}
                                                style={{
                                                    padding: '4px', borderRadius: '6px', border: '1px solid #e2e8f0',
                                                    backgroundColor: 'white', color: '#64748b', cursor: 'pointer'
                                                }}
                                            >
                                                <ChevronLeft size={14} />
                                            </button>
                                            <button
                                                onClick={() => scrollContainer(biomarkerRef, 'right')}
                                                style={{
                                                    padding: '4px', borderRadius: '6px', border: '1px solid #e2e8f0',
                                                    backgroundColor: 'white', color: '#64748b', cursor: 'pointer'
                                                }}
                                            >
                                                <ChevronRight size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    <div
                                        ref={biomarkerRef}
                                        onMouseDown={(e) => handleMouseDown(e, biomarkerRef, setIsDraggingBiomarker)}
                                        onMouseLeave={stopDragging}
                                        onMouseUp={stopDragging}
                                        onMouseMove={(e) => handleMouseMove(e, biomarkerRef, isDraggingBiomarker)}
                                        style={{
                                            display: 'flex',
                                            gap: '20px',
                                            overflowX: 'auto',
                                            paddingBottom: '10px',
                                            scrollbarWidth: 'none',
                                            msOverflowStyle: 'none',
                                            cursor: isDraggingBiomarker ? 'grabbing' : 'grab',
                                            userSelect: 'none'
                                        }}
                                        className="hide-scrollbar"
                                    >
                                        {Object.entries(labEntries.reduce((acc: any, curr) => {
                                            const val = parseFloat(curr.result_value);
                                            if (curr.test_name && !isNaN(val)) {
                                                if (!acc[curr.test_name]) acc[curr.test_name] = [];
                                                acc[curr.test_name].push({ val, date: new Date(curr.created_at) });
                                            }
                                            return acc;
                                        }, {}))
                                            .filter(([name]) => name !== 'undefined' && name !== '')
                                            .map(([name, data]: [string, any]) => {
                                                const sorted = data.sort((a: any, b: any) => a.date.getTime() - b.date.getTime());
                                                const last = sorted[sorted.length - 1];
                                                const prev = sorted.length > 1 ? sorted[sorted.length - 2] : null;
                                                const trend = prev ? ((last.val - prev.val) / prev.val) * 100 : 0;

                                                // Simple SVG Path for Sparkline
                                                const min = Math.min(...sorted.map((d: any) => d.val));
                                                const max = Math.max(...sorted.map((d: any) => d.val));
                                                const range = max - min || 1;
                                                const points = sorted.map((d: any, i: number) => {
                                                    const x = (i / (sorted.length - 1 || 1)) * 100;
                                                    const y = 30 - ((d.val - min) / range) * 20;
                                                    return `${x},${y}`;
                                                }).join(' ');

                                                return (
                                                    <div 
                                                        key={name} 
                                                        onClick={() => setSelectedBiomarker({ name, data: sorted })}
                                                        style={{
                                                            padding: '12px',
                                                            backgroundColor: 'white',
                                                            borderRadius: '16px',
                                                            border: '1px solid #f1f5f9',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            gap: '8px',
                                                            minWidth: '240px',
                                                            cursor: 'pointer',
                                                            transition: 'transform 0.2s, box-shadow 0.2s'
                                                        }}
                                                        className="hub-card"
                                                    >
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                            <div>
                                                                <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>{decodeEncoding(name)}</div>
                                                                <div style={{ fontSize: '20px', fontWeight: '800', color: '#1e293b' }}>
                                                                    {last.val} <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>{labEntries.find(l => l.test_name === name)?.unit}</span>
                                                                </div>
                                                            </div>
                                                            {prev && (
                                                                <div style={{
                                                                    fontSize: '11px',
                                                                    fontWeight: '800',
                                                                    color: trend > 0 ? '#ef4444' : '#10b981',
                                                                    backgroundColor: trend > 0 ? '#fef2f2' : '#f0fdf4',
                                                                    padding: '4px 8px',
                                                                    borderRadius: '8px',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '2px'
                                                                }}>
                                                                    {trend > 0 ? '↗' : '↘'} {Math.abs(trend).toFixed(1)}%
                                                                </div>
                                                            )}
                                                        </div>

                                                        <svg viewBox="0 0 100 30" style={{ width: '100%', height: '40px' }}>
                                                            <polyline
                                                                fill="none"
                                                                stroke={trend > 0 ? '#ef4444' : '#10b981'}
                                                                strokeWidth="2"
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                points={points}
                                                            />
                                                        </svg>

                                                        <div style={{ fontSize: '10px', color: '#94a3b8', textAlign: 'center' }}>
                                                            Histo: {sorted.length} mesures
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </div>
                            )}

                        <div style={{
                            display: 'flex', gap: '8px', marginBottom: '24px',
                            backgroundColor: '#f1f5f9', padding: '6px', borderRadius: '16px',
                            width: 'fit-content'
                        }}>
                            {[
                                { id: 'info', label: 'Informations', icon: <User size={18} /> },
                                { id: 'body_map', label: 'Body Map', icon: <ImageIcon size={18} />, hidden: currentUser?.role === 'Secrétaire' },
                                { id: 'tumors', label: 'Données Cliniques', icon: <Activity size={18} />, hidden: currentUser?.role === 'Secrétaire' },
                                { id: 'diagnostics', label: 'Diagnostics', icon: <FileText size={18} />, hidden: currentUser?.role === 'Secrétaire' },
                                { id: 'lab_requests', label: 'Bilans & Examens', icon: <Activity size={18} />, hidden: currentUser?.role === 'Secrétaire' },
                                { id: 'lab_results', label: 'Résultats Labo', icon: <FileText size={18} />, hidden: currentUser?.role === 'Secrétaire' },
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

                        {activeTab === 'body_map' && (
                            <div className="animate-fadeIn">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>Cartographie Corporelle (Body Map)</h3>
                                    {isOwner && (
                                        <button className="login-button" onClick={() => setShowCancerDiagnosisForm(true)} style={{ width: 'auto', padding: '10px 20px', gap: '8px' }}>
                                            <Plus size={18} /> Nouveau Diagnostic
                                        </button>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start' }}>
                                    <div style={{ flex: 1, backgroundColor: 'white', padding: '24px', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'center' }}>
                                        <BodyMapViewer 
                                            diagnoses={cancerDiagnoses} 
                                            onRegionClick={(regionId, diagnoses) => {
                                                setSelectedRegionId(regionId);
                                                setSelectedRegionDiagnoses(diagnoses);
                                            }} 
                                        />
                                    </div>
                                    <div style={{ width: '400px', backgroundColor: 'white', padding: '24px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                                        <h4 style={{ margin: '0 0 16px', color: '#1e293b' }}>Historique des Diagnostics</h4>
                                        {cancerDiagnoses.length === 0 ? (
                                            <p style={{ color: '#64748b', fontSize: '14px' }}>Aucun diagnostic enregistré.</p>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                {cancerDiagnoses.map((d: any) => (
                                                    <div key={d.id} style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                                                        <div style={{ fontWeight: 'bold', color: '#0f172a' }}>{d.topography_code} - {d.organ}</div>
                                                        <div style={{ fontSize: '13px', color: '#64748b', margin: '4px 0' }}>Stade: {d.stade_global} | Grade: {d.grade}</div>
                                                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>{new Date(d.diagnosis_date).toLocaleDateString()}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {showCancerDiagnosisForm && (
                                    <CancerDiagnosisForm 
                                        patientId={id!} 
                                        initialData={tumors && tumors.length > 0 ? tumors[0] : undefined}
                                        onClose={() => setShowCancerDiagnosisForm(false)} 
                                        onSaved={fetchData} 
                                    />
                                )}
                                {selectedRegionId && (
                                    <OrganDetailView 
                                        regionId={selectedRegionId} 
                                        diagnoses={selectedRegionDiagnoses} 
                                        onClose={() => setSelectedRegionId(null)} 
                                    />
                                )}
                            </div>
                        )}

                        {activeTab === 'tumors' && (
                            <div className="animate-fadeIn">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>Registres des Tumeurs (IARC)</h3>
                                    {(!showTumorForm && isOwner && (selectedSectorId === 'all' || activeSector?.hospital_id === currentUser?.workplace_id)) && (
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

                                        {/* Evaluation temps-réel (Drapeaux Rouges IARC) */}
                                        {(() => {
                                            const sub = subtypes.find(s => s.sub_type === tumorFormData.sub_type);
                                            const genderMismatch = sub?.allowed_gender && sub.allowed_gender !== patient?.gender;
                                            const ageMismatch = sub && (patient?.age! < sub.min_age || patient?.age! > sub.max_age);
                                            const morphologyIncomplete = tumorFormData.basis_of_diagnosis === '7' && (tumorFormData.morphology_code === '8000/3' || tumorFormData.morphology_code === '8010/3');

                                            if (genderMismatch || ageMismatch || morphologyIncomplete) {
                                                return (
                                                    <div style={{
                                                        marginBottom: '20px', padding: '16px', borderRadius: '16px',
                                                        backgroundColor: '#fff1f2', border: '1px solid #f43f5e',
                                                        display: 'flex', alignItems: 'center', gap: '16px', color: '#e11d48'
                                                    }}>
                                                        <div style={{
                                                            width: '40px', height: '40px', borderRadius: '50%',
                                                            backgroundColor: '#ffe4e6', display: 'flex',
                                                            alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                                        }}>
                                                            <AlertCircle size={24} />
                                                        </div>
                                                        <div>
                                                            <div style={{ fontSize: '14px', fontWeight: '800', marginBottom: '2px' }}>Drapeau Rouge IARC</div>
                                                            <div style={{ fontSize: '12px', fontWeight: '600', opacity: 0.9 }}>
                                                                {genderMismatch && <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>• Site {sub.icd10} peu commun pour {patient?.gender}</div>}
                                                                {ageMismatch && <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>• Âge inhabituel : Tranche attendue {sub.min_age}-{sub.max_age} ans</div>}
                                                                {morphologyIncomplete && <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>• Code 7 (Histologie) exige une morphologie plus précise que NOS</div>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })()}

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
                                                <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px', display: 'block' }}>Base du Diagnostic (IARC)</label>
                                                <select
                                                    className="login-input" style={{ width: '100%' }}
                                                    value={tumorFormData.basis_of_diagnosis}
                                                    onChange={e => setTumorFormData({ ...tumorFormData, basis_of_diagnosis: e.target.value })}
                                                >
                                                    <option value="1">1 - Clinique uniquement</option>
                                                    <option value="2">2 - Investigations cliniques (RX, CT, etc.)</option>
                                                    <option value="4">4 - Tests biochimiques/immunologiques</option>
                                                    <option value="5">5 - Cytologie / Hématologie</option>
                                                    <option value="7">7 - Histologie de la tumeur primitive</option>
                                                    <option value="9">9 - Inconnu</option>
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
                                                        {tumor.owner_hospital_id && tumor.owner_hospital_id !== currentUser?.workplace_id && (
                                                            <span style={{
                                                                fontSize: '10px', fontWeight: '800', backgroundColor: '#f1f5f9',
                                                                color: '#64748b', padding: '4px 8px', borderRadius: '6px', border: '1px solid #e2e8f0',
                                                                display: 'flex', alignItems: 'center', gap: '4px'
                                                            }}>
                                                                <Eye size={10} /> LECTURE SEULE
                                                            </span>
                                                        )}
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
                                        ) : (
                                            diagnostics
                                                .filter(d => selectedSectorId === 'all' || d.owner_hospital_id === activeSector?.hospital_id)
                                                .map((diag) => (
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
                                                                        <div style={{ fontSize: '15px', fontWeight: '800', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                            {diag.type === 'treatment' ? 'Traitement En Cours' :
                                                                                diag.type === 'follow-up' ? 'Suivi Médical' :
                                                                                    'Diagnostic'}
                                                                            {diag.owner_hospital_id && diag.owner_hospital_id !== currentUser?.workplace_id && (
                                                                                <span style={{
                                                                                    fontSize: '10px', fontWeight: '800', backgroundColor: '#f1f5f9',
                                                                                    color: '#64748b', padding: '2px 8px', borderRadius: '6px', border: '1px solid #e2e8f0'
                                                                                }}>
                                                                                    LECTURE SEULE
                                                                                </span>
                                                                            )}
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
                                                ))
                                        )}
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

                                        {isOwner && (selectedSectorId === 'all' || activeSector?.hospital_id === currentUser?.workplace_id) && (currentUser?.role === 'Médecin' || currentUser?.role === 'Administrateur National') && (
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

                        {activeTab === 'lab_requests' && (
                            <div className="card-container" style={{ padding: '24px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>Bilans & Examens</h3>
                                    {!showLabRequestForm && isOwner && (selectedSectorId === 'all' || activeSector?.hospital_id === currentUser?.workplace_id) && (currentUser?.role === 'Médecin' || currentUser?.role === 'Administrateur National') && (
                                        <button
                                            className="login-button"
                                            style={{ width: 'auto', padding: '10px 20px', gap: '8px', backgroundColor: '#2563eb' }}
                                            onClick={() => setShowLabRequestForm(true)}
                                        >
                                            <Plus size={18} /> Demander un Bilan
                                        </button>
                                    )}
                                </div>

                                {showLabRequestForm && (
                                    <div style={{ marginBottom: '32px', padding: '24px', backgroundColor: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                            <h4 style={{ margin: 0, color: '#2563eb', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Activity size={18} /> Nouvelle Demande d'Examen
                                            </h4>
                                            <button onClick={() => setShowLabRequestForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', marginBottom: '16px' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                                <div>
                                                    <label className="input-label">Phase du Bilan</label>
                                                    <select
                                                        className="login-input"
                                                        style={{ width: '100%' }}
                                                        value={selectedPhase}
                                                        onChange={(e) => setSelectedPhase(e.target.value as any)}
                                                    >
                                                        <option value="initial">Bilan Initial (Présomption)</option>
                                                        <option value="confirmation">Bilan de Confirmation (Histo/IHC)</option>
                                                        <option value="extension">Bilan d'Extension (Staging)</option>
                                                        <option value="suivi">Bilan de Suivi (Évaluation)</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="input-label">
                                                        Laboratoire {isMatchingLabs && <Loader2 size={12} className="animate-spin" style={{ display: 'inline' }} />}
                                                    </label>
                                                    <select
                                                        className="login-input"
                                                        style={{ width: '100%', borderColor: matchingLabs.length === 0 && selectedTests.length > 0 ? '#ef4444' : '#e2e8f0' }}
                                                        value={selectedLabId}
                                                        onChange={(e) => setSelectedLabId(e.target.value)}
                                                    >
                                                        <option value="" disabled>
                                                            {matchingLabs.length === 0 && selectedTests.length > 0
                                                                ? "Aucun laboratoire ne propose tous ces examens"
                                                                : "Sélectionner un laboratoire..."}
                                                        </option>
                                                        {matchingLabs.map(lab => (
                                                            <option key={lab.id} value={lab.id}>{lab.name} ({lab.location})</option>
                                                        ))}
                                                    </select>
                                                    {matchingLabs.length === 0 && selectedTests.length > 0 && (
                                                        <div style={{ fontSize: '10px', color: '#ef4444', marginTop: '4px', fontWeight: 'bold' }}>
                                                            ⚠️ Veuillez réduire la sélection ou changer de phase.
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div style={{ marginTop: '16px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                                    <label className="input-label" style={{ margin: 0 }}>
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <i className="fas fa-magic" style={{ color: '#6366f1' }}></i>
                                                            Assistant Prescription : {selectedPhase}
                                                        </span>
                                                    </label>
                                                    {bilanPackages.length > 0 && (
                                                        <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#6366f1', backgroundColor: '#e0e7ff', padding: '2px 8px', borderRadius: '12px' }}>
                                                            {bilanPackages.length} Protocole(s) Identifié(s)
                                                        </span>
                                                    )}
                                                </div>

                                                <div style={{
                                                    display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '450px', overflowY: 'auto',
                                                    padding: '16px', border: '1px solid #e2e8f0', borderRadius: '16px',
                                                    backgroundColor: '#f8fafc', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                                                }}>
                                                    {bilanPackages.length > 0 ? (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                                            {bilanPackages.map((pkg, pIdx) => (
                                                                <div key={pIdx} style={{
                                                                    backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '12px',
                                                                    padding: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                                                }}>
                                                                    {(pkg.sous_type || bilanPackages.length > 1) && (
                                                                        <div style={{
                                                                            fontSize: '14px', fontWeight: '800', color: '#1e293b', marginBottom: '12px',
                                                                            display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '2px solid #f1f5f9', paddingBottom: '8px'
                                                                        }}>
                                                                            <i className="fas fa-microscope" style={{ color: '#3b82f6' }}></i>
                                                                            <span style={{ flex: 1 }}>{pkg.sous_type || `Option ${pIdx + 1}`}</span>
                                                                            {JSON.parse(localStorage.getItem('user') || '{}').role === 'Médecin' && (
                                                                                <button
                                                                                    onClick={() => {
                                                                                        setEditingPackage(pkg);
                                                                                        setPackageEditForm({
                                                                                            examens_obligatoires: (pkg.examens_obligatoires || []).join('\n'),
                                                                                            examens_optionnels: (pkg.examens_optionnels || []).join('\n'),
                                                                                            note_clinique: pkg.note_clinique || ''
                                                                                        });
                                                                                        setShowPackageEditor(true);
                                                                                    }}
                                                                                    style={{
                                                                                        background: 'none', border: 'none', color: '#64748b',
                                                                                        cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center'
                                                                                    }}
                                                                                    title="Modifier le protocole"
                                                                                >
                                                                                    <Edit2 size={16} />
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    )}

                                                                    {pkg.note_clinique && (
                                                                        <div style={{
                                                                            fontSize: '12px', color: '#475569', marginBottom: '16px', padding: '10px 14px',
                                                                            backgroundColor: '#eff6ff', borderRadius: '10px', borderLeft: '4px solid #3b82f6',
                                                                            lineHeight: '1.5'
                                                                        }}>
                                                                            <strong style={{ color: '#2563eb' }}>Conseil clinique :</strong> {pkg.note_clinique}
                                                                        </div>
                                                                    )}

                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                                                        {pkg.examens_obligatoires && pkg.examens_obligatoires.length > 0 && (
                                                                            <div>
                                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                                                                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444' }}></div>
                                                                                    <div style={{ fontSize: '11px', fontWeight: '800', color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                                                        Bilan Fondamental (Requis)
                                                                                    </div>
                                                                                </div>
                                                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px' }}>
                                                                                    {pkg.examens_obligatoires.map((test: string, idx: number) => (
                                                                                        <label key={`obl-${pIdx}-${idx}`} style={{
                                                                                            display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px',
                                                                                            backgroundColor: selectedTests.includes(test) ? '#f0fdf4' : 'white',
                                                                                            borderRadius: '10px', cursor: 'pointer', border: `1px solid ${selectedTests.includes(test) ? '#22c55e' : '#e2e8f0'}`,
                                                                                            boxShadow: selectedTests.includes(test) ? '0 2px 4px rgba(34, 197, 94, 0.1)' : 'none',
                                                                                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                                                            userSelect: 'none'
                                                                                        }}
                                                                                            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.borderColor = selectedTests.includes(test) ? '#22c55e' : '#cbd5e1'; }}
                                                                                            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = selectedTests.includes(test) ? '#22c55e' : '#e2e8f0'; }}
                                                                                        >
                                                                                            <input
                                                                                                type="checkbox"
                                                                                                checked={selectedTests.includes(test)}
                                                                                                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#22c55e' }}
                                                                                                onChange={(e) => {
                                                                                                    if (e.target.checked) setSelectedTests([...selectedTests, test]);
                                                                                                    else setSelectedTests(selectedTests.filter(t => t !== test));
                                                                                                }}
                                                                                            />
                                                                                            <span style={{ fontSize: '13px', fontWeight: '600', color: selectedTests.includes(test) ? '#166534' : '#475569' }}>{test}</span>
                                                                                        </label>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        )}

                                                                        {pkg.examens_optionnels && pkg.examens_optionnels.length > 0 && (
                                                                            <div>
                                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                                                                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#64748b' }}></div>
                                                                                    <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                                                        Examens Complémentaires (Optionnels)
                                                                                    </div>
                                                                                </div>
                                                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px' }}>
                                                                                    {pkg.examens_optionnels.map((test: string, idx: number) => (
                                                                                        <label key={`opt-${pIdx}-${idx}`} style={{
                                                                                            display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px',
                                                                                            backgroundColor: selectedTests.includes(test) ? '#f8fafc' : 'white',
                                                                                            borderRadius: '10px', cursor: 'pointer', border: `1px solid ${selectedTests.includes(test) ? '#6366f1' : '#e2e8f0'}`,
                                                                                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                                                            userSelect: 'none'
                                                                                        }}
                                                                                            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                                                                            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
                                                                                        >
                                                                                            <input
                                                                                                type="checkbox"
                                                                                                checked={selectedTests.includes(test)}
                                                                                                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#6366f1' }}
                                                                                                onChange={(e) => {
                                                                                                    if (e.target.checked) setSelectedTests([...selectedTests, test]);
                                                                                                    else setSelectedTests(selectedTests.filter(t => t !== test));
                                                                                                }}
                                                                                            />
                                                                                            <span style={{ fontSize: '13px', fontWeight: '600', color: selectedTests.includes(test) ? '#4338ca' : '#64748b' }}>{test}</span>
                                                                                        </label>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                                                            <i className="fas fa-info-circle" style={{ fontSize: '24px', marginBottom: '12px' }}></i>
                                                            <p style={{ margin: 0, fontSize: '14px' }}>Aucun protocole clinique standardisé n'a été trouvé pour ce type de cancer et cette phase.</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div>
                                                <label className="input-label">Notes cliniques (Renseignements pour le labo)</label>
                                                <textarea
                                                    className="login-input"
                                                    style={{ width: '100%', minHeight: '80px', padding: '12px', resize: 'vertical' }}
                                                    placeholder="Contexte clinique, urgence..."
                                                    value={labNotes}
                                                    onChange={(e) => setLabNotes(e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                            <button className="login-button" style={{ width: 'auto', backgroundColor: '#f1f5f9', color: '#64748b' }} onClick={() => setShowLabRequestForm(false)}>Annuler</button>
                                            <button className="login-button" style={{ width: 'auto', padding: '10px 24px' }} onClick={handleCreateLabRequest} disabled={actionLoading}>
                                                {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />} Transmettre la demande
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {!showLabRequestForm && labRequests.length === 0 && (
                                    <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f8fafc', borderRadius: '16px', border: '2px dashed #e2e8f0' }}>
                                        <Activity size={48} style={{ color: '#cbd5e1', marginBottom: '16px', margin: '0 auto' }} />
                                        <h4 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: '700', color: '#475569' }}>Aucune demande d'examen</h4>
                                        <p style={{ margin: 0, fontSize: '14px', color: '#94a3b8' }}>Les bilans prescrits apparaîtront ici.</p>
                                    </div>
                                )}

                                {!showLabRequestForm && labRequests.length > 0 && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        {labRequests
                                            .filter(req => selectedSectorId === 'all' || req.owner_hospital_id === activeSector?.hospital_id)
                                            .map(req => (
                                                <div key={req.id} style={{ padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', backgroundColor: 'white' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                                        <div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                                <span style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b' }}>Demande vers: {req.laboratory_name || 'Laboratoire Non Spécifié'}</span>
                                                                <span style={{
                                                                    fontSize: '10px', fontWeight: '800', padding: '4px 8px', borderRadius: '12px', textTransform: 'uppercase',
                                                                    backgroundColor: req.status === 'completed' ? '#dcfce7' : req.status === 'in_progress' ? '#fef3c7' : '#f1f5f9',
                                                                    color: req.status === 'completed' ? '#166534' : req.status === 'in_progress' ? '#92400e' : '#64748b'
                                                                }}>
                                                                    {req.status === 'completed' ? 'Traité' : req.status === 'in_progress' ? 'En Analyse' : 'En Attente'}
                                                                </span>
                                                                {req.owner_hospital_id && req.owner_hospital_id !== currentUser?.workplace_id && (
                                                                    <span style={{
                                                                        fontSize: '10px', fontWeight: '800', backgroundColor: '#f1f5f9',
                                                                        color: '#64748b', padding: '4px 8px', borderRadius: '6px', border: '1px solid #e2e8f0',
                                                                        display: 'flex', alignItems: 'center', gap: '4px'
                                                                    }}>
                                                                        <Eye size={10} /> Lecture Seule (Autre Hôpital)
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                                                                Prescrit par {req.doctor_name} le {new Date(req.created_at).toLocaleDateString()}
                                                            </div>
                                                        </div>
                                                        {/* Added Progress Indicator for Physician */}
                                                        {req.status !== 'completed' && (
                                                            <div style={{ textAlign: 'right' }}>
                                                                {(() => {
                                                                    const tests = typeof req.tests_requested === 'string' ? JSON.parse(req.tests_requested) : req.tests_requested;
                                                                    const total = Array.isArray(tests) ? tests.length : 0;
                                                                    const validated = labEntries.filter((e: any) => e.lab_request_id === req.id && e.status === 'validated').length;
                                                                    const progress = total > 0 ? (validated / total) * 100 : 0;

                                                                    return (
                                                                        <div style={{ width: '120px' }}>
                                                                            <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>
                                                                                {validated} / {total} Validés
                                                                            </div>
                                                                            <div style={{ height: '4px', backgroundColor: '#e2e8f0', borderRadius: '2px', overflow: 'hidden' }}>
                                                                                <div style={{ width: `${progress}%`, height: '100%', backgroundColor: '#10b981', transition: 'width 0.3s' }}></div>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })()}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', marginBottom: '12px' }}>
                                                        <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>Examens Prescrits:</div>
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                            {req.tests_requested && (typeof req.tests_requested === 'string' ? JSON.parse(req.tests_requested) : req.tests_requested).map((test: string, idx: number) => (
                                                                <span key={idx} style={{ fontSize: '12px', fontWeight: '600', backgroundColor: 'white', padding: '4px 10px', borderRadius: '20px', border: '1px solid #e2e8f0', color: '#0f172a' }}>
                                                                    {test}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {req.notes && (
                                                        <div style={{ fontSize: '13px', color: '#475569', fontStyle: 'italic', marginBottom: '12px' }}>
                                                            "{req.notes}"
                                                        </div>
                                                    )}

                                                    {req.status === 'completed' && req.result_url && (
                                                        <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
                                                            <button
                                                                onClick={() => window.open(`http://localhost:5000${req.result_url}`, '_blank')}
                                                                style={{ padding: '8px 16px', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                                                            >
                                                                <FileText size={16} /> Voir le Résultat
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'lab_results' && (
                            <div className="card-container" style={{ padding: '24px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>Résultats de Laboratoire Structurés</h3>
                                </div>

                                {labEntries.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f8fafc', borderRadius: '16px', border: '2px dashed #e2e8f0' }}>
                                        <Activity size={48} style={{ color: '#cbd5e1', marginBottom: '16px', margin: '0 auto' }} />
                                        <h4 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: '700', color: '#475569' }}>Aucun résultat</h4>
                                        <p style={{ margin: 0, fontSize: '14px', color: '#94a3b8' }}>Les résultats validés par les laboratoires apparaîtront ici.</p>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                        {labEntries
                                            .filter(entry => selectedSectorId === 'all' || entry.owner_hospital_id === activeSector?.hospital_id)
                                            .map(entry => (
                                                <div key={entry.id} style={{ padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', backgroundColor: 'white' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                                        <div>
                                                            <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#1e293b' }}>{entry.test_name}</h4>
                                                            <p style={{ margin: 0, fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                                                                Saisi par: <span style={{ fontWeight: '600' }}>{entry.filled_by_name}</span> le {new Date(entry.updated_at).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                            <span style={{
                                                                fontSize: '11px', fontWeight: '800', padding: '6px 12px', borderRadius: '20px', textTransform: 'uppercase', height: 'fit-content',
                                                                backgroundColor: entry.status === 'validated' ? '#dcfce7' : '#fef3c7',
                                                                color: entry.status === 'validated' ? '#166534' : '#92400e'
                                                            }}>
                                                                {entry.status === 'validated' ? 'Validé' : 'Brouillon'}
                                                            </span>
                                                            {entry.owner_hospital_id && entry.owner_hospital_id !== currentUser?.workplace_id && (
                                                                <span style={{
                                                                    fontSize: '10px', fontWeight: '800', backgroundColor: '#f1f5f9',
                                                                    color: '#64748b', padding: '4px 8px', borderRadius: '6px',
                                                                    display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #e2e8f0', marginLeft: '8px'
                                                                }}>
                                                                    <Eye size={10} /> Lecture Seule (Autre Hôpital)
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                                        {RESULT_TEMPLATES[entry.template_id] ? (
                                                            <LabResultForm
                                                                template={RESULT_TEMPLATES[entry.template_id]}
                                                                testName={entry.test_name}
                                                                initialData={entry.result_data}
                                                                onSave={() => { }}
                                                                readOnly={true}
                                                            />
                                                        ) : (
                                                            <div style={{ color: '#ef4444' }}>Template inconnu (ID: {entry.template_id})</div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'records' && (
                            <div className="card-container" style={{ padding: '24px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>Documents Médicaux</h3>
                                    {isOwner && (selectedSectorId === 'all' || activeSector?.hospital_id === currentUser?.workplace_id) && (currentUser?.role === 'Médecin' || currentUser?.role === 'Administrateur National') && (
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
                                                placeholder="Ex: Scanner Thoracique ou Résultats Labo Externe"
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
                                    {records.filter(r => selectedSectorId === 'all' || r.owner_hospital_id === activeSector?.hospital_id).length === 0 ? (
                                        <div style={{
                                            gridColumn: '1/-1', padding: '48px', borderRadius: '20px',
                                            backgroundColor: '#f8fafc', border: '2px dashed #e2e8f0',
                                            textAlign: 'center', color: '#94a3b8'
                                        }}>
                                            <ImageIcon size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                                            <p>Aucun document médical disponible.</p>
                                        </div>
                                    ) : records
                                        .filter(r => selectedSectorId === 'all' || r.owner_hospital_id === activeSector?.hospital_id)
                                        .map(record => (
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
            </div> {/* End of print-hide wrapper */}

            {/* Print Configuration Modal */}
            {showPrintModal && (
                <div className="print-hide" style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)',
                    zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '20px'
                }}>
                    <div style={{
                        backgroundColor: 'white', borderRadius: '32px', width: '100%', maxWidth: '700px',
                        maxHeight: '90vh', overflowY: 'auto', padding: '40px',
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', border: '1px solid #e2e8f0',
                        position: 'relative'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '900', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <FileText size={28} color="#2563eb" /> Rapport RCP
                                </h2>
                                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '14px' }}>Sélectionnez les éléments à inclure dans le rapport final.</p>
                            </div>
                            <button onClick={() => setShowPrintModal(false)} style={{ backgroundColor: '#f1f5f9', border: 'none', padding: '8px', borderRadius: '12px', cursor: 'pointer', color: '#64748b', display: 'flex' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '40px' }}>
                            {/* Section: Administrative Info */}
                            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', cursor: 'pointer', backgroundColor: printConfig.info ? '#f8fafc' : 'transparent', transition: 'all 0.2s' }}>
                                <input type="checkbox" checked={printConfig.info} onChange={(e) => setPrintConfig({ ...printConfig, info: e.target.checked })} style={{ width: '20px', height: '20px' }} />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: '800', fontSize: '15px', color: '#1e293b' }}>Informations Administratives</div>
                                    <div style={{ fontSize: '12px', color: '#64748b' }}>Identité, contact et coordonnées</div>
                                </div>
                                <User size={20} color="#64748b" />
                            </label>

                            {/* Section: Tumors */}
                            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', cursor: 'pointer', backgroundColor: printConfig.tumors ? '#f8fafc' : 'transparent', transition: 'all 0.2s' }}>
                                <input type="checkbox" checked={printConfig.tumors} onChange={(e) => setPrintConfig({ ...printConfig, tumors: e.target.checked })} style={{ width: '20px', height: '20px' }} />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: '800', fontSize: '15px', color: '#1e293b' }}>Tumeurs</div>
                                    <div style={{ fontSize: '12px', color: '#64748b' }}>Données cliniques et topographie ({tumors.length})</div>
                                </div>
                                <Activity size={20} color="#64748b" />
                            </label>

                            {/* Section: Diagnostics & Traitements */}
                            <div style={{ padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', marginBottom: printConfig.allDiagnostics ? '0' : '16px' }}>
                                    <input type="checkbox" checked={printConfig.allDiagnostics} onChange={(e) => setPrintConfig({ ...printConfig, allDiagnostics: e.target.checked, selectedDiagnostics: [] })} style={{ width: '20px', height: '20px' }} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: '800', fontSize: '15px', color: '#1e293b' }}>Diagnostics & Traitements</div>
                                        <div style={{ fontSize: '12px', color: '#64748b' }}>Observations cliniques et historique des soins</div>
                                    </div>
                                    <Stethoscope size={20} color="#64748b" />
                                </label>

                                {!printConfig.allDiagnostics && (
                                    <div style={{ marginLeft: '32px', borderLeft: '2px solid #e2e8f0', paddingLeft: '20px' }}>
                                        <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                                            <button onClick={() => setPrintConfig({ ...printConfig, selectedDiagnostics: diagnostics.map((d: any) => d.id) })} style={{ fontSize: '11px', fontWeight: '700', color: '#2563eb', border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}>Tout inclure</button>
                                            <button onClick={() => setPrintConfig({ ...printConfig, selectedDiagnostics: [] })} style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}>Tout exclure</button>
                                        </div>
                                        <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {diagnostics.length === 0 ? <p style={{ fontSize: '13px', color: '#94a3b8' }}>Aucun diagnostic.</p> :
                                                diagnostics.map((d: any) => (
                                                    <label key={d.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                                                        <input type="checkbox" checked={printConfig.selectedDiagnostics.includes(d.id)} onChange={(e) => {
                                                            const newSelection = e.target.checked ? [...printConfig.selectedDiagnostics, d.id] : printConfig.selectedDiagnostics.filter(id => id !== d.id);
                                                            setPrintConfig({ ...printConfig, selectedDiagnostics: newSelection });
                                                        }} />
                                                        <span style={{ color: '#475569' }}>{new Date(d.date).toLocaleDateString()} - {d.type || 'Note'}</span>
                                                    </label>
                                                ))
                                            }
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Section: Lab Results */}
                            <div style={{ padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', marginBottom: printConfig.allLabResults ? '0' : '16px' }}>
                                    <input type="checkbox" checked={printConfig.allLabResults} onChange={(e) => setPrintConfig({ ...printConfig, allLabResults: e.target.checked, selectedLabResults: [] })} style={{ width: '20px', height: '20px' }} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: '800', fontSize: '15px', color: '#1e293b' }}>Résultats de Biologie (Laboratoire)</div>
                                        <div style={{ fontSize: '12px', color: '#64748b' }}>Formulaires de résultats détaillés ({labEntries.length})</div>
                                    </div>
                                    <CheckCircle size={20} color="#64748b" />
                                </label>

                                {!printConfig.allLabResults && (
                                    <div style={{ marginLeft: '32px', borderLeft: '2px solid #e2e8f0', paddingLeft: '20px' }}>
                                        <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                                            <button onClick={() => setPrintConfig({ ...printConfig, selectedLabResults: labEntries.map((le: any) => le.id) })} style={{ fontSize: '11px', fontWeight: '700', color: '#2563eb', border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}>Tout inclure</button>
                                            <button onClick={() => setPrintConfig({ ...printConfig, selectedLabResults: [] })} style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}>Tout exclure</button>
                                        </div>
                                        <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {labEntries.length === 0 ? <p style={{ fontSize: '13px', color: '#94a3b8' }}>Aucun résultat.</p> :
                                                labEntries.map((le: any) => (
                                                    <label key={le.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                                                        <input type="checkbox" checked={printConfig.selectedLabResults.includes(le.id)} onChange={(e) => {
                                                            const newSelection = e.target.checked ? [...printConfig.selectedLabResults, le.id] : printConfig.selectedLabResults.filter(id => id !== le.id);
                                                            setPrintConfig({ ...printConfig, selectedLabResults: newSelection });
                                                        }} />
                                                        <span style={{ color: '#475569' }}>{le.test_name} ({new Date(le.created_at).toLocaleDateString()})</span>
                                                    </label>
                                                ))
                                            }
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Section: Documents & Images */}
                            <div style={{ padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', marginBottom: printConfig.allRecords ? '0' : '16px' }}>
                                    <input type="checkbox" checked={printConfig.allRecords} onChange={(e) => setPrintConfig({ ...printConfig, allRecords: e.target.checked, selectedRecords: [] })} style={{ width: '20px', height: '20px' }} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: '800', fontSize: '15px', color: '#1e293b' }}>Documents & Imagerie</div>
                                        <div style={{ fontSize: '12px', color: '#64748b' }}>Fichiers joints et documents externes ({records.length})</div>
                                    </div>
                                    <ImageIcon size={20} color="#64748b" />
                                </label>

                                {!printConfig.allRecords && (
                                    <div style={{ marginLeft: '32px', borderLeft: '2px solid #e2e8f0', paddingLeft: '20px' }}>
                                        <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                                            <button onClick={() => setPrintConfig({ ...printConfig, selectedRecords: records.map((r: any) => r.id) })} style={{ fontSize: '11px', fontWeight: '700', color: '#2563eb', border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}>Tout inclure</button>
                                            <button onClick={() => setPrintConfig({ ...printConfig, selectedRecords: [] })} style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}>Tout exclure</button>
                                        </div>
                                        <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {records.length === 0 ? <p style={{ fontSize: '13px', color: '#94a3b8' }}>Aucun document.</p> :
                                                records.map((r: any) => (
                                                    <label key={r.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                                                        <input type="checkbox" checked={printConfig.selectedRecords.includes(r.id)} onChange={(e) => {
                                                            const newSelection = e.target.checked ? [...printConfig.selectedRecords, r.id] : printConfig.selectedRecords.filter(id => id !== r.id);
                                                            setPrintConfig({ ...printConfig, selectedRecords: newSelection });
                                                        }} />
                                                        <span style={{ color: '#475569' }}>{r.description} ({r.type.toUpperCase()})</span>
                                                    </label>
                                                ))
                                            }
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
                            <button onClick={() => setShowPrintModal(false)} style={{ padding: '14px 28px', borderRadius: '16px', border: '1px solid #e2e8f0', backgroundColor: 'white', color: '#64748b', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}>Annuler</button>
                            <button onClick={() => setIsPrinting(true)} style={{ padding: '14px 28px', borderRadius: '16px', border: 'none', backgroundColor: '#2563eb', color: 'white', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.4)' }}>
                                <FileText size={20} /> Générer le Rapport
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Package Editor */}
            {showPackageEditor && editingPackage && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
                    <div style={{ backgroundColor: 'white', borderRadius: '24px', width: '100%', maxWidth: '600px', padding: '32px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', position: 'relative' }}>
                        <button onClick={() => setShowPackageEditor(false)} style={{ position: 'absolute', top: '24px', right: '24px', width: '40px', height: '40px', borderRadius: '12px', border: 'none', backgroundColor: '#f1f5f9', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                            <X size={20} />
                        </button>

                        <div style={{ marginBottom: '24px' }}>
                            <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#1e293b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <i className="fas fa-edit" style={{ color: '#6366f1' }}></i>
                                Modifier le Protocole
                            </h2>
                            <p style={{ color: '#64748b', fontSize: '14px' }}>
                                {editingPackage.cancer_nom} - {editingPackage.sous_type} ({editingPackage.phase})
                            </p>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <label className="input-label">Examens Fondamentaux (un par ligne)</label>
                                <textarea
                                    className="login-input"
                                    rows={5}
                                    value={packageEditForm.examens_obligatoires}
                                    onChange={(e) => setPackageEditForm({ ...packageEditForm, examens_obligatoires: e.target.value })}
                                    style={{ width: '100%', resize: 'none', fontFamily: 'monospace', fontSize: '13px' }}
                                    placeholder="Ex: NFS\nBilan hépatique..."
                                />
                            </div>

                            <div>
                                <label className="input-label">Examens Optionnels (un par ligne)</label>
                                <textarea
                                    className="login-input"
                                    rows={5}
                                    value={packageEditForm.examens_optionnels}
                                    onChange={(e) => setPackageEditForm({ ...packageEditForm, examens_optionnels: e.target.value })}
                                    style={{ width: '100%', resize: 'none', fontFamily: 'monospace', fontSize: '13px' }}
                                    placeholder="Ex: Scanner TAP\nIRM cérébrale..."
                                />
                            </div>

                            <div>
                                <label className="input-label">Note Clinique / Recommandations</label>
                                <textarea
                                    className="login-input"
                                    rows={3}
                                    value={packageEditForm.note_clinique}
                                    onChange={(e) => setPackageEditForm({ ...packageEditForm, note_clinique: e.target.value })}
                                    style={{ width: '100%', resize: 'none' }}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                                <button
                                    onClick={() => setShowPackageEditor(false)}
                                    style={{ padding: '12px 24px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: 'white', color: '#64748b', fontWeight: 'bold', cursor: 'pointer' }}
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleUpdatePackage}
                                    disabled={isSavingPackage}
                                    style={{
                                        padding: '12px 24px', borderRadius: '12px', border: 'none', backgroundColor: '#6366f1', color: 'white',
                                        fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px',
                                        opacity: isSavingPackage ? 0.7 : 1
                                    }}
                                >
                                    {isSavingPackage ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                    Enregistrer les changements
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Detailed Biomarker Modal */}
            <AnimatePresence>
                {selectedBiomarker && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)',
                            backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex',
                            alignItems: 'center', justifyContent: 'center', padding: '20px'
                        }}
                        onClick={() => setSelectedBiomarker(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            style={{
                                width: '100%', maxWidth: '900px', backgroundColor: 'white',
                                borderRadius: '32px', padding: '40px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                                position: 'relative'
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            <button
                                onClick={() => setSelectedBiomarker(null)}
                                style={{ position: 'absolute', top: '24px', right: '24px', padding: '8px', borderRadius: '12px', border: 'none', backgroundColor: '#f1f5f9', color: '#64748b', cursor: 'pointer' }}
                            >
                                <X size={20} />
                            </button>

                            <div style={{ marginBottom: '32px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                    <div style={{ padding: '10px', borderRadius: '14px', backgroundColor: '#f5f3ff', color: '#8b5cf6' }}>
                                        <TrendingUp size={24} />
                                    </div>
                                    <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: '#1e293b' }}>
                                        Analyse Détaillée: {decodeEncoding(selectedBiomarker.name)}
                                    </h2>
                                </div>
                                <p style={{ margin: 0, color: '#64748b', fontSize: '15px' }}>
                                    Évolution historique et comparaison avec les plages de référence normales.
                                </p>
                            </div>

                            <div style={{ height: '400px', width: '100%', marginBottom: '32px', backgroundColor: '#f8fafc', borderRadius: '24px', padding: '20px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={selectedBiomarker.data}>
                                        <defs>
                                            <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis 
                                            dataKey="date" 
                                            tickFormatter={(date) => new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#94a3b8', fontSize: 12 }}
                                        />
                                        <YAxis 
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#94a3b8', fontSize: 12 }}
                                        />
                                        <Tooltip 
                                            contentStyle={{ 
                                                borderRadius: '16px', border: 'none', 
                                                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                                                padding: '12px'
                                            }}
                                            labelFormatter={(date) => new Date(date).toLocaleDateString('fr-FR', { dateStyle: 'long' })}
                                        />
                                        {NORMAL_RANGES[decodeEncoding(selectedBiomarker.name).replace(/離/g, '').trim()] && (
                                            <>
                                                <ReferenceArea
                                                    y1={NORMAL_RANGES[decodeEncoding(selectedBiomarker.name).replace(/離/g, '').trim()].min}
                                                    y2={NORMAL_RANGES[decodeEncoding(selectedBiomarker.name).replace(/離/g, '').trim()].max}
                                                    fill="#f0fdf4"
                                                    fillOpacity={0.5}
                                                />
                                                <ReferenceLine y={NORMAL_RANGES[decodeEncoding(selectedBiomarker.name).replace(/離/g, '').trim()].max} stroke="#10b981" strokeDasharray="3 3" />
                                                <ReferenceLine y={NORMAL_RANGES[decodeEncoding(selectedBiomarker.name).replace(/離/g, '').trim()].min} stroke="#10b981" strokeDasharray="3 3" />
                                            </>
                                        )}
                                        <Area
                                            type="monotone"
                                            dataKey="val"
                                            stroke="#8b5cf6"
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#colorVal)"
                                            animationDuration={1500}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                                <div style={{ padding: '16px', borderRadius: '16px', backgroundColor: '#f8fafc' }}>
                                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700', marginBottom: '4px' }}>Dernière Valeur</div>
                                    <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
                                        {selectedBiomarker.data[selectedBiomarker.data.length - 1].val}
                                    </div>
                                </div>
                                <div style={{ padding: '16px', borderRadius: '16px', backgroundColor: '#f8fafc' }}>
                                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700', marginBottom: '4px' }}>Valeur Moyenne</div>
                                    <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
                                        {(selectedBiomarker.data.reduce((a: number, b: any) => a + b.val, 0) / selectedBiomarker.data.length).toFixed(1)}
                                    </div>
                                </div>
                                <div style={{ padding: '16px', borderRadius: '16px', backgroundColor: '#f8fafc' }}>
                                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700', marginBottom: '4px' }}>Status Actuel</div>
                                    <div style={{
                                        fontSize: '14px', fontWeight: '800',
                                        color: getBiomarkerStatus(selectedBiomarker.name, selectedBiomarker.data[selectedBiomarker.data.length - 1].val).color,
                                        textTransform: 'uppercase'
                                    }}>
                                        {getBiomarkerStatus(selectedBiomarker.name, selectedBiomarker.data[selectedBiomarker.data.length - 1].val).label}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const PatientDetailsSkeleton = () => (
    <div style={{ padding: '32px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div className="skeleton" style={{ width: '80px', height: '80px', borderRadius: '24px' }} />
                <div>
                    <div className="skeleton" style={{ width: '200px', height: '32px', borderRadius: '8px', marginBottom: '8px' }} />
                    <div className="skeleton" style={{ width: '150px', height: '20px', borderRadius: '6px' }} />
                </div>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
                <div className="skeleton" style={{ width: '120px', height: '40px', borderRadius: '12px' }} />
                <div className="skeleton" style={{ width: '40px', height: '40px', borderRadius: '12px' }} />
            </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '32px' }}>
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="skeleton" style={{ height: '100px', borderRadius: '24px' }} />
            ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }}>
            <div className="skeleton" style={{ height: '600px', borderRadius: '32px' }} />
            <div className="skeleton" style={{ height: '600px', borderRadius: '32px' }} />
        </div>
    </div>
);

export default PatientDetailsPage;
