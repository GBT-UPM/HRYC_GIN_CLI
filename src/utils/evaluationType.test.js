import { formatEvaluationTypeLabel } from "./evaluationType";

describe("evaluationType", () => {
  it("formats primary and secondary evaluations", () => {
    expect(formatEvaluationTypeLabel("PRIMARY")).toBe("Primaria");
    expect(formatEvaluationTypeLabel("SECONDARY")).toBe("Secundaria");
  });

  it("falls back to primaryEvaluation when evaluationType is missing", () => {
    expect(formatEvaluationTypeLabel(null, true, 1)).toBe("Primaria");
    expect(formatEvaluationTypeLabel(null, false, 2)).toBe("Secundaria");
  });
});
