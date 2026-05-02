import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { 
    ArrowLeft, CheckCircle, Clock, FileText, AlertCircle, Send, Eye,
    AlertTriangle, ChevronRight, Beaker, Save, Check, LayoutGrid
} from 'lucide-react';
import toast from 'react-hot-toast';
import LabResultForm from '../components/LabResultForm';
import { RESULT_TEMPLATES } from '../constants/resultTemplates';

const LabRequestDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [request, setRequest] = useState<any>(null);
    const [entries, setEntries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedTest, setSelectedTest] = useState<string | null>(null);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
    const [submitting, setSubmitting] = useState(false);
    const [currentUser] = useState<any>(JSON.parse(localStorage.getItem('user') || '{}'));

    const isLab = currentUser?.role === 'Laboratoire' || currentUser?.workplace_type === 'laboratory';
    const isAdmin = currentUser?.role === 'Administrateur National' || currentUser?.role === 'Directeur';
    const isOwner = request && request.owner_hospital_id === currentUser?.workplace_id;
    const isAssignedLab = request && request.laboratory_id === currentUser?.workplace_id;
    const isAssignedDoctor = request && request.assigned_to === currentUser?.id;

    // We allow editing if you are the lab staff (at the right lab), the assigned doctor, the owner hospital, or an admin
    const readOnly = request && !isLab && !isOwner && !isAdmin && !isAssignedLab && !isAssignedDoctor;

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        if (!id) return;
        try {
            setLoading(true);

            // Use Promise.all to fetch both request details and entries in parallel
            const [reqRes, entriesRes] = await Promise.all([
                api.get('/api/lab-requests'),
                api.get(`/api/lab-requests/${id}/entries`)
            ]);

            // Robust comparison: handle string vs number IDs
            const reqData = reqRes.data.find((r: any) => r.id.toString() === id.toString());

            if (!reqData) {
                console.error("Lab request not found with ID:", id);
                navigate('/laboratory');
                return;
            }

            // Robust parsing of tests_requested
            let testsArr: string[] = [];
            if (reqData.tests_requested) {
                if (Array.isArray(reqData.tests_requested)) {
                    testsArr = reqData.tests_requested;
                } else if (typeof reqData.tests_requested === 'string') {
                    try {
                        const parsed = JSON.parse(reqData.tests_requested);
                        testsArr = Array.isArray(parsed) ? parsed : [parsed.toString()];
                    } catch (e) {
                        // Fallback: splitting by comma if it's not valid JSON
                        testsArr = reqData.tests_requested.split(',').map((t: string) => t.trim());
                    }
                }
            }
            reqData.tests_requested = testsArr;

            setRequest(reqData);
            setEntries(entriesRes.data);
        } catch (error) {
            console.error("Error fetching lab request detail:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectTest = (test: string) => {
        setSelectedTest(test);
        const existing = entries.find(e => e.test_name === test);
        if (existing) {
            setSelectedTemplateId(existing.template_id);
        } else {
            // Auto-guess template if possible, else empty
            const guessedTemplate = guessTemplate(test);
            setSelectedTemplateId(guessedTemplate || Object.keys(RESULT_TEMPLATES)[0]);
        }
    };

    /**
     * Maps a test name to the most appropriate template ID.
     * This uses explicit keyword lists for each of the 8 template categories.
     */
    const guessTemplate = (testName: string): string => {
        const n = testName.toLowerCase().trim();

        // ── 1. BILAN GROUPÉ (NFS, Bilan hépatique, rénal, coagulation, ionogramme, thyroïdien, EPS)
        const bilanGroupeKeywords = [
            'nfs', 'numération formule', 'hemogramme', 'hémogramme',
            'bilan hépatique', 'bilan hepatique', 'asat', 'alat', 'tgo', 'tgp', 'ggt', 'pal',
            'bilan rénal', 'bilan renal', 'créatinine', 'creatinine', 'urée', 'uree', 'dfg',
            'bilan coagulation', 'tp', 'tca', 'fibrinogène', 'fibrinogene', 'd-dimères', 'd dimeres',
            'ionogramme', 'glycémie', 'glycemie', 'calcémie', 'calcemie', 'kaliémie', 'kaliemie', 'natrémie', 'natremie',
            'bilan thyroïdien', 'bilan thyroidien', 'tsh', 't4', 't3',
            'eps', 'électrophorèse', 'electrophorese', 'protéines sériques', 'proteines seriques',
        ];
        if (bilanGroupeKeywords.some(kw => n.includes(kw))) return 'bilan_groupe';

        // ── 2. IMAGERIE (Scanner, TDM, IRM, PET, Echo, Radiographie)
        const imagerieKeywords = [
            'scanner', 'tdm', 'tap', 'thorax', 'irm', 'pet', 'pet-scan', 'pet scan', 'tep',
            'échographie', 'echographie', 'radiographie', 'radio', 'mammographie', 'scintigraphie',
            'cone beam', 'cbct', 'imagerie', 'radiology', 'rx pubis', 'rx thorax', 'rx bassin',
            'abdomen', 'pelvis', 'cérébral', 'cerebral',
        ];
        if (imagerieKeywords.some(kw => n.includes(kw))) return 'imagerie';

        // ── 3. ANATOMOPATHOLOGIE (Biopsie, histologie, anatomopathologie, anapath, myélogramme)
        const anapathoKeywords = [
            'biopsie', 'histolog', 'anapath', 'anatomopatholog', 'pièce opératoire', 'piece operatoire',
            'exérèse', 'exerese', 'myélogramme', 'myelogramme', 'bom ', 'trepanobi', 'cytoponction',
            'frottis', 'brossage cytologique', 'curetage', 'exfoliative',
        ];
        if (anapathoKeywords.some(kw => n.includes(kw))) return 'anatomopathologie';

        // ── 4. IHC (Immunohistochimie, RE, RP, HER2, Ki67, PDL1, MMR)
        const ihcKeywords = [
            'ihc', 'immunohistochimie', 'immunohistochimi', 're/rp', 'her2', 'ki67', 'pdl1', 'pd-l1',
            'mmr', 'msh2', 'msh6', 'mlh1', 'pms2', 'ttf-1', 'ttf1', 'napsin', 'ck7', 'p40', 'p53',
            'panel sein', 'panel poumon', 'panel ihc', 'récepteurs', 'recepteurs',
            'allred', 'score ihc', 'immunomarquage',
        ];
        if (ihcKeywords.some(kw => n.includes(kw))) return 'IHC';

        // ── 5. PCR / Biologie moléculaire (EGFR, KRAS, mutations, NGS, RT-PCR)
        const pcrKeywords = [
            'pcr', 'ngs', 'mutation', 'egfr', 'kras', 'braf', 'alk', 'ros1', 'ret', 'met',
            'bcr-abl', 'flt3', 'npm1', 'jak2', 'nras', 'her2 mutation', 'brca',
            'biologie moléculaire', 'biologie moleculaire', 'séquençage', 'sequençage', 'sequencage',
            'amplification', 'translocation', 'génétique', 'genetique', 'fish', // fish also here but mainly below
        ];
        if (pcrKeywords.some(kw => n.includes(kw))) {
            // FISH is more specific than PCR – check FISH first
            if (n.includes('fish') || n.includes('hybridation') || n.includes('situ')) return 'FISH';
            return 'pcr_mutation';
        }

        // ── 6. FISH (Hybridation In Situ Fluorescente)
        const fishKeywords = ['fish', 'hybridation in situ', 'hybridization', 'délétion', 'deletion', 'amplif gene'];
        if (fishKeywords.some(kw => n.includes(kw))) return 'FISH';

        // ── 7. SEROLOGIE (VHB, VHC, VIH, HPV, sérologie, virologie)
        const serologieKeywords = [
            'sérolog', 'serolog', 'virolog', 'vhb', 'vhc', 'vih', 'hpv', 'hbs', 'hbc', 'hcv',
            'anticorps', 'antigène', 'antigenique', 'charge virale', 'arv', 'ebv', 'cmv',
            'toxoplasme', 'toxoplasmose', 'agglutination', 'elisa', 'western blot', 'tdr', 'widal',
        ];
        if (serologieKeywords.some(kw => n.includes(kw))) return 'serologie';

        // ── 8. NUMÉRIQUE SIMPLE (tout le reste : marqueurs tumoraux, biochimie simple)
        return 'numerique';
    };

    const handleSaveResult = async (data: any, status: 'draft' | 'validated') => {
        if (!selectedTest || !selectedTemplateId) return;

        const existingEntry = entries.find(e => e.test_name === selectedTest);
        const payload = {
            test_name: selectedTest,
            template_id: selectedTemplateId,
            result_data: data,
            status: status
        };

        try {
            setSubmitting(true);

            if (existingEntry) {
                await api.patch(`/api/lab-requests/${id}/entries/${existingEntry.id}`, payload);
            } else {
                await api.post(`/api/lab-requests/${id}/entries`, payload);
            }

            toast.success(`Résultat ${status === 'validated' ? 'validé' : 'sauvegardé'} avec succès !`);
            setSelectedTest(null);
            fetchData(); // Refresh to update progress
        } catch (error: any) {
            console.error("Save result error", error);
            const msg = error.response?.data?.error || "Erreur lors de la sauvegarde.";
            toast.error(msg);
        } finally {
            setSubmitting(false);
        }
    };

    const handleCompleteRequest = async () => {
        if (!window.confirm("Êtes-vous sûr de vouloir finaliser cette demande ? Le médecin sera notifié et vous ne pourrez plus la modifier.")) return;

        try {
            setSubmitting(true);
            await api.patch(`/api/lab-requests/${id}/complete`, {});
            toast.success("Demande finalisée avec succès ! Le médecin a été notifié.");
            navigate('/laboratory');
        } catch (error) {
            console.error("Complete request error", error);
            toast.error("Erreur lors de la finalisation.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Chargement...</div>;
    if (!request) return null;

    const allTests = request.tests_requested || [];
    const completedCount = entries.filter(e => e.status === 'validated').length;
    const draftCount = entries.filter(e => e.status === 'draft').length;
    const progress = allTests.length > 0 ? (completedCount / allTests.length) * 100 : 0;
    const draftProgress = allTests.length > 0 ? (draftCount / allTests.length) * 100 : 0;
    const isFullyCompleted = completedCount === allTests.length && allTests.length > 0;

    return (
        <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
                <button
                    onClick={() => navigate('/laboratory')}
                    style={{ width: '40px', height: '40px', borderRadius: '50%', border: '1px solid #e2e8f0', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                    <ArrowLeft size={20} color="#475569" />
                </button>
                <div>
                    <h1 style={{ margin: '0 0 4px', fontSize: '24px', fontWeight: '800', color: '#0f172a' }}>
                        Demande Patient: PAT-{request.patient_id.substring(0, 8)}
                    </h1>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
                        Prescrit par Dr. {request.doctor_name} le {new Date(request.created_at).toLocaleDateString()}
                    </p>
                </div>
            </div>

            {/* Read-Only Banner */}
            {readOnly && (
                <div style={{ padding: '16px 24px', backgroundColor: '#f1f5f9', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ backgroundColor: 'white', padding: '10px', borderRadius: '12px', color: '#64748b' }}>
                        <Eye size={24} />
                    </div>
                    <div>
                        <div style={{ fontWeight: '800', color: '#1e293b' }}>Mode Lecture Seule</div>
                        <div style={{ fontSize: '14px', color: '#64748b' }}>Ce bilan appartient à un autre établissement. Vous ne pouvez pas modifier ou valider ces résultats.</div>
                    </div>
                </div>
            )}

            {/* Progress Bar */}
            {request.status !== 'completed' && (
                <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '24px' }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#475569' }}>
                            <span>Progression des résultats</span>
                            <span>{completedCount} / {allTests.length} validés {draftCount > 0 && <span style={{ color: '#f59e0b', marginLeft: '8px' }}>({draftCount} en attente de validation)</span>}</span>
                        </div>
                        <div style={{ height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
                            <div style={{ width: `${progress}%`, height: '100%', backgroundColor: '#10b981', transition: 'width 0.3s' }}></div>
                            <div style={{ width: `${draftProgress}%`, height: '100%', backgroundColor: '#fef3c7', transition: 'width 0.3s' }}></div>
                        </div>
                    </div>
                    <div>
                        <button
                            onClick={handleCompleteRequest}
                            disabled={!isFullyCompleted || submitting || readOnly}
                            style={{
                                padding: '12px 24px', borderRadius: '12px', border: 'none',
                                backgroundColor: (isFullyCompleted && !readOnly) ? '#10b981' : '#cbd5e1',
                                color: 'white', fontWeight: '700', cursor: (isFullyCompleted && !readOnly) ? 'pointer' : 'not-allowed',
                                display: 'flex', alignItems: 'center', gap: '8px', transition: 'background-color 0.2s',
                                opacity: readOnly ? 0.7 : 1
                            }}
                        >
                            <Send size={18} />
                            {readOnly ? 'Consultation Seule' : 'Finaliser la demande'}
                        </button>
                    </div>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '32px' }}>
                {/* Tests List Sidebar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>Examens à traiter</h3>
                    {allTests.map((test: string, idx: number) => {
                        const entry = entries.find(e => e.test_name === test);
                        const isSelected = selectedTest === test;
                        const statusColor = entry?.status === 'validated' ? '#10b981' : entry?.status === 'draft' ? '#f59e0b' : '#64748b';
                        const StatusIcon = entry?.status === 'validated' ? CheckCircle : entry?.status === 'draft' ? FileText : Clock;

                        return (
                            <button
                                key={idx}
                                onClick={() => handleSelectTest(test)}
                                disabled={request.status === 'completed'}
                                style={{
                                    textAlign: 'left', padding: '16px', borderRadius: '12px', cursor: request.status === 'completed' ? 'default' : 'pointer',
                                    border: `2px solid ${isSelected ? '#3b82f6' : '#e2e8f0'}`,
                                    backgroundColor: isSelected ? '#eff6ff' : 'white',
                                    display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.2s'
                                }}
                            >
                                <div style={{ color: statusColor }}><StatusIcon size={20} /></div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>{test}</div>
                                    <div style={{ fontSize: '12px', color: statusColor, marginTop: '2px' }}>
                                        {entry?.status === 'validated' ? 'Validé' : entry?.status === 'draft' ? 'Brouillon' : 'À saisir'}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Main Edit Area */}
                <div>
                    {!selectedTest ? (
                        <div style={{ padding: '60px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '16px', border: '2px dashed #e2e8f0' }}>
                            <FileText size={48} color="#cbd5e1" style={{ marginBottom: '16px' }} />
                            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#475569', margin: '0 0 8px' }}>Sélectionnez un examen</h3>
                            <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
                                Cliquez sur un examen dans la liste pour commencer la saisie structurée des résultats.
                            </p>
                        </div>
                    ) : (
                        <div style={{ animation: 'fadeIn 0.3s ease' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                <div>
                                    <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px' }}>Saisie : {selectedTest}</h2>
                                    <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>Veuillez sélectionner le template approprié pour l'examen.</p>
                                </div>
                                <select
                                    value={selectedTemplateId}
                                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                                    style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', backgroundColor: 'white', fontWeight: '600' }}
                                    disabled={entries.find(e => e.test_name === selectedTest)?.status === 'validated'}
                                >
                                    {Object.keys(RESULT_TEMPLATES).map(key => (
                                        <option key={key} value={key}>{RESULT_TEMPLATES[key].template_nom}</option>
                                    ))}
                                </select>
                            </div>

                            {selectedTemplateId && RESULT_TEMPLATES[selectedTemplateId] ? (
                                <LabResultForm
                                    template={RESULT_TEMPLATES[selectedTemplateId]}
                                    testName={selectedTest || ''}
                                    initialData={entries.find(e => e.test_name === selectedTest)?.result_data}
                                    onSave={handleSaveResult}
                                    readOnly={entries.find(e => e.test_name === selectedTest)?.status === 'validated' || readOnly}
                                />
                            ) : (
                                <div style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <AlertCircle size={18} /> Template non trouvé.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default LabRequestDetailPage;
