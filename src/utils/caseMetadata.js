const normalize = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

const findItemByLinkId = (items, linkId) => {
  if (!Array.isArray(items)) return null;

  for (const item of items) {
    if (item.linkId === linkId) return item;

    const nested = findItemByLinkId(item.item, linkId);
    if (nested) return nested;
  }

  return null;
};

const getAnswerValue = (questionnaireResponse, linkId) => {
  const item = findItemByLinkId(questionnaireResponse?.item, linkId);
  const answer = item?.answer?.[0];

  return (
    answer?.valueCoding?.display ||
    answer?.valueCoding?.code ||
    answer?.valueString ||
    answer?.valueInteger?.toString() ||
    answer?.valueDecimal?.toString() ||
    answer?.valueDate ||
    ""
  );
};

const getFirstNonEmptyValue = (...values) =>
  values.find((value) => value !== undefined && value !== null && String(value).trim() !== "");

const normalizeQuestionnaireResponse = (questionnaireResponse) => {
  if (typeof questionnaireResponse === "string") {
    try {
      return JSON.parse(questionnaireResponse);
    } catch (error) {
      return null;
    }
  }

  if (Array.isArray(questionnaireResponse)) {
    return questionnaireResponse[0] || null;
  }

  return questionnaireResponse;
};

export const normalizeLaterality = (laterality) => {
  const normalized = normalize(laterality);

  if (["derecho", "derecha", "right"].includes(normalized)) {
    return { code: "RIGHT", display: "Derecho" };
  }

  if (["izquierdo", "izquierda", "left"].includes(normalized)) {
    return { code: "LEFT", display: "Izquierdo" };
  }

  if (["indefinido", "unknown", "undefined"].includes(normalized)) {
    return { code: "UNDEFINED", display: "Indefinido" };
  }

  return { code: "", display: String(laterality || "") };
};

export const normalizeAnatomicalStructure = (anatomicalStructure) => {
  const normalized = normalize(anatomicalStructure);

  if (["ovario", "ovary"].includes(normalized)) {
    return { code: "OVARY", display: "Ovario" };
  }

  if (["trompa", "fallopian tube", "fallopian_tube"].includes(normalized)) {
    return { code: "FALLOPIAN_TUBE", display: "Trompa" };
  }

  if (["paraovario", "paraovary"].includes(normalized)) {
    return { code: "PARAOVARY", display: "Paraovario" };
  }

  if (["indefinido", "unknown", "undefined"].includes(normalized)) {
    return { code: "UNDEFINED", display: "Indefinido" };
  }

  return { code: "", display: String(anatomicalStructure || "") };
};

export const mapCenterToCode = (center) => {
  const normalized = normalize(center);

  if (["huryc", "hur yc"].includes(normalized) || normalized.includes("ramon y cajal")) {
    return "HURYC";
  }

  if (
    ["h12o", "12o"].includes(normalized) ||
    normalized.includes("12 de octubre") ||
    normalized.includes("doce de octubre")
  ) {
    return "H12O";
  }

  return "";
};

export const extractStudyCode = (questionnaireResponse) =>
  getAnswerValue(normalizeQuestionnaireResponse(questionnaireResponse), "PAT_CODIGO");

export const resolveDisplayStudyIdentifier = (item = {}) => {
  const evaluationDisplayId = getFirstNonEmptyValue(item.evaluationDisplayId, item.evaluation?.displayId);
  const caseDisplayId = getFirstNonEmptyValue(item.caseDisplayId, item.case?.displayId);

  if (evaluationDisplayId) {
    return evaluationDisplayId;
  }

  if (caseDisplayId) {
    return caseDisplayId;
  }

  const caseId = getFirstNonEmptyValue(item.caseId, item.case?.id);
  const evaluationId = getFirstNonEmptyValue(item.evaluationId, item.evaluation?.id);

  if (caseId && evaluationId) {
    return `Caso ${caseId} · Evaluación ${evaluationId}`;
  }

  if (evaluationId) {
    return `Evaluación ${evaluationId}`;
  }

  if (caseId) {
    return `Caso ${caseId}`;
  }

  return (
    getFirstNonEmptyValue(
      item.studyCode,
      item.patientCode,
      extractStudyCode(item.questionnaireResponse)
    ) || "—"
  );
};

