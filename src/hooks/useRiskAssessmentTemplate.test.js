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
    expect(riskAssessment).not.toHaveProperty("derivedFrom");
    expect(riskAssessment).not.toHaveProperty("date");
    expect(riskAssessment).not.toHaveProperty("mitigation");
    expect(riskAssessment.basis).toEqual([
      { reference: "QuestionnaireResponse/qr-1" },
    ]);
    expect(riskAssessment.occurrenceDateTime).toEqual(expect.any(String));
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

  it("keeps a non-empty mitigation without emitting an empty FHIR element", () => {
    const { result } = renderHook(() => useRiskAssessmentTemplate());

    const riskAssessment = result.current.generateRiskAssessment(
      "risk-1", "enc-1", "pat-1", null, 0.23, "Control ecográfico", "qr-1"
    );

    expect(riskAssessment.mitigation).toBe("Control ecográfico");
  });

  it.each([null, "", "id/con/barra", "x".repeat(65)])(
    "rejects an invalid QuestionnaireResponse logical id: %p",
    (questionnaireResponseId) => {
      const { result } = renderHook(() => useRiskAssessmentTemplate());

      expect(() => result.current.generateRiskAssessment(
        "risk-1", "enc-1", "pat-1", null, 0.23, "", questionnaireResponseId
      )).toThrow("QuestionnaireResponse.id lógico FHIR no válido.");
    }
  );
});
