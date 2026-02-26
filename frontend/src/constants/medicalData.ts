export const MEDICAL_SPECIALTIES = [
    "Oncologue médical",
    "Oncologue thoracique / Pneumo-oncologue",
    "Oncologue digestif / Gastro-oncologue",
    "Oncologue urologique / Uro-oncologue",
    "Gynécologue oncologue",
    "Oncologue sénologue",
    "Hématologue oncologue",
    "Neuro-oncologue",
    "Oncologue pédiatrique",
    "Oncologue sarcomes",
    "Dermatologue oncologue",
    "ORL oncologue",
    "Endocrinologue oncologue",
    "Radiothérapeute (Radio-oncologue)",
    "Chirurgien oncologue",
    "Anatomopathologiste",
    "Médecin nucléaire",
    "Soins Palliatifs"
];

export const CANCER_TYPES = [
    { code: "C00-C14", name: "Cancers de la lèvre, de la cavité buccale et du pharynx", specialty: "ORL oncologue" },
    { code: "C34", name: "Tumeur maligne des bronches et du poumon", specialty: "Oncologue thoracique / Pneumo-oncologue" },
    { code: "C50", name: "Tumeur maligne du sein", specialty: "Oncologue sénologue" },
    { code: "C18", name: "Tumeur maligne du côlon", specialty: "Oncologue digestif / Gastro-oncologue" },
    { code: "C61", name: "Tumeur maligne de la prostate", specialty: "Oncologue urologique / Uro-oncologue" },
    { code: "C16", name: "Tumeur maligne de l'estomac", specialty: "Oncologue digestif / Gastro-oncologue" },
    { code: "C43", name: "Mélanome malin de la peau", specialty: "Dermatologue oncologue" },
    { code: "C71", name: "Tumeur maligne de l'encéphale", specialty: "Neuro-oncologue" },
    { code: "C91", name: "Leucémie lymphoïde", specialty: "Hématologue oncologue" },
    { code: "C20", name: "Tumeur maligne du rectum", specialty: "Oncologue digestif / Gastro-oncologue" },
    { code: "C53", name: "Tumeur maligne du col de l'utérus", specialty: "Gynécologue oncologue" },
    { code: "C22", name: "Carcinome hépatocellulaire", specialty: "Oncologue digestif / Gastro-oncologue" },
    { code: "C64", name: "Tumeur maligne du rein", specialty: "Oncologue urologique / Uro-oncologue" },
    { code: "C73", name: "Tumeur maligne de la thyroïde", specialty: "Endocrinologue oncologue" },
    { code: "C00-C97", name: "Autre type de cancer (Non listé)", specialty: "Oncologue médical" }
];

// Helper to get matching specialties for a cancer code
export const getSpecialtyForCancer = (cancerCode: string): string[] => {
    const cancer = CANCER_TYPES.find(c => c.code === cancerCode);
    if (!cancer) return ["Oncologie Médicale"];

    // Primary specialty + General Oncology
    return [cancer.specialty, "Oncologie Médicale", "Oncologie Radiothérapie", "Chirurgie Oncologique"];
};
