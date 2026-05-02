export const RESULT_TEMPLATES: Record<string, any> = {
    numerique: {
        template_id: "numerique",
        template_nom: "Analyse Numérique Simple",
        laboratoire: "Biologie Clinique",
        tag: "B",
        description: "Une seule valeur numérique avec unité et valeurs de référence",
        parametres_template: {
            analyse_nom: "string — ex: LDH, CEA, PSA, Créatinine",
            unite: "string — ex: U/L, ng/mL, µmol/L",
            normale_min: "number",
            normale_max: "number",
            normale_texte: "string optionnel — ex: < 5 ng/mL"
        },
        champs_formulaire: [
            { id: "valeur", label: "Valeur mesurée", type: "number", obligatoire: true, unite: "{{unite}}" },
            { id: "interpretation", label: "Interprétation", type: "select", obligatoire: true, options: ["Normal", "Élevé", "Très élevé", "Bas", "Critique"] },
            { id: "methode", label: "Méthode utilisée", type: "text", obligatoire: false, placeholder: "ex: ECLIA, colorimétrie..." },
            { id: "date_prelevement", label: "Date de prélèvement", type: "date", obligatoire: true },
            { id: "date_analyse", label: "Date d'analyse", type: "date", obligatoire: true },
            { id: "commentaire", label: "Commentaire", type: "textarea", obligatoire: false, placeholder: "Observations particulières..." }
        ],
        valeurs_reference: { min: "{{normale_min}}", max: "{{normale_max}}", texte: "{{normale_texte}}", alerte_critique: true },
        exemples_analyses: ["LDH", "CEA", "CA 19-9", "CA 125", "CA 15-3", "AFP", "PSA total", "NSE", "HCG totale", "Cyfra 21-1", "SCC", "S100-B", "PTH", "Thyroglobuline", "Chromogranine A", "Mésothéline", "CRP", "Créatinine", "Urée", "Acide urique", "Bilirubine totale", "Phosphatase alcaline", "LDH", "Ferritine", "Bêta-2 microglobuline"]
    },

    bilan_groupe: {
        template_id: "bilan_groupe",
        template_nom: "Bilan Groupé",
        laboratoire: "Biologie Clinique",
        tag: "B",
        description: "Plusieurs valeurs numériques liées dans un même bilan",
        bilans_disponibles: {
            NFS: {
                nom: "Numération Formule Sanguine",
                champs: [
                    { id: "globules_rouges", label: "Globules rouges", unite: "10⁶/µL", min: 4.5, max: 5.5 },
                    { id: "hemoglobine", label: "Hémoglobine", unite: "g/dL", min: 12.0, max: 17.5 },
                    { id: "hematocrite", label: "Hématocrite", unite: "%", min: 36, max: 52 },
                    { id: "VGM", label: "VGM", unite: "fL", min: 80, max: 100 },
                    { id: "globules_blancs", label: "Globules blancs", unite: "10³/µL", min: 4.0, max: 10.0 },
                    { id: "neutrophiles", label: "Neutrophiles", unite: "%", min: 50, max: 70 },
                    { id: "lymphocytes", label: "Lymphocytes", unite: "%", min: 20, max: 40 },
                    { id: "monocytes", label: "Monocytes", unite: "%", min: 2, max: 8 },
                    { id: "eosinophiles", label: "Éosinophiles", unite: "%", min: 1, max: 4 },
                    { id: "plaquettes", label: "Plaquettes", unite: "10³/µL", min: 150, max: 400 }
                ]
            },
            "Bilan hépatique (ASAT/ALAT/PAL/GGT)": {
                nom: "Bilan Hépatique",
                champs: [
                    { id: "ASAT", label: "ASAT (TGO)", unite: "U/L", min: 10, max: 40 },
                    { id: "ALAT", label: "ALAT (TGP)", unite: "U/L", min: 7, max: 56 },
                    { id: "GGT", label: "GGT", unite: "U/L", min: 8, max: 61 },
                    { id: "PAL", label: "Phosphatase alcaline", unite: "U/L", min: 44, max: 147 },
                    { id: "bilirubine_totale", label: "Bilirubine totale", unite: "µmol/L", min: 3, max: 17 },
                    { id: "bilirubine_directe", label: "Bilirubine directe", unite: "µmol/L", min: 0, max: 5 },
                    { id: "albumine", label: "Albumine", unite: "g/L", min: 35, max: 50 },
                    { id: "TP", label: "TP (Taux de prothrombine)", unite: "%", min: 70, max: 100 }
                ]
            },
            "Bilan rénal (Urée/Créatinine)": {
                nom: "Bilan Rénal",
                champs: [
                    { id: "creatinine", label: "Créatinine", unite: "µmol/L", min: 62, max: 106 },
                    { id: "DFG", label: "DFG (CKD-EPI)", unite: "mL/min", min: 60, max: 120 },
                    { id: "uree", label: "Urée", unite: "mmol/L", min: 2.5, max: 7.5 },
                    { id: "acide_urique", label: "Acide urique", unite: "µmol/L", min: 200, max: 420 }
                ]
            },
            "Bilan de coagulation": {
                nom: "Bilan de Coagulation",
                champs: [
                    { id: "TP", label: "TP", unite: "%", min: 70, max: 100 },
                    { id: "TCA", label: "TCA", unite: "sec", min: 25, max: 35 },
                    { id: "fibrinogene", label: "Fibrinogène", unite: "g/L", min: 2.0, max: 4.0 },
                    { id: "d_dimeres", label: "D-Dimères", unite: "µg/L", min: 0, max: 500 }
                ]
            },
            "Ionogramme sanguin": {
                nom: "Bilan Métabolique",
                champs: [
                    { id: "glycemie", label: "Glycémie", unite: "mmol/L", min: 3.9, max: 6.1 },
                    { id: "calcemie", label: "Calcémie", unite: "mmol/L", min: 2.2, max: 2.6 },
                    { id: "phosphore", label: "Phosphore", unite: "mmol/L", min: 0.8, max: 1.5 },
                    { id: "potassium", label: "Kaliémie (K+)", unite: "mmol/L", min: 3.5, max: 5.0 },
                    { id: "sodium", label: "Natrémie (Na+)", unite: "mmol/L", min: 136, max: 145 },
                    { id: "magnesium", label: "Magnésium", unite: "mmol/L", min: 0.7, max: 1.0 }
                ]
            },
            "Bilan thyroïdien": {
                nom: "Bilan Thyroïdien",
                champs: [
                    { id: "TSH", label: "TSH", unite: "mUI/L", min: 0.4, max: 4.0 },
                    { id: "T4L", label: "T4 libre", unite: "pmol/L", min: 10.0, max: 22.0 },
                    { id: "T3L", label: "T3 libre", unite: "pmol/L", min: 3.1, max: 6.8 }
                ]
            },
            "Electrophorèse des protéines sériques (EPS)": {
                nom: "Électrophorèse des Protéines Sériques",
                champs: [
                    { id: "proteines_totales", label: "Protéines totales", unite: "g/L", min: 60, max: 80 },
                    { id: "albumine", label: "Albumine", unite: "%", min: 55, max: 68 },
                    { id: "alpha1", label: "Alpha-1 globulines", unite: "%", min: 2, max: 4 },
                    { id: "alpha2", label: "Alpha-2 globulines", unite: "%", min: 7, max: 12 },
                    { id: "beta", label: "Bêta globulines", unite: "%", min: 9, max: 15 },
                    { id: "gamma", label: "Gamma globulines", unite: "%", min: 11, max: 22 },
                    { id: "pic_M", label: "Pic M détecté", type: "boolean", valeur_normale: false },
                    { id: "pic_M_taux", label: "Taux pic M (si présent)", unite: "g/L", obligatoire: false }
                ]
            }
        },
        champs_communs: [
            { id: "date_prelevement", label: "Date de prélèvement", type: "date", obligatoire: true },
            { id: "date_analyse", label: "Date d'analyse", type: "date", obligatoire: true },
            { id: "commentaire", label: "Commentaire global", type: "textarea", obligatoire: false }
        ]
    },

    pcr_mutation: {
        template_id: "pcr_mutation",
        template_nom: "PCR / Biologie Moléculaire",
        laboratoire: "Anatomopathologie",
        tag: "A",
        description: "Détection de mutations génétiques, translocations, amplifications par PCR/NGS",
        champs_formulaire: [
            { id: "gene_cible", label: "Gène / Mutation ciblée", type: "text", obligatoire: true, placeholder: "ex: EGFR, KRAS G12C, BCR-ABL, FLT3-ITD" },
            { id: "methode", label: "Méthode d'analyse", type: "select", obligatoire: true, options: ["PCR standard", "PCR quantitative (qPCR)", "RT-PCR", "ddPCR", "NGS panel", "Séquençage Sanger", "MLPA"] },
            { id: "resultat_qualitatif", label: "Résultat", type: "select", obligatoire: true, options: ["Positif (Muté)", "Négatif (Sauvage)", "Non conclusif", "Insuffisant (refaire)"] },
            { id: "resultat_quantitatif", label: "Valeur quantitative (si applicable)", type: "number", obligatoire: false, placeholder: "ex: 0.85" },
            { id: "unite_quantitatif", label: "Unité", type: "text", obligatoire: false, placeholder: "ex: % IS, copies/µL, ratio" },
            { id: "exons_testes", label: "Exons / Régions analysés", type: "text", obligatoire: false, placeholder: "ex: Exons 18, 19, 20, 21" },
            { id: "type_mutation", label: "Type de mutation (si positif)", type: "text", obligatoire: false, placeholder: "ex: Délétion exon 19, L858R, T790M" },
            { id: "allele_frequence", label: "Fréquence allélique (%)", type: "number", obligatoire: false, placeholder: "ex: 35.2" },
            { id: "tissu_analyse", label: "Tissu / Source analysée", type: "select", obligatoire: true, options: ["Biopsie tumorale", "Sang périphérique", "Moelle osseuse", "LCR", "Urine", "ADN tumoral circulant (ctDNA)"] },
            { id: "qualite_ADN", label: "Qualité de l'ADN extrait", type: "select", obligatoire: false, options: ["Suffisante", "Limite", "Insuffisante"] },
            { id: "interpretation_clinique", label: "Interprétation clinique", type: "textarea", obligatoire: true, placeholder: "Significance clinique de la mutation détectée, impact thérapeutique..." },
            { id: "date_prelevement", label: "Date de prélèvement", type: "date", obligatoire: true },
            { id: "date_analyse", label: "Date d'analyse", type: "date", obligatoire: true },
            { id: "commentaire", label: "Commentaire", type: "textarea", obligatoire: false }
        ],
        alertes: [
            { condition: "resultat_qualitatif == 'Positif (Muté)'", message: "Mutation détectée — informer le médecin prescripteur immédiatement", niveau: "info" },
            { condition: "resultat_qualitatif == 'Insuffisant (refaire)'", message: "Qualité insuffisante — nouveau prélèvement requis", niveau: "warning" }
        ]
    },

    IHC: {
        template_id: "IHC",
        template_nom: "Immunohistochimie (IHC)",
        laboratoire: "Anatomopathologie",
        tag: "A",
        description: "Détection de protéines sur coupes tissulaires par anticorps marqués",
        panels_disponibles: {
            "Panel Immunohistochimique Sein (RE/RP/HER2/Ki67)": {
                nom: "Panel Cancer du Sein (RE/RP/HER2/Ki67)",
                marqueurs: [
                    { id: "RE", label: "Récepteurs aux Œstrogènes (RE)", type: "score_allred", score_min: 0, score_max: 8, seuil_positif: 3 },
                    { id: "RP", label: "Récepteurs à la Progestérone (RP)", type: "score_allred", score_min: 0, score_max: 8, seuil_positif: 3 },
                    { id: "HER2", label: "HER2", type: "score_0_3", options_score: ["0", "1+", "2+", "3+"], seuil_positif: "3+", note_2plus: "Score 2+ → FISH obligatoire", alerte: true },
                    { id: "Ki67", label: "Ki67 (index de prolifération)", type: "pourcentage", unite: "%", seuils: { bas: 14, intermediaire: 20, eleve: 30 } }
                ]
            },
            "Panel IHC Poumon (TTF-1/Napsin-A/p40)": {
                nom: "Panel Cancer du Poumon (TTF-1/Napsin-A/p40/CK7)",
                marqueurs: [
                    { id: "TTF1", label: "TTF-1", type: "positif_negatif", note: "Positif = adénocarcinome ou SCLC" },
                    { id: "NapsinA", label: "Napsin-A", type: "positif_negatif", note: "Positif = adénocarcinome" },
                    { id: "p40", label: "p40", type: "positif_negatif", note: "Positif = carcinome épidermoïde" },
                    { id: "CK7", label: "CK7", type: "positif_negatif" },
                    { id: "CK5_6", label: "CK5/6", type: "positif_negatif", note: "Positif = épidermoïde" }
                ]
            },
            "PD-L1 (TPS/CPS)": {
                nom: "PDL1 (Check-point immunitaire)",
                marqueurs: [
                    { id: "PDL1_TPS", label: "PDL1 — Score TPS (Tumor Proportion Score)", type: "pourcentage", unite: "%", seuils: { negatif: 0, faible: 1, positif: 50 } },
                    { id: "PDL1_CPS", label: "PDL1 — Score CPS (Combined Positive Score)", type: "nombre", seuils: { seuil_1: 1, seuil_10: 10 } },
                    { id: "clone_anticorps", label: "Clone anticorps utilisé", type: "select", options: ["22C3 (Dako)", "28-8 (Dako)", "SP142 (Ventana)", "SP263 (Ventana)", "73-10"] }
                ]
            },
            "Panel MMR (Instabilité Microsatellitaire)": {
                nom: "Panel MMR — Instabilité Microsatellitaire",
                marqueurs: [
                    { id: "MLH1", label: "MLH1", type: "present_absent", note: "Absent = perte d'expression" },
                    { id: "MSH2", label: "MSH2", type: "present_absent" },
                    { id: "MSH6", label: "MSH6", type: "present_absent" },
                    { id: "PMS2", label: "PMS2", type: "present_absent" },
                    { id: "statut_MMR", label: "Statut MMR global", type: "select", options: ["pMMR (proficient — stable)", "dMMR (deficient — instable MSI-H)"] }
                ]
            }
        },
        champs_communs: [
            { id: "tissu_source", label: "Tissu source", type: "text", obligatoire: true, placeholder: "ex: Biopsie ganglionnaire" },
            { id: "fixation", label: "Fixateur utilisé", type: "select", options: ["Formol tamponné 10%", "AFA", "Glutaraldéhyde", "Autre"], obligatoire: false },
            { id: "qualite_tissu", label: "Qualité du tissu", type: "select", options: ["Satisfaisante", "Limite", "Insuffisante — à refaire"], obligatoire: true },
            { id: "conclusion", label: "Conclusion immunohistochimique", type: "textarea", obligatoire: true, placeholder: "Résumé des résultats..." },
            { id: "date_reception_bloc", label: "Date réception du bloc", type: "date", obligatoire: true },
            { id: "date_resultat", label: "Date du résultat", type: "date", obligatoire: true }
        ]
    },

    FISH: {
        template_id: "FISH",
        template_nom: "FISH — Hybridation In Situ Fluorescente",
        laboratoire: "Anatomopathologie",
        tag: "A",
        description: "Détection d'amplification, délétion ou translocation chromosomique",
        champs_formulaire: [
            { id: "gene_sonde", label: "Gène / Sonde utilisée", type: "text", obligatoire: true, placeholder: "ex: ALK, HER2, MYC, BCL2" },
            { id: "type_anomalie_recherchee", label: "Type d'anomalie recherchée", type: "select", obligatoire: true, options: ["Amplification", "Délétion", "Translocation / Fusion", "Gain", "Perte hétérozygotie", "Co-délétion 1p/19q"] },
            { id: "resultat", label: "Résultat", type: "select", obligatoire: true, options: ["Normal", "Amplifié", "Délété (hétérozygote)", "Délété (homozygote)", "Translocation détectée", "Gain", "Non conclusif", "Insuffisant"] },
            { id: "ratio", label: "Ratio signal / centromère", type: "number", obligatoire: false, placeholder: "ex: 2.4" },
            { id: "nb_copies_moyennes", label: "Nombre moyen de copies par cellule", type: "number", obligatoire: false, placeholder: "ex: 6.2" },
            { id: "nb_cellules_comptees", label: "Nombre de cellules comptées", type: "number", obligatoire: true, placeholder: "ex: 20" },
            { id: "pourcentage_cellules_positives", label: "% cellules avec anomalie", type: "number", unite: "%", obligatoire: false, placeholder: "ex: 85" },
            { id: "sonde_centromere", label: "Sonde centromérique utilisée", type: "text", obligatoire: false, placeholder: "ex: CEP17 pour HER2" },
            { id: "interpretation", label: "Interprétation clinique", type: "textarea", obligatoire: true, placeholder: "Significance de l'anomalie détectée..." },
            { id: "date_prelevement", label: "Date de prélèvement", type: "date", obligatoire: true },
            { id: "date_resultat", label: "Date du résultat", type: "date", obligatoire: true },
            { id: "commentaire", label: "Commentaire", type: "textarea", obligatoire: false }
        ],
        seuils_interpretation: {
            HER2: { ratio_amplification: 2.0, copies_amplification: 6.0, note: "ASCO/CAP 2018" },
            ALK: { pourcentage_positif: 15, note: "Réarrangement si >15% cellules positives" }
        }
    },

    imagerie: {
        template_id: "imagerie",
        template_nom: "Imagerie Médicale",
        laboratoire: "Radiologie",
        tag: "R",
        description: "Compte-rendu d'imagerie structuré (Scanner, IRM, PET, Échographie...)",
        types_imagerie: {
            "Scanner TAP (Thorax-Abdomen-Pelvis)": {
                nom: "Scanner TAP",
                sections: [
                    {
                        id: "thorax", titre: "Thorax", champs: [
                            { id: "tumeur_pulmonaire", label: "Lésion pulmonaire", type: "boolean" },
                            { id: "localisation_pulm", label: "Localisation", type: "text", obligatoire_si: "tumeur_pulmonaire" },
                            { id: "taille_tumeur", label: "Taille max", type: "number", unite: "mm" },
                            { id: "adenopathies_med", label: "Adénopathies médiastinales", type: "boolean" },
                            { id: "epanchement_pleural", label: "Épanchement pleural", type: "select", options: ["Absent", "Minime", "Modéré", "Abondant"] }
                        ]
                    },
                    {
                        id: "abdomen", titre: "Abdomen", champs: [
                            { id: "foie_metastases", label: "Métastases hépatiques", type: "boolean" },
                            { id: "foie_nb", label: "Nombre (si présentes)", type: "select", options: ["1", "2-3", "4-5", ">5", "Innombrables"] },
                            { id: "ADP_abdominales", label: "Adénopathies abdominales", type: "boolean" },
                            { id: "ascite", label: "Ascite", type: "select", options: ["Absente", "Minime", "Modérée", "Abondante"] }
                        ]
                    },
                    {
                        id: "os", titre: "Os et Tissus Mous", champs: [
                            { id: "metastases_osseuses", label: "Métastases osseuses", type: "boolean" }
                        ]
                    }
                ]
            },
            "IRM cérébrale": {
                nom: "IRM Cérébrale",
                sections: [
                    {
                        id: "lesion_principale", titre: "Lésion principale", champs: [
                            { id: "presence_lesion", label: "Lésion cérébrale", type: "boolean" },
                            { id: "localisation", label: "Localisation", type: "text" },
                            { id: "prise_contraste", label: "Prise de contraste", type: "select", options: ["Absente", "Annulaire", "Nodulaire", "Homogène", "Hétérogène"] },
                            { id: "oedeme", label: "Œdème péri-lésionnel", type: "select", options: ["Absent", "Minime", "Modéré", "Important"] },
                            { id: "effet_masse", label: "Effet de masse", type: "boolean" }
                        ]
                    }
                ]
            },
            "PET-Scan": {
                nom: "PET-Scan FDG",
                sections: [
                    {
                        id: "tumeur_primitive", titre: "Tumeur primitive", champs: [
                            { id: "SUV_max_primitif", label: "SUVmax tumeur primitive", type: "number" },
                            { id: "taille_primitive", label: "Taille", type: "number", unite: "mm" }
                        ]
                    },
                    {
                        id: "extension", titre: "Extension à distance", champs: [
                            { id: "ADP_hypermetaboliques", label: "Adénopathies hypermétaboliques", type: "boolean" },
                            { id: "metastases_viscerales", label: "Métastases viscérales", type: "boolean" },
                            { id: "SUV_max_meta", label: "SUVmax métastase la plus active", type: "number" }
                        ]
                    }
                ]
            }
        },
        champs_communs: [
            { id: "indication", label: "Indication clinique", type: "text", obligatoire: true, placeholder: "ex: Bilan extension" },
            { id: "injection_contraste", label: "Injection de produit de contraste", type: "boolean" },
            { id: "produit_contraste", label: "Produit de contraste utilisé", type: "text" },
            { id: "comparaison_precedent", label: "Comparaison avec examen précédent", type: "boolean" },
            { id: "evolution", label: "Évolution", type: "select", options: ["Amélioration", "Stabilité", "Progression", "Non comparable", "Premier examen"] },
            { id: "conclusion", label: "Conclusion radiologique", type: "textarea", obligatoire: true },
            { id: "date_examen", label: "Date de l'examen", type: "date", obligatoire: true },
            { id: "medecin_radiologue", label: "Radiologue", type: "text", obligatoire: true }
        ]
    },

    anatomopathologie: {
        template_id: "anatomopathologie",
        template_nom: "Anatomopathologie — Compte-Rendu",
        laboratoire: "Anatomopathologie",
        tag: "A",
        description: "Examen histologique de tissu biopsié ou réséqué",
        types_examen: {
            "Biopsie histologique": {
                nom: "Biopsie",
                champs: [
                    { id: "site_prelevement", label: "Site de prélèvement", type: "text", obligatoire: true },
                    { id: "type_prelevement", label: "Type de prélèvement", type: "select", obligatoire: true, options: ["Core biopsie", "Biopsie chirurgicale", "Biopsie scanno-guidée", "Biopsie écho-guidée", "Exérèse"] },
                    { id: "qualite_prelevement", label: "Qualité du prélèvement", type: "select", obligatoire: true, options: ["Satisfaisante", "Limite", "Insuffisante — refaire"] },
                    { id: "diagnostic_histologique", label: "Diagnostic histologique", type: "textarea", obligatoire: true },
                    { id: "type_histologique", label: "Type histologique", type: "text", obligatoire: true, placeholder: "ex: Carcinome canalaire invasif" },
                    { id: "grade", label: "Grade histologique", type: "select", obligatoire: false, options: ["Grade 1", "Grade 2", "Grade 3", "Non gradable", "Non applicable"] },
                    { id: "invasion_vasculaire", label: "Invasion vasculaire / lymphatique", type: "select", obligatoire: false, options: ["Absente", "Présente", "Non évaluable"] },
                    { id: "marges", label: "Marges (si exérèse)", type: "select", obligatoire: false, options: ["Saines (R0)", "Envahies (R1)", "Macroscopiquement envahies (R2)", "Non évaluables"] }
                ]
            },
            "Myélogramme": {
                nom: "Myélogramme + BOM",
                champs: [
                    { id: "cellularite", label: "Cellularité médullaire", type: "select", obligatoire: true, options: ["Riche", "Normale", "Pauvre", "Aplasique"] },
                    { id: "pourcentage_blastes", label: "% de blastes", type: "number", unite: "%", obligatoire: true },
                    { id: "dysplasie", label: "Dysplasie", type: "select", obligatoire: false, options: ["Absente", "Unilignée", "Multilignée"] },
                    { id: "infiltration_tumorale", label: "Infiltration tumorale", type: "boolean", obligatoire: true },
                    { id: "conclusion_myelo", label: "Conclusion", type: "textarea", obligatoire: true }
                ]
            }
        },
        champs_communs: [
            { id: "numero_bloc", label: "Numéro de bloc / Référence", type: "text", obligatoire: true },
            { id: "date_reception", label: "Date de réception du prélèvement", type: "date", obligatoire: true },
            { id: "date_resultat", label: "Date du résultat", type: "date", obligatoire: true },
            { id: "conclusion_finale", label: "Conclusion finale", type: "textarea", obligatoire: true },
            { id: "complementaire_requis", label: "Examens complémentaires requis", type: "text", placeholder: "IHC, FISH, PCR..." }
        ]
    },

    serologie: {
        template_id: "serologie",
        template_nom: "Sérologie / Virologie",
        laboratoire: "Biologie Clinique",
        tag: "B",
        description: "Détection d'anticorps ou d'antigènes viraux/bactériens",
        champs_formulaire: [
            { id: "agent_recherche", label: "Agent infectieux recherché", type: "text", obligatoire: true, placeholder: "ex: VHB, VHC, VIH, EBV, HPV" },
            { id: "type_test", label: "Type de test", type: "select", obligatoire: true, options: ["Sérologie (Ac)", "Antigène", "PCR (charge virale)", "Test respiratoire", "Test rapide (TDR)"] },
            { id: "resultat_qualitatif", label: "Résultat qualitatif", type: "select", obligatoire: true, options: ["Positif (Réactif)", "Négatif (Non-réactif)", "Douteux", "Non interprétable"] },
            { id: "titre_anticorps", label: "Titre / Taux (si quantitatif)", type: "number", obligatoire: false },
            { id: "unite", label: "Unité", type: "text", obligatoire: false },
            { id: "interpretation", label: "Interprétation", type: "textarea", obligatoire: true },
            { id: "date_prelevement", label: "Date de prélèvement", type: "date", obligatoire: true },
            { id: "date_analyse", label: "Date d'analyse", type: "date", obligatoire: true },
            { id: "commentaire", label: "Commentaire", type: "textarea", obligatoire: false }
        ],
        profils_disponibles: {
            "Sérologie VHB": {
                nom: "Hépatite B",
                marqueurs: [{ id: "AgHBs", label: "Ag HBs" }, { id: "AcHBs", label: "Ac anti-HBs" }, { id: "AcHBc_total", label: "Ac anti-HBc (total)" }]
            },
            "Sérologie VHC": {
                nom: "Hépatite C",
                marqueurs: [{ id: "AcVHC", label: "Ac anti-VHC" }, { id: "ARN_VHC", label: "ARN VHC (PCR)" }]
            },
            "PCR HPV": {
                nom: "HPV",
                marqueurs: [{ id: "HPV_HR", label: "HPV Haut Risque global" }, { id: "HPV_16", label: "HPV 16" }, { id: "HPV_18", label: "HPV 18" }]
            }
        }
    }
};
