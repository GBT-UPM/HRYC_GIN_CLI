import ApiService from "./ApiService";
import { sanitizeQuestionnaireResponse } from "../utils/privacy";

export const CASE_ERROR_MESSAGES = {
  forbidden: "No tiene permisos para realizar esta acción en este centro.",
  studyCodeConflict: "El código de estudio ya está asignado a otra participante del mismo centro.",
  studyConsentRequired: "Debe confirmarse la participación en el estudio antes de guardar el caso.",
  unauthorized: "La sesión ha caducado. Vuelva a iniciar sesión.",
  network: "No se pudo guardar el caso. Revise la conexión e inténtelo de nuevo.",
};

const parseJsonResponse = async (response) => {
  if (!response.ok) {
    if (response.status === 403) {
      throw new Error(CASE_ERROR_MESSAGES.forbidden);
    }

    if (response.status === 401) {
      throw new Error(CASE_ERROR_MESSAGES.unauthorized);
    }

    if (response.status === 409) {
      throw new Error(CASE_ERROR_MESSAGES.studyCodeConflict);
    }

    if (response.status === 400 && typeof response.json === "function") {
      try {
        const errorBody = await response.json();
        if (String(errorBody?.message || "").includes("STUDY_CONSENT_REQUIRED")) {
          throw new Error(CASE_ERROR_MESSAGES.studyConsentRequired);
        }
      } catch (error) {
        if (error instanceof Error && error.message === CASE_ERROR_MESSAGES.studyConsentRequired) {
          throw error;
        }
      }
    }

    throw new Error(`Error en la respuesta: ${response.status}`);
  }

  return response.json();
};

export const checkDuplicateCase = async (
  token,
  { centerId, nhc, lateralityCode, lateralityDisplay, anatomicalStructureCode, anatomicalStructureDisplay }
) => {
  const response = await ApiService(token, "POST", "/app/cases/check-duplicate", {
    centerId,
    nhc,
    laterality: lateralityCode,
    anatomicalStructure: anatomicalStructureCode,
    lateralityCode,
    lateralityDisplay,
    anatomicalStructureCode,
    anatomicalStructureDisplay,
  });

  return parseJsonResponse(response);
};

export const createCase = async (
  token,
  {
    centerId,
    nhc,
    lateralityCode,
    lateralityDisplay,
    anatomicalStructureCode,
    anatomicalStructureDisplay,
    hasAdnexalMass,
    questionnaireResponse,
    encounterId,
    observerInitials,
    careSettingCode,
    careSettingDisplay,
    studyConsentConfirmed,
    consentVersion,
  }
) => {
  const body = {
    centerId,
    nhc,
    laterality: lateralityCode,
    anatomicalStructure: anatomicalStructureCode,
    lateralityCode,
    lateralityDisplay,
    anatomicalStructureCode,
    anatomicalStructureDisplay,
    hasAdnexalMass: hasAdnexalMass ?? true,
    questionnaireResponse: sanitizeQuestionnaireResponse(questionnaireResponse),
    encounterId,
    observerInitials,
    careSettingCode,
    careSettingDisplay,
    studyConsentConfirmed,
    consentVersion,
  };

  const response = await ApiService(token, "POST", "/app/cases", body);

  return parseJsonResponse(response);
};

export const searchCasesByNhc = async (token, { centerId, nhc }) => {
  const response = await ApiService(token, "POST", "/app/cases/search-by-nhc", {
    centerId,
    nhc,
  });

  if (!response.ok && response.status === 404) {
    throw new Error("No se encontró participante/caso pendiente para el NHC introducido en este centro.");
  }

  return parseJsonResponse(response);
};

export const addSecondaryEvaluation = async (
  token,
  caseId,
  {
    questionnaireResponse,
    encounterId,
    observerInitials,
    careSettingCode,
    careSettingDisplay,
    studyConsentConfirmed,
    consentVersion,
  }
) => {
  const body = {
    questionnaireResponse: sanitizeQuestionnaireResponse(questionnaireResponse),
    encounterId,
    observerInitials,
    careSettingCode,
    careSettingDisplay,
    studyConsentConfirmed,
    consentVersion,
  };

  const response = await ApiService(token, "POST", `/app/cases/${caseId}/evaluations`, body);

  return parseJsonResponse(response);
};
