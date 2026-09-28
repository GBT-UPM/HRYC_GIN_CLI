export const CASE_RECORD_STATUS = {
  OPEN: "OPEN",
  READY_FOR_REVIEW: "READY_FOR_REVIEW",
  LOCKED: "LOCKED",
  EXCLUDED: "EXCLUDED",
  WITHDRAWN: "WITHDRAWN",
};

export const CASE_EVALUATION_STATUS = {
  COMPLETED: "COMPLETED",
  CORRECTED: "CORRECTED",
  LOCKED: "LOCKED",
  EXCLUDED: "EXCLUDED",
};

export const normalizeCaseStatus = (status) => {
  if (status === undefined || status === null || status === "" || status === "ACTIVE") {
    return CASE_RECORD_STATUS.OPEN;
  }

  if (Object.values(CASE_RECORD_STATUS).includes(status)) {
    return status;
  }

  return CASE_RECORD_STATUS.OPEN;
};

export const normalizeEvaluationStatus = (status) => {
  if (status === undefined || status === null || status === "") {
    return CASE_EVALUATION_STATUS.COMPLETED;
  }

  if (Object.values(CASE_EVALUATION_STATUS).includes(status)) {
    return status;
  }

  return CASE_EVALUATION_STATUS.COMPLETED;
};

export const formatCaseStatusLabel = (status) => {
  switch (normalizeCaseStatus(status)) {
    case CASE_RECORD_STATUS.READY_FOR_REVIEW:
      return "Listo para revisión";
    case CASE_RECORD_STATUS.LOCKED:
      return "Bloqueado";
    case CASE_RECORD_STATUS.EXCLUDED:
      return "Excluido";
    case CASE_RECORD_STATUS.WITHDRAWN:
      return "Retirado";
    case CASE_RECORD_STATUS.OPEN:
    default:
      return "Abierto";
  }
};

export const formatEvaluationStatusLabel = (status) => {
  switch (normalizeEvaluationStatus(status)) {
    case CASE_EVALUATION_STATUS.CORRECTED:
      return "Corregida";
    case CASE_EVALUATION_STATUS.LOCKED:
      return "Bloqueada";
    case CASE_EVALUATION_STATUS.EXCLUDED:
      return "Excluida";
    case CASE_EVALUATION_STATUS.COMPLETED:
    default:
      return "Completada";
  }
};
