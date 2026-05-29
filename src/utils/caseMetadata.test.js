import {
  extractAnatomicalStructure,
  extractAnatomicalStructureMetadata,
  extractCenterId,
  extractLaterality,
  extractLateralityMetadata,
  extractObserverInitials,
  formatDuplicateCaseSummary,
  mapCenterToCode,
  normalizeAnatomicalStructure,
  normalizeLaterality,
  validateCaseMetadata,
} from "./caseMetadata";

const questionnaireResponse = {
  item: [
    { linkId: "PAT_CODIGO", answer: [{ valueString: "STUDY-1" }] },
    { linkId: "HOSPITAL_REF", answer: [{ valueString: "Hospital Universitario Ramón y Cajal" }] },
    { linkId: "MA_LADO", answer: [{ valueCoding: { display: "Derecho", code: "right" } }] },
    { linkId: "MA_ESTRUCTURA", answer: [{ valueCoding: { display: "Ovario", code: "ovary" } }] },
    { linkId: "ECO_EXP_SIGLAS", answer: [{ valueString: "ABC" }] },
  ],
};

describe("case metadata", () => {
  it("extracts MA_LADO", () => {
    expect(extractLaterality(questionnaireResponse)).toBe("Derecho");
  });

  it("extracts ECO_EXP_SIGLAS", () => {
    expect(extractObserverInitials(questionnaireResponse)).toBe("ABC");
  });

  it("extracts MA_ESTRUCTURA", () => {
    expect(extractAnatomicalStructure(questionnaireResponse)).toBe("Ovario");
  });

  it("normalizes laterality codes", () => {
    expect(normalizeLaterality("Derecho")).toEqual({ code: "RIGHT", display: "Derecho" });
    expect(normalizeLaterality("right")).toEqual({ code: "RIGHT", display: "Derecho" });
    expect(normalizeLaterality("LEFT")).toEqual({ code: "LEFT", display: "Izquierdo" });
    expect(normalizeLaterality("unknown")).toEqual({ code: "UNDEFINED", display: "Indefinido" });
  });

  it("normalizes anatomical structure codes", () => {
    expect(normalizeAnatomicalStructure("Ovario")).toEqual({ code: "OVARY", display: "Ovario" });
    expect(normalizeAnatomicalStructure("Trompa")).toEqual({ code: "FALLOPIAN_TUBE", display: "Trompa" });
    expect(normalizeAnatomicalStructure("Paraovario")).toEqual({ code: "PARAOVARY", display: "Paraovario" });
    expect(normalizeAnatomicalStructure("Indefinido")).toEqual({ code: "UNDEFINED", display: "Indefinido" });
  });

  it("extracts normalized laterality and anatomical structure metadata", () => {
    expect(extractLateralityMetadata(questionnaireResponse)).toEqual({ code: "RIGHT", display: "Derecho" });
    expect(extractAnatomicalStructureMetadata(questionnaireResponse)).toEqual({ code: "OVARY", display: "Ovario" });
  });

  it("maps HURYC", () => {
    expect(mapCenterToCode("Hospital Universitario Ramón y Cajal")).toBe("HURYC");
    expect(mapCenterToCode("HURyC")).toBe("HURYC");
  });

  it("maps H12O", () => {
    expect(mapCenterToCode("Hospital Universitario 12 de Octubre")).toBe("H12O");
    expect(mapCenterToCode("H12O")).toBe("H12O");
  });

  it("validates required case metadata", () => {
    expect(validateCaseMetadata(questionnaireResponse)).toMatchObject({
      centerId: "HURYC",
      lateralityCode: "RIGHT",
      lateralityDisplay: "Derecho",
      anatomicalStructureCode: "OVARY",
      anatomicalStructureDisplay: "Ovario",
      observerInitials: "ABC",
      studyCode: "STUDY-1",
      isValid: true,
      errors: [],
    });
  });

  it("returns validation errors for unknown center and missing laterality/structure", () => {
    const result = validateCaseMetadata({
      item: [{ linkId: "HOSPITAL_REF", answer: [{ valueString: "Centro no mapeado" }] }],
    });

    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual([
      "No se pudo identificar el centro participante.",
      "No se pudo identificar la lateralidad de la masa.",
      "No se pudo identificar la estructura anatómica de la masa.",
    ]);
  });

  it("extracts center id from HOSPITAL_REF", () => {
    expect(extractCenterId(questionnaireResponse)).toBe("HURYC");
  });

  it("formats duplicate case summary without NHC or pseudonym", () => {
    const summary = formatDuplicateCaseSummary({
      caseId: 7,
      lateralityDisplay: "Derecho",
      anatomicalStructureDisplay: "Ovario",
      createdAt: "2026-05-29T10:00:00Z",
      evaluationCount: 2,
      nhc: "123",
      patientPseudonym: "secret",
    });

    expect(summary).toContain("Caso 7");
    expect(summary).toContain("Derecho");
    expect(summary).toContain("Ovario");
    expect(summary).toContain("2 evaluaciones");
    expect(summary).not.toContain("123");
    expect(summary).not.toContain("secret");
  });
});
