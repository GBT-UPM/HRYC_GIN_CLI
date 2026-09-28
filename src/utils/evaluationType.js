export const normalizeEvaluationType = (evaluationType, primaryEvaluation, evaluationId) => {
  const normalizedType = String(evaluationType || "").trim().toUpperCase();

  if (normalizedType === "PRIMARY" || normalizedType === "SECONDARY") {
    return normalizedType;
  }

  if (primaryEvaluation === true) {
    return "PRIMARY";
  }

  if (primaryEvaluation === false && evaluationId !== undefined && evaluationId !== null) {
    return "SECONDARY";
  }

  return "";
};

export const formatEvaluationTypeLabel = (evaluationType, primaryEvaluation, evaluationId) => {
  switch (normalizeEvaluationType(evaluationType, primaryEvaluation, evaluationId)) {
    case "PRIMARY":
      return "Primaria";
    case "SECONDARY":
      return "Secundaria";
    default:
      return "—";
  }
};
