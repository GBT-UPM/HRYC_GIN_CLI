import {
  formatCaseStatusLabel,
  formatEvaluationStatusLabel,
  normalizeCaseStatus,
  normalizeEvaluationStatus,
} from "./caseStatus";

describe("caseStatus", () => {
  it("formats legacy and default case statuses", () => {
    expect(formatCaseStatusLabel("OPEN")).toBe("Abierto");
    expect(formatCaseStatusLabel("ACTIVE")).toBe("Abierto");
    expect(formatCaseStatusLabel(null)).toBe("Abierto");
    expect(normalizeCaseStatus("UNKNOWN")).toBe("OPEN");
  });

  it("formats evaluation statuses with legacy null fallback", () => {
    expect(formatEvaluationStatusLabel("COMPLETED")).toBe("Completada");
    expect(formatEvaluationStatusLabel(null)).toBe("Completada");
    expect(normalizeEvaluationStatus("UNKNOWN")).toBe("COMPLETED");
  });
});
