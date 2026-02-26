import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Activity, Shield, Globe,
    BarChart3, Users, ClipboardCheck, ArrowRight,
    LogIn, BookOpen, Microscope, ChevronRight
} from 'lucide-react';

const HomePage: React.FC = () => {
    const navigate = useNavigate();

    const features = [
        {
            icon: <Shield className="text-blue-600" size={24} />,
            title: "Sécurité & Confidentialité",
            description: "Protection rigoureuse des données patient conforme aux normes internationales de santé."
        },
        {
            icon: <Globe className="text-blue-600" size={24} />,
            title: "Couverture Nationale",
            description: "Unification des données oncologiques à travers tous les centres hospitaliers du pays."
        },
        {
            icon: <BarChart3 className="text-blue-600" size={24} />,
            title: "Analyse Prédictive",
            description: "Outils avancés pour l'épidémiologie et l'aide à la décision en santé publique."
        }
    ];

    const news = [
        {
            date: "12 Fév 2026",
            category: "Intelligence Artificielle",
            title: "IA et Dépistage Précoce : Une avancée majeure dans le cancer du poumon",
            summary: "Une nouvelle étude publiée dans Nature montre comment les algorithmes d'IA surperforment les radiologues dans la détection des nodules précoces."
        },
        {
            date: "08 Fév 2026",
            category: "Immunothérapie",
            title: "Résultats prometteurs pour les nouveaux vaccins à ARN messager",
            summary: "Les essais cliniques de phase III révèlent une réduction de 40% du risque de récidive pour le mélanome avancé."
        },
        {
            date: "01 Fév 2026",
            category: "Politique de Santé",
            title: "OMS : Nouveau plan mondial pour l'accès aux soins oncologiques",
            summary: "Un investissement de 5 milliards de dollars annoncé pour renforcer les registres du cancer dans les pays en développement."
        }
    ];

    const discoveries = [
        {
            title: "Biopsie Liquide Multi-Organes",
            tag: "Diagnostic",
            desc: "Détection de 50 types de cancers via une simple prise de sang avec une spécificité de 99%."
        },
        {
            title: "Édition Génomique CRISPR-Cas9",
            tag: "Thérapie",
            desc: "Première application réussie de reprogrammation lymphocytaire in-vivo pour cibler les tumeurs solides."
        },
        {
            title: "Cartographie Métabolique 4D",
            tag: "Recherche",
            desc: "Visualisation inédite de la consommation de glucose intracellulaire en temps réel dans les tissus tumoraux."
        }
    ];

    const stats = [
        { label: "Patients Suivis", value: "45,000+" },
        { label: "Centres Connectés", value: "128" },
        { label: "Précision Diagnostique", value: "99.2%" },
        { label: "Mise à jour en Temps Réel", value: "< 1s" }
    ];

    return (
        <div style={{ backgroundColor: '#ffffff', minHeight: '100vh', color: '#0f172a' }}>
            {/* Navigation Header */}
            <header style={{
                position: 'fixed', top: 0, left: 0, right: 0, height: '80px',
                backgroundColor: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(12px)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0 5%', zIndex: 1000, borderBottom: '1px solid #f1f5f9'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '40px', height: '40px', borderRadius: '12px',
                        backgroundColor: '#2563eb', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', color: 'white'
                    }}>
                        <Activity size={24} />
                    </div>
                    <span style={{ fontSize: '20px', fontWeight: '800', letterSpacing: '-0.02em', color: '#1e293b' }}>
                        RO<span style={{ color: '#2563eb' }}>NATIONAL</span>
                    </span>
                </div>

                <nav style={{ display: 'flex', alignItems: 'center', gap: '40px' }}>
                    <a href="#mission" className="nav-link-home">Notre Mission</a>
                    <a href="#news" className="nav-link-home">Actualités</a>
                    <a href="#discoveries" className="nav-link-home">Découvertes</a>
                    <a href="#impact" className="nav-link-home">Impact</a>
                    <button
                        onClick={() => navigate('/login')}
                        style={{
                            padding: '10px 24px', borderRadius: '12px', backgroundColor: '#0f172a',
                            color: 'white', fontWeight: '700', border: 'none', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s'
                        }}
                    >
                        <LogIn size={18} />
                        Portail Pro
                    </button>
                </nav>
            </header>

            {/* Hero Section */}
            <section style={{
                padding: '180px 5% 100px', background: 'radial-gradient(circle at 100% 0%, #f0f9ff 0%, #ffffff 50%)',
                display: 'flex', alignItems: 'center', gap: '60px', position: 'relative', overflow: 'hidden'
            }}>
                <div style={{ flex: 1, position: 'relative', zIndex: 10 }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px',
                        borderRadius: '99px', backgroundColor: '#eff6ff', color: '#2563eb',
                        fontSize: '13px', fontWeight: '700', marginBottom: '24px'
                    }}>
                        <ClipboardCheck size={14} /> Système National Amélioré v3.0
                    </div>
                    <h1 style={{
                        fontSize: '64px', fontWeight: '900', color: '#0f172a',
                        lineHeight: '1.1', marginBottom: '24px', letterSpacing: '-0.03em'
                    }}>
                        L'oncologie pilotée <br />
                        <span style={{ color: '#2563eb' }}>par la précision.</span>
                    </h1>
                    <p style={{
                        fontSize: '20px', color: '#64748b', lineHeight: '1.6',
                        marginBottom: '40px', maxWidth: '580px'
                    }}>
                        Bienvenue sur la plateforme centralisée du Registre National du Cancer.
                        Un écosystème intelligent dédié à la collecte, l'analyse et la valorisation
                        des données pour transformer les soins oncologiques.
                    </p>
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <button
                            onClick={() => navigate('/login')}
                            style={{
                                padding: '16px 32px', borderRadius: '16px', backgroundColor: '#2563eb',
                                color: 'white', fontWeight: '700', border: 'none', cursor: 'pointer',
                                fontSize: '16px', display: 'flex', alignItems: 'center', gap: '10px',
                                boxShadow: '0 20px 25px -5px rgba(37, 99, 235, 0.2)'
                            }}
                        >
                            Accéder au Registre <ArrowRight size={20} />
                        </button>
                        <button style={{
                            padding: '16px 32px', borderRadius: '16px', backgroundColor: 'transparent',
                            color: '#0f172a', fontWeight: '700', border: '1px solid #e2e8f0',
                            cursor: 'pointer', fontSize: '16px'
                        }}>
                            Consulter les Rapports
                        </button>
                    </div>
                </div>

                <div style={{ flex: 1, display: 'flex', justifyContent: 'center', position: 'relative' }}>
                    <div style={{
                        width: '100%', height: '500px', borderRadius: '40px',
                        background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                        boxShadow: '0 40px 100px -20px rgba(0, 0, 0, 0.15)',
                        overflow: 'hidden', position: 'relative'
                    }}>
                        {/* Placeholder for dynamic image */}
                        <div style={{
                            position: 'absolute', inset: 0, opacity: 0.1,
                            background: 'url("https://www.transparenttextures.com/patterns/cubes.png")'
                        }} />
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            height: '100%', flexDirection: 'column', gap: '20px'
                        }}>
                            <div className="pulse-circle" />
                            <Activity color="white" size={120} strokeWidth={1} />
                        </div>
                    </div>
                    {/* Floating Info Card */}
                    <div style={{
                        position: 'absolute', bottom: '-30px', left: '0',
                        backgroundColor: 'white', padding: '24px', borderRadius: '24px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                        border: '1px solid #f1f5f9', display: 'flex', gap: '20px', alignItems: 'center'
                    }}>
                        <div style={{
                            width: '48px', height: '48px', borderRadius: '50%',
                            backgroundColor: '#f0f9ff', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', color: '#2563eb'
                        }}>
                            <Users size={24} />
                        </div>
                        <div>
                            <div style={{ fontSize: '24px', fontWeight: '800' }}>45k</div>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>Données Patient Sécurisées</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="mission" style={{ padding: '100px 5%', backgroundColor: '#f8fafc' }}>
                <div style={{ textAlign: 'center', marginBottom: '60px' }}>
                    <h2 style={{ fontSize: '36px', fontWeight: '800', marginBottom: '16px' }}>Une Excellence Normative</h2>
                    <p style={{ color: '#64748b', fontSize: '18px', maxWidth: '700px', margin: '0 auto' }}>
                        Déployé selon les standards de l'OMS et de l'IARC, notre système garantit l'interopérabilité
                        et la qualité totale des données de santé.
                    </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '40px' }}>
                    {features.map((f, i) => (
                        <div key={i} className="feature-card-home" style={{
                            padding: '40px', backgroundColor: 'white', borderRadius: '32px',
                            border: '1px solid #f1f5f9', transition: 'all 0.3s'
                        }}>
                            <div style={{
                                width: '56px', height: '56px', borderRadius: '16px',
                                backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center',
                                justifyContent: 'center', marginBottom: '24px'
                            }}>
                                {f.icon}
                            </div>
                            <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px' }}>{f.title}</h3>
                            <p style={{ color: '#64748b', lineHeight: '1.6' }}>{f.description}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* News Section */}
            <section id="news" style={{ padding: '100px 5%', backgroundColor: '#ffffff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '60px' }}>
                    <div>
                        <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px',
                            borderRadius: '8px', backgroundColor: '#fff7ed', color: '#c2410c',
                            fontSize: '12px', fontWeight: '800', marginBottom: '16px', textTransform: 'uppercase'
                        }}>
                            <BookOpen size={14} /> Actualités Mondiales
                        </div>
                        <h2 style={{ fontSize: '36px', fontWeight: '800' }}>Dernières Avancées en Oncologie</h2>
                    </div>
                    <button className="nav-link-home" style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        Voir tout le flux <ChevronRight size={18} />
                    </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '32px' }}>
                    {news.map((item, i) => (
                        <div key={i} className="news-card-home" style={{
                            padding: '32px', borderRadius: '24px', backgroundColor: '#f8fafc',
                            border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '16px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '12px', fontWeight: '700', color: '#2563eb' }}>{item.category}</span>
                                <span style={{ fontSize: '12px', color: '#94a3b8' }}>{item.date}</span>
                            </div>
                            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b', lineHeight: '1.4' }}>{item.title}</h3>
                            <p style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.6' }}>{item.summary}</p>
                            <div style={{ marginTop: 'auto', paddingTop: '16px', display: 'flex', alignItems: 'center', gap: '4px', color: '#2563eb', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
                                Lire la suite <ArrowRight size={14} />
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Discoveries Section */}
            <section id="discoveries" style={{ padding: '100px 5%', backgroundColor: '#f8fafc', position: 'relative', overflow: 'hidden' }}>
                {/* Decorative Elements */}
                <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,99,235,0.05) 0%, transparent 70%)' }} />

                <div style={{ textAlign: 'center', marginBottom: '60px', position: 'relative', zIndex: 1 }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px',
                        borderRadius: '8px', backgroundColor: '#f0fdf4', color: '#15803d',
                        fontSize: '12px', fontWeight: '800', marginBottom: '16px', textTransform: 'uppercase'
                    }}>
                        <Microscope size={14} /> Percées Scientifiques
                    </div>
                    <h2 style={{ fontSize: '36px', fontWeight: '800' }}>Découvertes Globales Récentes</h2>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '32px', position: 'relative', zIndex: 1 }}>
                    {discoveries.map((d, i) => (
                        <div key={i} className="discovery-tile" style={{
                            padding: '40px', borderRadius: '32px', border: '1px solid #e2e8f0',
                            backgroundColor: 'white', position: 'relative', transition: 'all 0.3s'
                        }}>
                            <div style={{
                                position: 'absolute', top: '24px', right: '24px',
                                padding: '4px 12px', borderRadius: '99px', backgroundColor: '#f1f5f9',
                                fontSize: '10px', fontWeight: '800', color: '#475569'
                            }}>
                                {d.tag}
                            </div>
                            <h3 style={{ fontSize: '22px', fontWeight: '900', marginBottom: '16px', color: '#0f172a' }}>{d.title}</h3>
                            <p style={{ color: '#64748b', lineHeight: '1.7', fontSize: '15px' }}>{d.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Stats Section */}
            <section id="impact" style={{ padding: '100px 5%', backgroundColor: '#0f172a', color: 'white' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', textAlign: 'center' }}>
                    {stats.map((s, i) => (
                        <div key={i}>
                            <div style={{ fontSize: '48px', fontWeight: '900', color: '#38bdf8', marginBottom: '8px' }}>{s.value}</div>
                            <div style={{ fontSize: '14px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.label}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* CTA Section */}
            <section style={{ padding: '120px 5%', textAlign: 'center' }}>
                <div style={{
                    padding: '80px', borderRadius: '48px',
                    background: 'linear-gradient(135deg, #2563eb, #1e40af)',
                    color: 'white', position: 'relative', overflow: 'hidden'
                }}>
                    <div style={{ position: 'relative', zIndex: 10 }}>
                        <h2 style={{ fontSize: '48px', fontWeight: '800', marginBottom: '24px' }}>Rejoignez le Réseau Scientifique</h2>
                        <p style={{ fontSize: '20px', opacity: 0.9, marginBottom: '40px', maxWidth: '600px', margin: '0 auto 40px' }}>
                            Accédez à des outils analytiques de pointe et collaborez pour une
                            meilleure prise en charge du cancer en Algérie.
                        </p>
                        <button
                            onClick={() => navigate('/login')}
                            style={{
                                padding: '18px 48px', borderRadius: '20px', backgroundColor: 'white',
                                color: '#2563eb', fontWeight: '800', border: 'none', cursor: 'pointer',
                                fontSize: '18px', boxShadow: '0 20px 30px -10px rgba(0,0,0,0.3)'
                            }}
                        >
                            Démarrer maintenant
                        </button>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer style={{ padding: '60px 5%', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '14px' }}>
                <div>© 2026 Registre National du Cancer. Tous droits réservés.</div>
                <div style={{ display: 'flex', gap: '30px' }}>
                    <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Mentions Légales</a>
                    <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Confidentialité</a>
                    <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Accessibilité</a>
                </div>
            </footer>

            <style>{`
                .nav-link-home {
                    text-decoration: none;
                    color: #475569;
                    font-weight: 700;
                    font-size: 15px;
                    transition: color 0.2s;
                }
                .nav-link-home:hover {
                    color: #2563eb;
                }
                .feature-card-home:hover {
                    transform: translateY(-10px);
                    box-shadow: 0 30px 60px -12px rgba(0, 0, 0, 0.08);
                    border-color: #2563eb !important;
                }
                .news-card-home {
                    transition: all 0.3s ease;
                    cursor: pointer;
                }
                .news-card-home:hover {
                    background-color: #ffffff !important;
                    transform: translateY(-8px);
                    box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.05);
                    border-color: #e2e8f0 !important;
                }
                .discovery-tile {
                    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    cursor: pointer;
                }
                .discovery-tile:hover {
                    transform: scale(1.02);
                    box-shadow: 0 40px 80px -20px rgba(37, 99, 235, 0.1);
                    border-color: #2563eb !important;
                }
                .pulse-circle {
                    position: absolute;
                    width: 200px;
                    height: 200px;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.2);
                    animation: pulse 2s infinite;
                }
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 0.5; }
                    100% { transform: scale(2); opacity: 0; }
                }
            `}</style>
        </div>
    );
};

export default HomePage;
