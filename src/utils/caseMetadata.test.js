import {
  extractAnatomicalStructure,
  extractAnatomicalStructureMetadata,
  extractCenterId,
  extractHasAdnexalMass,
  extractLaterality,
  extractLateralityMetadata,
  extractObserverInitials,
  formatDuplicateCaseSummary,
  mapCenterToCode,
  normalizeAnatomicalStructure,
  normalizeLaterality,
  formatCodeStatusLabel,
  resolveDisplayStudyIdentifier,
  resolveStudyCodeDisplay,
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

  it("does not require PAT_CODIGO to validate case metadata", () => {
    const { item, ...rest } = questionnaireResponse;
    const withoutLegacyStudyCode = {
      ...rest,
      item: item.filter((entry) => entry.linkId !== "PAT_CODIGO"),
    };

    expect(validateCaseMetadata(withoutLegacyStudyCode)).toMatchObject({
      centerId: "HURYC",
      lateralityCode: "RIGHT",
      anatomicalStructureCode: "OVARY",
      studyCode: "",
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
      codeStatus: "CODE_ASSIGNED",
      studyPatientCode: "SP-100",
      nhc: "123",
      patientPseudonym: "secret",
    });

    expect(summary).toContain("Caso 7");
    expect(summary).toContain("Derecho");
    expect(summary).toContain("Ovario");
    expect(summary).toContain("2 evaluaciones");
    expect(summary).toContain("Código SP-100");
    expect(summary).not.toContain("123");
    expect(summary).not.toContain("secret");
  });

  it("prefers case and evaluation ids over PAT_CODIGO in display identifiers", () => {
    expect(
      resolveDisplayStudyIdentifier({
        caseId: 7,
        evaluationId: 3,
        patientCode: "LEGACY-1",
        questionnaireResponse,
      })
    ).toBe("Caso 7 · Evaluación 3");
  });

  it("prefers evaluationDisplayId and caseDisplayId for operational identifiers", () => {
    expect(
      resolveDisplayStudyIdentifier({
        evaluationDisplayId: "HURYC-C000001-E000003",
        caseDisplayId: "HURYC-C000001",
        questionnaireResponse,
      })
    ).toBe("HURYC-C000001-E000003");

    expect(
      resolveDisplayStudyIdentifier({
        caseDisplayId: "HURYC-C000001",
        questionnaireResponse,
      })
    ).toBe("HURYC-C000001");
  });

  it("keeps PAT_CODIGO only as a legacy fallback", () => {
    expect(
      resolveDisplayStudyIdentifier({
        questionnaireResponse,
      })
    ).toBe("STUDY-1");
  });

  it("returns a safe placeholder when no display identifier is available", () => {
    expect(resolveDisplayStudyIdentifier({ questionnaireResponse: { item: [] } })).toBe("—");
  });

  it("formats code status labels for safe UI display", () => {
    expect(formatCodeStatusLabel("PENDING_CODE")).toBe("Código pendiente");
    expect(formatCodeStatusLabel("CODE_ASSIGNED")).toBe("Código asignado");
    expect(formatCodeStatusLabel("CODE_CONFLICT")).toBe("Conflicto de código");
    expect(formatCodeStatusLabel(undefined)).toBe("—");
  });

  it("shows study code or pending placeholder without exposing pseudonyms", () => {
    expect(resolveStudyCodeDisplay({ studyPatientCode: "SP-100" })).toBe("SP-100");
    expect(resolveStudyCodeDisplay({ studyPatientCode: null, patientPseudonym: "secret" })).toBe("Pendiente");
  });

  it("extractHasAdnexalMass returns false when PAT_MA is No", () => {
    expect(extractHasAdnexalMass({ item: [{ linkId: "PAT_MA", answer: [{ valueCoding: { display: "No" } }] }] })).toBe(false);
    expect(extractHasAdnexalMass({ item: [{ linkId: "PAT_MA", answer: [{ valueString: "no" } ] }] })).toBe(false);
  });

  it("extractHasAdnexalMass returns true when PAT_MA is Sí or absent", () => {
    expect(extractHasAdnexalMass({ item: [{ linkId: "PAT_MA", answer: [{ valueCoding: { display: "Sí" } }] }] })).toBe(true);
    expect(extractHasAdnexalMass({ item: [] })).toBe(true);
    expect(extractHasAdnexalMass({ item: [{ linkId: "HOSPITAL_REF", answer: [{ valueString: "HURYC" }] }] })).toBe(true);
  });

  it("validates a no-mass questionnaire without requiring laterality or anatomical structure", () => {
    const result = validateCaseMetadata({
      item: [
        { linkId: "PAT_MA", answer: [{ valueCoding: { display: "No" } }] },
        { linkId: "HOSPITAL_REF", answer: [{ valueString: "Hospital Universitario Ramón y Cajal" }] },
        { linkId: "ECO_EXP_SIGLAS", answer: [{ valueString: "XYZ" }] },
      ],
    });

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.hasAdnexalMass).toBe(false);
    expect(result.centerId).toBe("HURYC");
    expect(result.lateralityCode).toBe("NOT_APPLICABLE");
    expect(result.lateralityDisplay).toBe("No aplica");
    expect(result.anatomicalStructureCode).toBe("NOT_APPLICABLE");
    expect(result.anatomicalStructureDisplay).toBe("No aplica");
    expect(result.errors).not.toContain("No se pudo identificar la lateralidad de la masa.");
    expect(result.errors).not.toContain("No se pudo identificar la estructura anatómica de la masa.");
  });

  it("still requires laterality and anatomical structure when PAT_MA is Sí", () => {
    const result = validateCaseMetadata({
      item: [
        { linkId: "PAT_MA", answer: [{ valueCoding: { display: "Sí" } }] },
        { linkId: "HOSPITAL_REF", answer: [{ valueString: "Hospital Universitario Ramón y Cajal" }] },
      ],
    });

    expect(result.isValid).toBe(false);
    expect(result.hasAdnexalMass).toBe(true);
    expect(result.errors).toContain("No se pudo identificar la lateralidad de la masa.");
    expect(result.errors).toContain("No se pudo identificar la estructura anatómica de la masa.");
  });

  it("includes hasAdnexalMass true in valid mass case metadata", () => {
    expect(validateCaseMetadata(questionnaireResponse)).toMatchObject({
      hasAdnexalMass: true,
      lateralityCode: "RIGHT",
      anatomicalStructureCode: "OVARY",
      isValid: true,
    });
  });
});
