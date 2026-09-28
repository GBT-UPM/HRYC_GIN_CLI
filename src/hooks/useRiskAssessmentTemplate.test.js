import { renderHook } from "@testing-library/react";
import { useRiskAssessmentTemplate } from "./useRiskAssessmentTemplate";

describe("useRiskAssessmentTemplate", () => {
  it("does not generate performer when practitionerId is missing", () => {
    const { result } = renderHook(() => useRiskAssessmentTemplate());

    const riskAssessment = result.current.generateRiskAssessment(
      "risk-1",
      "enc-1",
      "pat-1",
      null,
      0.23,
      "",
      "qr-1"
    );

    expect(riskAssessment).not.toHaveProperty("performer");
    expect(JSON.stringify(riskAssessment)).not.toContain("Practitioner/null");
  });

  it("generates performer only when practitionerId is valid", () => {
    const { result } = renderHook(() => useRiskAssessmentTemplate());

    const riskAssessment = result.current.generateRiskAssessment(
      "risk-1",
      "enc-1",
      "pat-1",
      "practitioner-1",
      0.23,
      "",
      "qr-1"
    );

    expect(riskAssessment.performer).toEqual({
      reference: "Practitioner/practitioner-1",
    });
  });
});
