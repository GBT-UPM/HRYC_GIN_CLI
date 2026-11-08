import { renderHook } from "@testing-library/react";
import { useObservationTemplate } from "./useObservationTemplate";

describe("useObservationTemplate", () => {
  it("generates an imaging impression without an empty subject display", () => {
    const { result } = renderHook(() => useObservationTemplate());

    const observation = result.current.generateObservation(
      "obs-1",
      "enc-1",
      "pat-1",
      "conclusiones t1",
      "qr-1"
    );

    expect(observation.subject).toEqual({ reference: "Patient/pat-1" });
    expect(observation.encounter).toEqual({ reference: "Encounter/enc-1" });
    expect(observation).not.toHaveProperty("partOf");
    expect(observation).not.toHaveProperty("basedOn");
    expect(observation.code.coding[0]).toEqual({
      system: "http://loinc.org",
      code: "19005-8",
    });
    expect(observation.code.text).toBe("Conclusión ecográfica narrativa");
    expect(observation.valueString).toBe("conclusiones t1");
    expect(observation.derivedFrom).toEqual([
      { reference: "QuestionnaireResponse/qr-1" },
    ]);
  });

  it("does not invent effective time or performer", () => {
    const { result } = renderHook(() => useObservationTemplate());

    const observation = result.current.generateObservation(
      "obs-1",
      "enc-1",
      "pat-1",
      "conclusiones t1",
      "qr-1"
    );

    expect(observation).not.toHaveProperty("effectiveDateTime");
    expect(observation).not.toHaveProperty("effectivePeriod");
    expect(observation).not.toHaveProperty("performer");
  });

  it.each([null, "", "id/con/barra", "x".repeat(65)])(
    "rejects an invalid QuestionnaireResponse logical id: %p",
    (questionnaireResponseId) => {
      const { result } = renderHook(() => useObservationTemplate());

      expect(() => result.current.generateObservation(
        "obs-1", "enc-1", "pat-1", "conclusiones t1", questionnaireResponseId
      )).toThrow("QuestionnaireResponse.id lógico FHIR no válido.");
    }
  );
});
