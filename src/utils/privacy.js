const SENSITIVE_LINK_IDS = new Set(["PAT_NHC", "PAT_NOMBRE", "PAT_CODIGO"]);

export const removeSensitiveQuestionnaireItems = (items = []) => {
  if (!Array.isArray(items)) return [];

  return items
    .filter((item) => !SENSITIVE_LINK_IDS.has(item.linkId))
    .map((item) => {
      if (!Array.isArray(item.item)) {
        return { ...item };
      }

      return {
        ...item,
        item: removeSensitiveQuestionnaireItems(item.item),
      };
    });
};

export const sanitizeQuestionnaireResponse = (questionnaireResponse) => {
  if (!questionnaireResponse || typeof questionnaireResponse !== "object") {
    return questionnaireResponse;
  }

  return {
    ...questionnaireResponse,
    item: removeSensitiveQuestionnaireItems(questionnaireResponse.item),
  };
};
