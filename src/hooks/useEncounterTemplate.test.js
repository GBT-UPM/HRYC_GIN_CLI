import { renderHook } from "@testing-library/react";
import { useEncounterTemplate } from "./useEncounterTemplate";

const generate = (overrides = {}) => {
  const { result } = renderHook(() => useEncounterTemplate());
  return result.current.generateEncounter({
    encId: "enc-1",
    patientId: "pat-1",
    period: { start: "2026-06-01T10:00:00.000Z", end: "2026-06-01T10:15:00.000Z" },
    centerId: "HURYC",
    ...overrides,
  });
};

describe("useEncounterTemplate", () => {
  it("preserves the clinical concepts without non-canonical SNOMED CT displays", () => {
    const encounter = generate();
    expect(encounter.type[0]).toEqual({
      coding: [{ system: "http://snomed.info/sct", code: "83607001" }],
      text: "Examen ginecológico",
    });
    expect(encounter.reasonCode[0]).toEqual({
      coding: [{ system: "http://snomed.info/sct", code: "74601000119101" }],
      text: "Examen ginecológico de rutina realizado",
    });
  });

  it("does not invent Organization or Location references in the browser", () => {
    const encounter = generate({ centerId: "MIA_DEV", careSettingCode: "EMERGENCY" });
    expect(encounter).not.toHaveProperty("serviceProvider");
    expect(encounter).not.toHaveProperty("location");
    expect(JSON.stringify(encounter)).not.toContain("Organization/");
    expect(JSON.stringify(encounter)).not.toContain("Location/");
  });

  it.each([
    ["EMERGENCY", "EMER", "Urgencias"],
    ["INPATIENT", "IMP", "Hospitalización"],
    ["OUTPATIENT", "AMB", "Consulta externa"],
    ["GYNE_ULTRASOUND", "AMB", "Unidad de ecografía ginecológica"],
    ["OTHER", "AMB", "Otro"],
    ["UNKNOWN", "AMB", "No especificado"],
  ])("maps %s to Encounter class and serviceType without a Location", (careSettingCode, classCode, serviceText) => {
    const encounter = generate({ careSettingCode });
    expect(encounter.class.code).toBe(classCode);
    expect(encounter.serviceType).toEqual({ text: serviceText });
    expect(encounter).not.toHaveProperty("location");
  });

  it("does not generate Practitioner/null without a real practitionerId", () => {
    const encounter = generate({ practitionerId: null });
    expect(encounter).not.toHaveProperty("participant");
    expect(JSON.stringify(encounter)).not.toContain("Practitioner/null");
  });

  it("generates Practitioner reference only when practitionerId is valid", () => {
    const encounter = generate({ practitionerId: "practitioner-1", practitionerDisplay: "Profesional 1" });
    expect(encounter.participant[0].individual).toEqual({
      reference: "Practitioner/practitioner-1",
      display: "Profesional 1",
    });
  });
});
