const normalize = (value = "") =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

export const CARE_SETTING_OPTIONS = [
  { code: "EMERGENCY", display: "Urgencias" },
  { code: "OUTPATIENT", display: "Consulta externa" },
  { code: "GYNE_ULTRASOUND", display: "Unidad de ecografía ginecológica" },
  { code: "INPATIENT", display: "Hospitalización" },
  { code: "OTHER", display: "Otro" },
  { code: "UNKNOWN", display: "No especificado" },
];

export const DEFAULT_CARE_SETTING = CARE_SETTING_OPTIONS[5];

export const normalizeCareSetting = (value) => {
  const normalized = normalize(value);

  if (!normalized) {
    return DEFAULT_CARE_SETTING;
  }

  if (["emergency", "urgencias", "urgencia"].includes(normalized)) {
    return CARE_SETTING_OPTIONS[0];
  }

  if (["outpatient", "consulta externa", "consultas externas"].includes(normalized)) {
    return CARE_SETTING_OPTIONS[1];
  }

  if (
    [
      "gyne_ultrasound",
      "gyne ultrasound",
      "unidad de ecografia ginecologica",
      "ecografia ginecologica",
      "unidad ecografia ginecologica",
    ].includes(normalized)
  ) {
    return CARE_SETTING_OPTIONS[2];
  }

  if (["inpatient", "hospitalizacion", "hospitalization"].includes(normalized)) {
    return CARE_SETTING_OPTIONS[3];
  }

  if (["other", "otro"].includes(normalized)) {
    return CARE_SETTING_OPTIONS[4];
  }

  if (["unknown", "no especificado", "sin especificar"].includes(normalized)) {
    return DEFAULT_CARE_SETTING;
  }

  return CARE_SETTING_OPTIONS.find((option) => normalize(option.code) === normalized) || DEFAULT_CARE_SETTING;
};

export const getCareSettingDisplay = (value) => normalizeCareSetting(value).display;

export const getEncounterClassForCareSetting = (value) => {
  const { code } = normalizeCareSetting(value);

  if (code === "EMERGENCY") {
    return {
      system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
      code: "EMER",
      display: "Emergency",
    };
  }

  if (code === "INPATIENT") {
    return {
      system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
      code: "IMP",
      display: "Inpatient encounter",
    };
  }

  return {
    system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
    code: "AMB",
    display: "Ambulatory",
  };
};

export const getCareSettingLocationSuffix = (value) => {
  switch (normalizeCareSetting(value).code) {
    case "EMERGENCY":
      return { suffix: "emergency-department", display: "Urgencias" };
    case "OUTPATIENT":
      return { suffix: "outpatient-clinic", display: "Consulta externa" };
    case "GYNE_ULTRASOUND":
      return { suffix: "gyne-ultrasound-unit", display: "Unidad de ecografía ginecológica" };
    case "INPATIENT":
      return { suffix: "inpatient-ward", display: "Hospitalización" };
    case "OTHER":
      return { suffix: "other", display: "Otro" };
    case "UNKNOWN":
    default:
      return { suffix: "gyn-unit", display: "Unidad de Ginecología / No especificado" };
  }
};
