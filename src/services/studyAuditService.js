import ApiService from "./ApiService";

export const STUDY_AUDIT_ERROR_MESSAGES = {
  forbidden: "No tiene permisos para consultar la trazabilidad del estudio.",
  unauthorized: "Sesión caducada. Vuelva a iniciar sesión.",
  invalidRequest: "Revise los filtros de trazabilidad e inténtelo de nuevo.",
  fetchGeneric: "No se pudo cargar la trazabilidad del estudio.",
};

const isRealFilterValue = (value) => {
  if (value === null || value === undefined) {
    return false;
  }

  const normalizedValue = String(value).trim();
  return (
    normalizedValue !== "" &&
    normalizedValue.toUpperCase() !== "ALL" &&
    normalizedValue.toUpperCase() !== "GLOBAL" &&
    normalizedValue.toUpperCase() !== "TODOS" &&
    normalizedValue.toUpperCase() !== "TODAS"
  );
};

const safeParseJson = async (response) => {
  try {
    return await response.json();
  } catch (error) {
    return null;
  }
};

export const parseStudyAuditResourceFilter = (rawValue) => {
  const normalizedValue = String(rawValue || "").trim().toUpperCase();
  if (!normalizedValue) {
    return { caseId: "", evaluationId: "" };
  }

  const evaluationMatch = normalizedValue.match(/-E0*(\d+)$/);
  if (evaluationMatch) {
    return {
      caseId: "",
      evaluationId: evaluationMatch[1],
    };
  }

  const caseMatch = normalizedValue.match(/-C0*(\d+)$/);
  if (caseMatch) {
    return {
      caseId: caseMatch[1],
      evaluationId: "",
    };
  }

  return { caseId: "", evaluationId: "" };
};

export const buildStudyAuditEndpoint = ({
  filters,
  allowedCenters,
  studyCoordinator,
  siteCoordinator,
  page,
  limit,
}) => {
  const params = new URLSearchParams();
  const currentFilters = filters || {};
  const currentAllowedCenters = Array.isArray(allowedCenters) ? allowedCenters : [];
  const resourceFilter = parseStudyAuditResourceFilter(currentFilters.resourceId);

  const addParam = (name, value) => {
    if (isRealFilterValue(value)) {
      params.set(name, String(value).trim());
    }
  };

  if (siteCoordinator && !studyCoordinator) {
    addParam("centerId", currentFilters.centerId || currentAllowedCenters[0]);
  } else if (studyCoordinator) {
    addParam("centerId", currentFilters.centerId);
  }

  addParam("action", currentFilters.action);
  addParam("fromDate", currentFilters.fromDate);
  addParam("toDate", currentFilters.toDate);
  addParam("caseId", resourceFilter.caseId);
  addParam("evaluationId", resourceFilter.evaluationId);

  if (Number.isInteger(page) && page >= 0) {
    params.set("page", String(page));
  }
  if (Number.isInteger(limit) && limit > 0) {
    params.set("limit", String(limit));
  }

  const queryString = params.toString();
  return queryString ? `/app/study-audit?${queryString}` : "/app/study-audit";
};

export const getStudyAuditEvents = async (
  token,
  { filters, allowedCenters, studyCoordinator, siteCoordinator, page = 0, limit = 25 }
) => {
  const endpoint = buildStudyAuditEndpoint({
    filters,
    allowedCenters,
    studyCoordinator,
    siteCoordinator,
    page,
    limit,
  });

  const response = await ApiService(token, "GET", endpoint, {});
  if (response.ok || response.status === 200) {
    return response.json();
  }

  if (response.status === 401) {
    throw new Error(STUDY_AUDIT_ERROR_MESSAGES.unauthorized);
  }

  if (response.status === 403) {
    throw new Error(STUDY_AUDIT_ERROR_MESSAGES.forbidden);
  }

  if (response.status === 400) {
    throw new Error(STUDY_AUDIT_ERROR_MESSAGES.invalidRequest);
  }

  await safeParseJson(response);
  throw new Error(STUDY_AUDIT_ERROR_MESSAGES.fetchGeneric);
};
