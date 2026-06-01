import ApiService from "./ApiService";
import {
  canUseGlobalView,
  getDefaultCenter,
  requiresCenterScopedView,
} from "../utils/auth";

export const CASE_EVALUATION_ERROR_MESSAGES = {
  missingCenter: "Usuario sin centro asignado.",
  forbidden: "No tiene permisos para consultar datos de este centro.",
  unauthorized: "Sesión caducada. Vuelva a iniciar sesión.",
  generic: "No se pudieron cargar los datos.",
};

export const buildCaseEvaluationsEndpoint = (keycloak, selectedCenter) => {
  if (canUseGlobalView(keycloak)) {
    return "/app/cases/evaluations";
  }

  if (requiresCenterScopedView(keycloak)) {
    const centerId = selectedCenter || getDefaultCenter(keycloak);
    if (!centerId) {
      return "";
    }

    return `/app/cases/evaluations?centerId=${encodeURIComponent(centerId)}`;
  }

  return "";
};

export const parseCaseEvaluationsResponse = async (response, genericMessage = CASE_EVALUATION_ERROR_MESSAGES.generic) => {
  if (response.status === 200) {
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  }

  if (response.status === 401) {
    throw new Error(CASE_EVALUATION_ERROR_MESSAGES.unauthorized);
  }

  if (response.status === 403) {
    throw new Error(CASE_EVALUATION_ERROR_MESSAGES.forbidden);
  }

  throw new Error(genericMessage);
};

export const getCaseEvaluations = async (token, keycloak, selectedCenter, genericMessage) => {
  const endpoint = buildCaseEvaluationsEndpoint(keycloak, selectedCenter);
  if (!endpoint) {
    throw new Error(CASE_EVALUATION_ERROR_MESSAGES.missingCenter);
  }

  const response = await ApiService(token, "GET", endpoint, {});
  return parseCaseEvaluationsResponse(response, genericMessage);
};
