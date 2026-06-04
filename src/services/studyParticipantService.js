import ApiService from "./ApiService";

export const STUDY_PARTICIPANT_ERROR_MESSAGES = {
  forbidden: "No tiene permisos para gestionar códigos en este centro.",
  codeAlreadyAssigned: "El código de estudio ya está asignado a otra participante del mismo centro.",
  multipleCandidates:
    "Existen varios participantes pendientes compatibles. Revise los pendientes o contacte con coordinación del estudio.",
  notFound: "No se ha encontrado ningún participante pendiente para el NHC introducido en este centro.",
  participantNotPending: "El participante localizado ya no está pendiente de asignación.",
  invalidRequest: "Revise los datos introducidos e inténtelo de nuevo.",
  unauthorized: "Sesión caducada. Vuelva a iniciar sesión.",
  validateGeneric: "No se pudo validar el código de estudio.",
  assignGeneric: "No se pudo asignar el código de estudio.",
  fetchGeneric: "No se pudieron obtener las participantes pendientes.",
};

const safeParseJson = async (response) => {
  try {
    return await response.json();
  } catch (error) {
    return null;
  }
};

const parseJsonResponse = async (response, fallbackMessage) => {
  if (response.ok || response.status === 200) {
    return response.json();
  }

  const data = await safeParseJson(response);
  const errorCode = data?.code || null;

  if (response.status === 401) {
    throw new Error(STUDY_PARTICIPANT_ERROR_MESSAGES.unauthorized);
  }

  if (response.status === 403) {
    throw new Error(STUDY_PARTICIPANT_ERROR_MESSAGES.forbidden);
  }

  if (response.status === 400) {
    throw new Error(STUDY_PARTICIPANT_ERROR_MESSAGES.invalidRequest);
  }

  if (response.status === 404) {
    throw new Error(STUDY_PARTICIPANT_ERROR_MESSAGES.notFound);
  }

  if (response.status === 409) {
    if (errorCode === "MULTIPLE_PENDING_CANDIDATES") {
      throw new Error(STUDY_PARTICIPANT_ERROR_MESSAGES.multipleCandidates);
    }
    if (errorCode === "PARTICIPANT_NOT_PENDING") {
      throw new Error(STUDY_PARTICIPANT_ERROR_MESSAGES.participantNotPending);
    }

    throw new Error(STUDY_PARTICIPANT_ERROR_MESSAGES.codeAlreadyAssigned);
  }

  throw new Error(fallbackMessage);
};

const normalizePendingParticipants = (data) => {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.items)) {
    return data.items;
  }

  return [];
};

export const getPendingStudyParticipants = async (token, centerId) => {
  const response = await ApiService(
    token,
    "GET",
    `/app/study-participants/pending?centerId=${encodeURIComponent(centerId)}`,
    {}
  );

  const data = await parseJsonResponse(response, STUDY_PARTICIPANT_ERROR_MESSAGES.fetchGeneric);
  return normalizePendingParticipants(data);
};

export const assignStudyPatientCode = async (token, { centerId, nhc, studyPatientCode }) => {
  const response = await ApiService(token, "POST", "/app/study-participants/assign-code-by-nhc", {
    centerId,
    nhc,
    studyPatientCode,
  });

  return parseJsonResponse(response, STUDY_PARTICIPANT_ERROR_MESSAGES.assignGeneric);
};

export const validateStudyPatientCode = async (token, { centerId, nhc, studyPatientCode }) => {
  let response;
  try {
    response = await ApiService(token, "POST", "/app/study-participants/validate-study-code", {
      centerId,
      nhc,
      studyPatientCode,
    });
  } catch (error) {
    throw new Error(STUDY_PARTICIPANT_ERROR_MESSAGES.validateGeneric);
  }

  const data = await parseJsonResponse(response, STUDY_PARTICIPANT_ERROR_MESSAGES.validateGeneric);
  return {
    valid: Boolean(data?.valid),
    reason: data?.reason || null,
  };
};
