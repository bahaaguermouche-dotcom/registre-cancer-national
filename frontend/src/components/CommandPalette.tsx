import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, User, Home, Activity, FileText, ChevronRight, Command } from 'lucide-react';
import api from '../services/api';

const CommandPalette: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setIsLoading(true);
            try {
                const res = await api.get('/api/patients');
                const filtered = res.data.filter((p: any) => 
                    p.name.toLowerCase().includes(query.toLowerCase()) ||
                    p.patient_id_formatted?.toLowerCase().includes(query.toLowerCase())
                ).slice(0, 8);
                
                setResults(filtered);
            } catch (err) {
                console.error("Command Palette Search Error:", err);
            } finally {
                setIsLoading(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);

    const handleSelect = (result: any) => {
        setIsOpen(false);
        setQuery('');
        navigate(`/patients/${result.id}`);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % (results.length || 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + (results.length || 1)) % (results.length || 1));
        } else if (e.key === 'Enter' && results[selectedIndex]) {
            handleSelect(results[selectedIndex]);
        }
    };

    const quickActions = [
        { icon: <Home size={18} />, label: 'Aller au Dashboard', path: '/dashboard' },
        { icon: <Activity size={18} />, label: 'Analytiques & Stats', path: '/analytics' },
        { icon: <FileText size={18} />, label: 'Gestion Patients', path: '/patients' },
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <div 
                    style={{ 
                        position: 'fixed', 
                        inset: 0, 
                        zIndex: 9999, 
                        display: 'flex', 
                        alignItems: 'flex-start', 
                        justifyContent: 'center', 
                        paddingTop: '15vh', 
                        backgroundColor: 'rgba(15, 23, 42, 0.4)', 
                        backdropFilter: 'blur(8px)' 
                    }} 
                    onClick={() => setIsOpen(false)}
                >
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        style={{ 
                            width: '100%', 
                            maxWidth: '640px', 
                            backgroundColor: 'var(--bg-surface)', 
                            borderRadius: '24px', 
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', 
                            overflow: 'hidden', 
                            border: '1px solid var(--border-color)' 
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Search Input Area */}
                        <div style={{ display: 'flex', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border-color)' }}>
                            <Search size={22} style={{ color: 'var(--text-muted)', marginRight: '16px' }} />
                            <input 
                                ref={inputRef}
                                type="text" 
                                placeholder="Rechercher un patient, une action..." 
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                                style={{ 
                                    flex: 1, 
                                    border: 'none', 
                                    outline: 'none', 
                                    fontSize: '18px', 
                                    fontWeight: '500', 
                                    color: 'var(--text-primary)',
                                    backgroundColor: 'transparent'
                                }}
                            />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', backgroundColor: 'var(--bg-main)', borderRadius: '8px', border: '1px solid var(--border-input)', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '700' }}>
                                <span style={{ fontSize: '10px' }}>ESC</span>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div style={{ maxHeight: '400px', overflowY: 'auto', padding: '12px' }}>
                            {!query.trim() ? (
                                <div>
                                    <div style={{ padding: '8px 12px', fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions Rapides</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                                        {quickActions.map((action, idx) => (
                                            <div 
                                                key={idx}
                                                onClick={() => { navigate(action.path); setIsOpen(false); }}
                                                className="command-item"
                                                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '14px', cursor: 'pointer', transition: 'all 0.2s' }}
                                            >
                                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                                                    {action.icon}
                                                </div>
                                                <span style={{ flex: 1, fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>{action.label}</span>
                                                <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : results.length > 0 ? (
                                <div>
                                    <div style={{ padding: '8px 12px', fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Patients Trouvés</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                                        {results.map((patient, idx) => (
                                            <div 
                                                key={patient.id}
                                                onClick={() => handleSelect(patient)}
                                                style={{ 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    gap: '12px', 
                                                    padding: '12px', 
                                                    borderRadius: '14px', 
                                                    cursor: 'pointer', 
                                                    transition: 'all 0.2s', 
                                                    backgroundColor: selectedIndex === idx ? 'rgba(0, 170, 255, 0.1)' : 'transparent' 
                                                }}
                                                onMouseOver={() => setSelectedIndex(idx)}
                                            >
                                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: selectedIndex === idx ? 'rgba(0, 170, 255, 0.2)' : 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: selectedIndex === idx ? 'var(--accent)' : 'var(--text-secondary)' }}>
                                                    <User size={18} />
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: '15px', fontWeight: '700', color: selectedIndex === idx ? 'var(--accent)' : 'var(--text-primary)' }}>{patient.name}</div>
                                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{patient.patient_id_formatted || 'ID: #'+patient.id.substring(0,8)} • {patient.age} ans</div>
                                                </div>
                                                {selectedIndex === idx && <ChevronRight size={16} style={{ color: 'var(--accent)' }} />}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : isLoading ? (
                                <div style={{ padding: '40px', textAlign: 'center' }}>
                                    <div style={{ display: 'inline-block', width: '24px', height: '24px', border: '3px solid var(--border-input)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                                    <div style={{ marginTop: '12px', fontSize: '14px', color: 'var(--text-secondary)' }}>Recherche en cours...</div>
                                </div>
                            ) : (
                                <div style={{ padding: '40px', textAlign: 'center' }}>
                                    <Search size={32} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
                                    <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>Aucun résultat pour "{query}"</div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>Vérifiez l'orthographe ou essayez un autre terme.</div>
                                </div>
                            )}
                        </div>

                        {/* Footer Area */}
                        <div style={{ padding: '12px 24px', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                    <div style={{ padding: '2px 6px', backgroundColor: 'var(--bg-surface)', borderRadius: '4px', border: '1px solid var(--border-input)', fontWeight: '700' }}>↵</div>
                                    <span>Sélectionner</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                    <div style={{ padding: '2px 6px', backgroundColor: 'var(--bg-surface)', borderRadius: '4px', border: '1px solid var(--border-input)', fontWeight: '700' }}>↑↓</div>
                                    <span>Naviguer</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: '600' }}>
                                <Command size={14} />
                                <span>Registry PRO Search</span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .command-item:hover { background-color: rgba(0, 0, 0, 0.02); }
                .dark-theme .command-item:hover { background-color: rgba(255, 255, 255, 0.02); }
            `}</style>
        </AnimatePresence>
    );
};

export default CommandPalette;
