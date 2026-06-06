import ApiService from "./ApiService";

export const ECO_SCORE_RESULT_ERROR_MESSAGES = {
  forbidden: "No tiene permisos para registrar el ECO-SCORE de esta evaluación.",
  unauthorized: "La sesión ha caducado. Vuelva a iniciar sesión.",
  invalid: "No se pudo validar el resultado ECO-SCORE.",
  network: "No se pudo persistir el resultado ECO-SCORE.",
};

const parseEcoScoreResultResponse = async (response) => {
  if (!response.ok) {
    if (response.status === 403) {
      throw new Error(ECO_SCORE_RESULT_ERROR_MESSAGES.forbidden);
    }
    if (response.status === 401) {
      throw new Error(ECO_SCORE_RESULT_ERROR_MESSAGES.unauthorized);
    }
    if (response.status === 400 || response.status === 404 || response.status === 409) {
      throw new Error(ECO_SCORE_RESULT_ERROR_MESSAGES.invalid);
    }
    throw new Error(ECO_SCORE_RESULT_ERROR_MESSAGES.network);
  }

  return response.json();
};

export const upsertEcoScoreResult = async (token, evaluationId, payload) => {
  const response = await ApiService(token, "POST", `/app/case-evaluations/${evaluationId}/eco-score`, payload);
  return parseEcoScoreResultResponse(response);
};
