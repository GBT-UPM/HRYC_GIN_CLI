export const SURGERY_OPTIONS = [
  ["YES", "Sí"], ["NO", "No"], ["UNKNOWN", "Desconocido / pendiente"],
];

export const NO_SURGERY_REASONS = [
  ["STABLE_6_MONTHS", "Lesión estable durante ≥6 meses"],
  ["FOLLOW_UP_PENDING", "Seguimiento pendiente"],
  ["LOST_TO_FOLLOW_UP", "Pérdida de seguimiento"],
  ["OTHER", "Otro"],
];

export const SURGICAL_PROCEDURES = [
  ["UNILATERAL_CYSTECTOMY", "Quistectomía unilateral"],
  ["BILATERAL_CYSTECTOMY", "Quistectomía bilateral"],
  ["UNILATERAL_ADNEXECTOMY", "Anexectomía unilateral"],
  ["BILATERAL_ADNEXECTOMY", "Anexectomía bilateral"],
  ["HYSTERECTOMY", "Histerectomía"],
  ["PERITONEAL_WASHING", "Lavado peritoneal"],
  ["PERITONEAL_BIOPSIES", "Biopsias peritoneales"],
  ["OMENTECTOMY", "Omentectomía"],
  ["PELVIC_LYMPHADENECTOMY", "Linfadenectomía pélvica"],
  ["PARAAORTIC_LYMPHADENECTOMY", "Linfadenectomía paraaórtica"],
  ["EXPLORATORY_LAPAROSCOPY_WITH_BIOPSIES", "Laparoscopia exploradora con biopsias"],
  ["CYTOREDUCTIVE_SURGERY", "Cirugía citorreductora"],
  ["OTHER", "Otro procedimiento"],
];

export const PATHOLOGY_RESULTS = [
  ["BENIGN", "Benigno"], ["BORDERLINE", "Borderline"],
  ["MALIGNANT", "Maligno"], ["PENDING", "Pendiente"],
];

export const TUMOR_TYPES = {
  BENIGN: [
    ["ENDOMETRIOMA", "Endometrioma"], ["MATURE_TERATOMA", "Teratoma maduro"],
    ["SEROUS_CYSTADENOMA", "Cistadenoma seroso"], ["MUCINOUS_CYSTADENOMA", "Cistadenoma mucinoso"],
    ["FIBROMA_FIBROTHECOMA", "Fibroma / fibrotecoma"], ["HYDROSALPINX", "Hidrosálpinx"],
    ["FUNCTIONAL_CYST", "Quiste funcional"], ["OTHER_BENIGN", "Otro benigno"],
  ],
  BORDERLINE: [
    ["SEROUS_BORDERLINE_TUMOR", "Tumor borderline seroso"],
    ["MUCINOUS_BORDERLINE_TUMOR", "Tumor borderline mucinoso"],
    ["OTHER_BORDERLINE", "Otro borderline"],
  ],
  MALIGNANT: [
    ["HIGH_GRADE_SEROUS_CARCINOMA", "Carcinoma seroso de alto grado"],
    ["LOW_GRADE_SEROUS_CARCINOMA", "Carcinoma seroso de bajo grado"],
    ["ENDOMETRIOID_CARCINOMA", "Carcinoma endometrioide"],
    ["MUCINOUS_CARCINOMA", "Carcinoma mucinoso"],
    ["CLEAR_CELL_CARCINOMA", "Carcinoma de células claras"],
    ["GERM_CELL_TUMOR", "Tumor de células germinales"],
    ["SEX_CORD_STROMAL_TUMOR", "Tumor de cordones sexuales"],
    ["OVARIAN_METASTASIS", "Metástasis ovárica"],
    ["OTHER_MALIGNANT", "Otro maligno"],
  ],
  PENDING: [],
};

export const isOtherTumorType = (value) => String(value || "").startsWith("OTHER_");
