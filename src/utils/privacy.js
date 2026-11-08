const SENSITIVE_LINK_IDS = new Set(["PAT_NHC", "PAT_NOMBRE", "PAT_CODIGO"]);
const FHIR_ANSWER_VALUE_KEYS = new Set([
  "valueBoolean", "valueDecimal", "valueInteger", "valueDate", "valueDateTime",
  "valueTime", "valueString", "valueUri", "valueAttachment", "valueCoding",
  "valueQuantity", "valueReference",
]);

export const maskNhc = (nhc) => {
  const value = String(nhc || "").trim();
  if (!value) return "No informado";
  return "NHC informado";
};

export const removeSensitiveQuestionnaireItems = (items = []) => {
  if (!Array.isArray(items)) return [];

  return items
    .filter((item) => !SENSITIVE_LINK_IDS.has(item.linkId))
    .map((item) => normalizeQuestionnaireResponseItem(item));
};

const normalizeQuestionnaireResponseAnswer = (answer = {}) => {
  const valueKeys = Object.keys(answer).filter((key) => FHIR_ANSWER_VALUE_KEYS.has(key));
  if (valueKeys.length <= 1) return { ...answer };

  if (answer.valueCoding && valueKeys.length === 2 && valueKeys.includes("valueString")) {
    const codingValue = answer.valueCoding.display || answer.valueCoding.code;
    if (answer.valueString === codingValue || answer.valueString === answer.valueCoding.code) {
      const { valueString, ...codingAnswer } = answer;
      return codingAnswer;
    }
  }

  throw new Error("Una respuesta del QuestionnaireResponse contiene valores FHIR incompatibles.");
};

const normalizeQuestionnaireResponseItem = (item = {}) => {
  const { questionText, answer, item: nestedItems, ...rest } = item;
  const normalized = {
    ...rest,
    ...(rest.text === undefined && questionText !== undefined ? { text: questionText } : {}),
    ...(Array.isArray(answer) ? { answer: answer.map(normalizeQuestionnaireResponseAnswer) } : {}),
    ...(Array.isArray(nestedItems) ? { item: removeSensitiveQuestionnaireItems(nestedItems) } : {}),
  };
  return normalized;
};

export const sanitizeQuestionnaireResponse = (questionnaireResponse) => {
  if (!questionnaireResponse || typeof questionnaireResponse !== "object") {
    return questionnaireResponse;
  }

  const { partOf, ...resource } = questionnaireResponse;
  const permittedPartOf = Array.isArray(partOf)
    ? partOf.filter((reference) => !String(reference?.reference || "").startsWith("Encounter/"))
    : partOf;
  return {
    ...resource,
    ...(Array.isArray(permittedPartOf) && permittedPartOf.length > 0 ? { partOf: permittedPartOf } : {}),
    item: removeSensitiveQuestionnaireItems(questionnaireResponse.item),
  };
};