export const formatCodeStatusLabel = (codeStatus) => {
  switch (codeStatus) {
    case "PENDING_CODE":
      return "Código pendiente";
    case "CODE_ASSIGNED":
      return "Código asignado";
    case "CODE_CONFLICT":
      return "Conflicto de código";
    default:
      return "—";
  }
};

export const resolveStudyCodeDisplay = (item = {}) =>
  getFirstNonEmptyValue(item.studyPatientCode, item.studyCode, item.patientCode) || "Pendiente";

export const extractCenterId = (questionnaireResponse) =>
  mapCenterToCode(getAnswerValue(questionnaireResponse, "HOSPITAL_REF"));

export const extractLaterality = (questionnaireResponse) =>
  getAnswerValue(questionnaireResponse, "MA_LADO");

export const extractLateralityMetadata = (questionnaireResponse) =>
  normalizeLaterality(extractLaterality(questionnaireResponse));

export const extractAnatomicalStructure = (questionnaireResponse) =>
  getAnswerValue(questionnaireResponse, "MA_ESTRUCTURA");

export const extractAnatomicalStructureMetadata = (questionnaireResponse) =>
  normalizeAnatomicalStructure(extractAnatomicalStructure(questionnaireResponse));

export const extractObserverInitials = (questionnaireResponse) =>
  getAnswerValue(questionnaireResponse, "ECO_EXP_SIGLAS");

export const extractHasAdnexalMass = (questionnaireResponse) =>
  normalize(getAnswerValue(questionnaireResponse, "PAT_MA")) !== "no";

export const validateCaseMetadata = (questionnaireResponse) => {
  const hasAdnexalMass = extractHasAdnexalMass(questionnaireResponse);
  const centerId = extractCenterId(questionnaireResponse);

  const laterality = hasAdnexalMass
    ? extractLateralityMetadata(questionnaireResponse)
    : { code: "NOT_APPLICABLE", display: "No aplica" };

  const anatomicalStructure = hasAdnexalMass
    ? extractAnatomicalStructureMetadata(questionnaireResponse)
    : { code: "NOT_APPLICABLE", display: "No aplica" };

  const observerInitials = extractObserverInitials(questionnaireResponse);
  const studyCode = extractStudyCode(questionnaireResponse);
  const errors = [];

  if (!centerId) {
    errors.push("No se pudo identificar el centro participante.");
  }

  if (hasAdnexalMass && !laterality.code) {
    errors.push("No se pudo identificar la lateralidad de la masa.");
  }

  if (hasAdnexalMass && !anatomicalStructure.code) {
    errors.push("No se pudo identificar la estructura anatómica de la masa.");
  }

  return {
    hasAdnexalMass,
    centerId,
    lateralityCode: laterality.code,
    lateralityDisplay: laterality.display,
    anatomicalStructureCode: anatomicalStructure.code,
    anatomicalStructureDisplay: anatomicalStructure.display,
    observerInitials,
    studyCode,
    isValid: errors.length === 0,
    errors,
  };
};

export const formatDuplicateCaseSummary = (match) => {
  const parts = [`Caso ${match?.caseId || match?.id || "sin identificador"}`];

  const lateralityDisplay = match?.lateralityDisplay || match?.laterality;
  const anatomicalStructureDisplay = match?.anatomicalStructureDisplay || match?.anatomicalStructure;

  if (lateralityDisplay) {
    parts.push(lateralityDisplay);
  }

  if (anatomicalStructureDisplay) {
    parts.push(anatomicalStructureDisplay);
  }

  if (match?.createdAt) {
    parts.push(new Date(match.createdAt).toLocaleDateString("es-ES"));
  }

  if (match?.evaluationCount !== undefined) {
    parts.push(`${match.evaluationCount} evaluaciones`);
  }

  if (match?.codeStatus === "CODE_ASSIGNED") {
    parts.push(`Código ${resolveStudyCodeDisplay(match)}`);
  } else if (match?.codeStatus === "PENDING_CODE") {
    parts.push("Código pendiente");
  }

  return parts.join(" · ");
};
