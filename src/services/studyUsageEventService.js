import ApiService from "./ApiService";

export const STUDY_USAGE_EVENT_TYPES = {
  questionnaireStarted: "QUESTIONNAIRE_STARTED",
  questionnaireSaved: "QUESTIONNAIRE_SAVED",
  reportGenerated: "REPORT_GENERATED",
};

export const STUDY_USAGE_EVENT_ERROR_MESSAGES = {
  forbidden: "No tiene permisos para registrar este evento de uso.",
  unauthorized: "La sesión ha caducado. Vuelva a iniciar sesión.",
  invalid: "No se pudo validar el evento de uso.",
  network: "No se pudo registrar el evento de uso.",
};

const ALLOWED_METADATA_KEYS = new Set(["source", "reportSource", "includesProbability"]);

const normalizeString = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized ? normalized : null;
};

const normalizeNumber = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : null;
};

const sanitizeMetadata = (metadata = {}) => {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }

  return Object.entries(metadata).reduce((safeMetadata, [key, value]) => {
    if (!ALLOWED_METADATA_KEYS.has(key)) {
      return safeMetadata;
    }

    if (key === "includesProbability") {
      safeMetadata.includesProbability = Boolean(value);
      return safeMetadata;
    }

    const normalizedValue = normalizeString(value);
    if (normalizedValue !== null) {
      safeMetadata[key] = normalizedValue;
    }

    return safeMetadata;
  }, {});
};

export const sanitizeStudyUsageEventPayload = (payload = {}) => ({
  eventType: normalizeString(payload.eventType),
  flowId: normalizeString(payload.flowId),
  centerId: normalizeString(payload.centerId),
  caseId: normalizeNumber(payload.caseId),
  evaluationId: normalizeNumber(payload.evaluationId),
  encounterId: normalizeString(payload.encounterId),
  questionnaireResponseFhirId: normalizeNumber(payload.questionnaireResponseFhirId),
  careSettingCode: normalizeString(payload.careSettingCode),
  evaluationType: normalizeString(payload.evaluationType),
  hasAdnexalMass:
    typeof payload.hasAdnexalMass === "boolean" ? payload.hasAdnexalMass : null,
  numberOfMassesInEncounter: normalizeNumber(payload.numberOfMassesInEncounter),
  ecoScoreStatus: normalizeString(payload.ecoScoreStatus),
  metadata: sanitizeMetadata(payload.metadata),
});

const parseStudyUsageEventResponse = async (response) => {
  if (!response.ok) {
    if (response.status === 403) {
      throw new Error(STUDY_USAGE_EVENT_ERROR_MESSAGES.forbidden);
    }

    if (response.status === 401) {
      throw new Error(STUDY_USAGE_EVENT_ERROR_MESSAGES.unauthorized);
    }

    if (response.status === 400 || response.status === 404 || response.status === 409) {
      throw new Error(STUDY_USAGE_EVENT_ERROR_MESSAGES.invalid);
    }

    throw new Error(STUDY_USAGE_EVENT_ERROR_MESSAGES.network);
  }

  return response.json();
};

export const recordStudyUsageEvent = async (token, payload) => {
  const response = await ApiService(
    token,
    "POST",
    "/app/study-usage-events",
    sanitizeStudyUsageEventPayload(payload)
  );

  return parseStudyUsageEventResponse(response);
};
