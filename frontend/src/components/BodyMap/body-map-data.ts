export const bodyRegions = {
    tete_cou: {
        id: 'tete_cou',
        label: "Tête & Cou",
        organs: ["thyroide", "cavite_buccale", "larynx", "pharynx"],
        svgPath: "M100 20 C100 0, 140 0, 140 20 L140 40 C140 50, 130 60, 120 60 C110 60, 100 50, 100 40 Z", // Simplified head/neck
        color: "#FF6B6B"
    },
    thorax: {
        id: 'thorax',
        label: "Thorax",
        organs: ["poumon", "sein", "oesophage", "mediastin"],
        svgPath: "M90 60 L150 60 C160 60, 170 80, 170 110 L170 140 L70 140 L70 110 C70 80, 80 60, 90 60 Z", // Simplified thorax
        color: "#FF8E53"
    },
    abdomen: {
        id: 'abdomen',
        label: "Abdomen",
        organs: ["estomac", "foie", "pancreas", "colon", "intestin_grele"],
        svgPath: "M70 140 L170 140 L165 210 C160 220, 150 230, 120 230 C90 230, 80 220, 75 210 Z", // Simplified abdomen
        color: "#FECA57"
    },
    pelvis: {
        id: 'pelvis',
        label: "Pelvis",
        organs: ["prostate", "vessie", "uterus", "ovaire", "rectum"],
        svgPath: "M75 210 L165 210 C165 240, 150 250, 120 250 C90 250, 75 240, 75 210 Z", // Simplified pelvis
        color: "#48DBFB"
    }
};

export const topographyToRegion: Record<string, { region: string; organ: string; zone?: string }> = {
    "C34":   { region: "thorax",   organ: "poumon" },
    "C34.1": { region: "thorax",   organ: "poumon",  zone: "lobe_superieur" },
    "C34.2": { region: "thorax",   organ: "poumon",  zone: "lobe_moyen" },
    "C34.3": { region: "thorax",   organ: "poumon",  zone: "lobe_inferieur" },
    "C50":   { region: "thorax",   organ: "sein" },
    "C50.4": { region: "thorax",   organ: "sein",    zone: "quadrant_supero_externe" },
    "C18":   { region: "abdomen",  organ: "colon" },
    "C18.2": { region: "abdomen",  organ: "colon",   zone: "colon_ascendant" },
    "C61":   { region: "pelvis",   organ: "prostate" },
    "C73":   { region: "tete_cou", organ: "thyroide" },
    "C16":   { region: "abdomen",  organ: "estomac" },
};
