import ApiService from "./ApiService";
import { sanitizeQuestionnaireResponse } from "../utils/privacy";

const parseJsonResponse = async (response) => {
  if (!response.ok) {
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
    questionnaireResponse,
    encounterId,
    observerInitials,
  }
) => {
  const response = await ApiService(token, "POST", "/app/cases", {
    centerId,
    nhc,
    laterality: lateralityCode,
    anatomicalStructure: anatomicalStructureCode,
    lateralityCode,
    lateralityDisplay,
    anatomicalStructureCode,
    anatomicalStructureDisplay,
    questionnaireResponse: sanitizeQuestionnaireResponse(questionnaireResponse),
    encounterId,
    observerInitials,
  });

  return parseJsonResponse(response);
};

export const addSecondaryEvaluation = async (
  token,
  caseId,
  { questionnaireResponse, encounterId, observerInitials }
) => {
  const response = await ApiService(token, "POST", `/app/cases/${caseId}/evaluations`, {
    questionnaireResponse: sanitizeQuestionnaireResponse(questionnaireResponse),
    encounterId,
    observerInitials,
  });

  return parseJsonResponse(response);
};
