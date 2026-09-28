import ApiService from "./ApiService";

export const HISTOPATHOLOGY_ERROR_MESSAGES = {
  forbidden: "No tiene permisos para registrar histopatología en este centro.",
  notFound: "Caso no encontrado.",
  unauthorized: "Sesión caducada. Vuelva a iniciar sesión.",
  generic: "No se pudo registrar la histopatología.",
};

const parseJsonResponse = async (response) => {
  if (response.ok || response.status === 200 || response.status === 201) {
    return response.json();
  }

  if (response.status === 401) {
    throw new Error(HISTOPATHOLOGY_ERROR_MESSAGES.unauthorized);
  }

  if (response.status === 403) {
    throw new Error(HISTOPATHOLOGY_ERROR_MESSAGES.forbidden);
  }

  if (response.status === 404) {
    throw new Error(HISTOPATHOLOGY_ERROR_MESSAGES.notFound);
  }

  throw new Error(HISTOPATHOLOGY_ERROR_MESSAGES.generic);
};

export const upsertHistopathology = async (token, caseId, body) => {
  const response = await ApiService(token, "POST", `/app/cases/${caseId}/histology`, body);
  return parseJsonResponse(response);
};
