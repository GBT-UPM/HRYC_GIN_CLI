import { renderHook } from "@testing-library/react";
import { useEncounterTemplate } from "./useEncounterTemplate";

describe("useEncounterTemplate", () => {
  it("uses centerId to populate serviceProvider for HURYC", () => {
    const { result } = renderHook(() => useEncounterTemplate());

    const encounter = result.current.generateEncounter({
      encId: "enc-1",
      patientId: "pat-1",
      period: { start: "2026-06-01T10:00:00.000Z" },
      centerId: "HURYC",
    });

    expect(encounter.serviceProvider).toEqual({
      reference: "Organization/huryc",
      display: "Hospital Universitario Ramón y Cajal",
    });
    expect(encounter.location[0].location.reference).toBe("Location/huryc-gyn-unit");
  });

  it("maps EMERGENCY care setting to Encounter class and location", () => {
    const { result } = renderHook(() => useEncounterTemplate());

    const encounter = result.current.generateEncounter({
      encId: "enc-1",
      patientId: "pat-1",
      period: { start: "2026-06-01T10:00:00.000Z" },
      centerId: "HURYC",
      careSettingCode: "EMERGENCY",
    });

    expect(encounter.class.code).toBe("EMER");
    expect(encounter.class.display).toBe("Emergency");
    expect(encounter.location[0].location.reference).toBe("Location/huryc-emergency-department");
  });

  it("maps INPATIENT care setting to Encounter class", () => {
    const { result } = renderHook(() => useEncounterTemplate());

    const encounter = result.current.generateEncounter({
      encId: "enc-1",
      patientId: "pat-1",
      period: { start: "2026-06-01T10:00:00.000Z" },
      centerId: "H12O",
      careSettingCode: "INPATIENT",
    });

    expect(encounter.class.code).toBe("IMP");
    expect(encounter.location[0].location.reference).toBe("Location/h12o-inpatient-ward");
  });

  it("maps GYNE_ULTRASOUND care setting to ambulatory class and ultrasound location", () => {
    const { result } = renderHook(() => useEncounterTemplate());

    const encounter = result.current.generateEncounter({
      encId: "enc-1",
      patientId: "pat-1",
      period: { start: "2026-06-01T10:00:00.000Z" },
      centerId: "HURYC",
      careSettingCode: "GYNE_ULTRASOUND",
    });

    expect(encounter.class.code).toBe("AMB");
    expect(encounter.location[0].location.reference).toBe("Location/huryc-gyne-ultrasound-unit");
  });

  it("uses centerId to populate serviceProvider for H12O", () => {
    const { result } = renderHook(() => useEncounterTemplate());

    const encounter = result.current.generateEncounter({
      encId: "enc-1",
      patientId: "pat-1",
      period: { start: "2026-06-01T10:00:00.000Z" },
      centerId: "Hospital Universitario 12 de Octubre",
    });

    expect(encounter.serviceProvider.reference).toBe("Organization/h12o");
  });

  it("does not generate Practitioner/null without a real practitionerId", () => {
    const { result } = renderHook(() => useEncounterTemplate());

    const encounter = result.current.generateEncounter({
      encId: "enc-1",
      patientId: "pat-1",
      period: { start: "2026-06-01T10:00:00.000Z" },
      centerId: "HURYC",
      practitionerId: null,
    });

    expect(encounter).not.toHaveProperty("participant");
    expect(JSON.stringify(encounter)).not.toContain("Practitioner/null");
    expect(JSON.stringify(encounter)).not.toContain("PAT_NHC");
    expect(JSON.stringify(encounter)).not.toContain("PAT_NOMBRE");
    expect(JSON.stringify(encounter)).not.toContain("patientPseudonym");
  });

  it("generates Practitioner reference only when practitionerId is valid", () => {
    const { result } = renderHook(() => useEncounterTemplate());

    const encounter = result.current.generateEncounter({
      encId: "enc-1",
      patientId: "pat-1",
      period: { start: "2026-06-01T10:00:00.000Z" },
      centerId: "HURYC",
      practitionerId: "practitioner-1",
      practitionerDisplay: "Profesional 1",
    });

    expect(encounter.participant[0].individual).toEqual({
      reference: "Practitioner/practitioner-1",
      display: "Profesional 1",
    });
  });
});
