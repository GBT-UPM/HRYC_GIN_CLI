import ApiService from "./ApiService";

export const CASE_STATUS_ERROR_MESSAGES = {
  forbidden: "No tiene permisos para cambiar este estado.",
  invalid: "No se pudo validar el cambio de estado.",
  conflict: "No se pudo aplicar el cambio de estado solicitado.",
  network: "No se pudo actualizar el estado administrativo.",
};

const parseStatusUpdateResponse = async (response) => {
  if (response.status === 200) {
    return response.json();
  }

  if (response.status === 400) {
    throw new Error(CASE_STATUS_ERROR_MESSAGES.invalid);
  }

  if (response.status === 403) {
    throw new Error(CASE_STATUS_ERROR_MESSAGES.forbidden);
  }

  if (response.status === 404 || response.status === 409) {
    throw new Error(CASE_STATUS_ERROR_MESSAGES.conflict);
  }

  throw new Error(CASE_STATUS_ERROR_MESSAGES.network);
};

export const updateCaseStatus = async (token, caseId, payload) => {
  const response = await ApiService(token, "POST", `/app/cases/${caseId}/status`, payload);
  return parseStatusUpdateResponse(response);
};

export const updateEvaluationStatus = async (token, caseId, evaluationId, payload) => {
  const response = await ApiService(token, "POST", `/app/cases/${caseId}/evaluations/${evaluationId}/status`, payload);
  return parseStatusUpdateResponse(response);
};
