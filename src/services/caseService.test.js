import ApiService from "./ApiService";
import {
  addSecondaryEvaluation,
  CASE_ERROR_MESSAGES,
  checkDuplicateCase,
  createCase,
  searchCasesByNhc,
} from "./caseService";

jest.mock("./ApiService");

const okResponse = (body) => ({
  ok: true,
  status: 200,
  json: jest.fn().mockResolvedValue(body),
});

const errorResponse = (status) => ({
  ok: false,
  status,
});

const errorResponseWithMessage = (status, message) => ({
  ok: false,
  status,
  json: jest.fn().mockResolvedValue({ message }),
});

describe("caseService", () => {
  beforeEach(() => {
    ApiService.mockReset();
  });

  it("calls check duplicate endpoint", async () => {
    ApiService.mockResolvedValue(okResponse({ matches: [] }));

    await checkDuplicateCase("token", {
      centerId: "HURYC",
      nhc: "transient",
      laterality: "RIGHT",
      anatomicalStructure: "OVARY",
      lateralityCode: "RIGHT",
      lateralityDisplay: "Derecho",
      anatomicalStructureCode: "OVARY",
      anatomicalStructureDisplay: "Ovario",
    });

    expect(ApiService).toHaveBeenCalledWith("token", "POST", "/app/cases/check-duplicate", {
      centerId: "HURYC",
      nhc: "transient",
      laterality: "RIGHT",
      anatomicalStructure: "OVARY",
      lateralityCode: "RIGHT",
      lateralityDisplay: "Derecho",
      anatomicalStructureCode: "OVARY",
      anatomicalStructureDisplay: "Ovario",
    });
  });

  it("searches cases by NHC with POST body and no URL interpolation", async () => {
    ApiService.mockResolvedValue(okResponse({ found: true, cases: [] }));

    await searchCasesByNhc("token", {
      centerId: "HURYC",
      nhc: "123456",
    });

    expect(ApiService).toHaveBeenCalledWith("token", "POST", "/app/cases/search-by-nhc", {
      centerId: "HURYC",
      nhc: "123456",
    });
    expect(ApiService.mock.calls[0][2]).not.toContain("123456");
  });

  it("maps NHC search 404 to a safe message", async () => {
    ApiService.mockResolvedValue(errorResponse(404));

    await expect(
      searchCasesByNhc("token", {
        centerId: "HURYC",
        nhc: "123456",
      })
    ).rejects.toThrow("No se encontró participante/caso pendiente para el NHC introducido en este centro.");
  });

  it("calls create case endpoint without sensitive questionnaire items", async () => {
    ApiService.mockResolvedValue(okResponse({ caseId: 1, evaluationId: 1, questionnaireResponseFhirId: 123 }));

    await createCase("token", {
      centerId: "HURYC",
      nhc: "transient",
      lateralityCode: "RIGHT",
      lateralityDisplay: "Derecho",
      anatomicalStructureCode: "OVARY",
      anatomicalStructureDisplay: "Ovario",
      encounterId: "enc-1",
      observerInitials: "ABC",
      careSettingCode: "EMERGENCY",
      careSettingDisplay: "Urgencias",
      studyConsentConfirmed: true,
      consentVersion: "MIA_STUDY_CONSENT_V1",
      questionnaireResponse: {
        item: [
          { linkId: "PAT_NHC", answer: [{ valueString: "123" }] },
          { linkId: "PAT_NOMBRE", answer: [{ valueString: "Nombre" }] },
          { linkId: "PAT_CODIGO", answer: [{ valueString: "STUDY-1" }] },
        ],
      },
    });

    const payload = ApiService.mock.calls[0][3];
    expect(ApiService.mock.calls[0][2]).toBe("/app/cases");
    expect(payload).toMatchObject({
      nhc: "transient",
      laterality: "RIGHT",
      anatomicalStructure: "OVARY",
      lateralityCode: "RIGHT",
      lateralityDisplay: "Derecho",
      anatomicalStructureCode: "OVARY",
      anatomicalStructureDisplay: "Ovario",
      careSettingCode: "EMERGENCY",
      careSettingDisplay: "Urgencias",
      studyConsentConfirmed: true,
      consentVersion: "MIA_STUDY_CONSENT_V1",
    });
    expect(JSON.stringify(payload.questionnaireResponse)).not.toContain("PAT_NHC");
    expect(JSON.stringify(payload.questionnaireResponse)).not.toContain("PAT_NOMBRE");
    expect(JSON.stringify(payload.questionnaireResponse)).not.toContain("PAT_CODIGO");
    expect(JSON.stringify(payload.questionnaireResponse)).not.toContain("HURYC-0001");
    expect(payload.studyPatientCode).toBeUndefined();
    expect(payload.nhc).not.toBe("STUDY-1");
    expect(payload.hasAdnexalMass).toBe(true);
  });

  it("sends hasAdnexalMass false for no-mass registrations", async () => {
    ApiService.mockResolvedValue(okResponse({ caseId: 2, evaluationId: 3, questionnaireResponseFhirId: 200 }));

    await createCase("token", {
      centerId: "HURYC",
      nhc: "transient",
      lateralityCode: "NOT_APPLICABLE",
      lateralityDisplay: "No aplica",
      anatomicalStructureCode: "NOT_APPLICABLE",
      anatomicalStructureDisplay: "No aplica",
      hasAdnexalMass: false,
      encounterId: "enc-2",
      observerInitials: "XYZ",
      careSettingCode: "EMERGENCY",
      careSettingDisplay: "Urgencias",
      questionnaireResponse: { item: [] },
    });

    const payload = ApiService.mock.calls[0][3];
    expect(payload.hasAdnexalMass).toBe(false);
    expect(payload.lateralityCode).toBe("NOT_APPLICABLE");
    expect(payload.anatomicalStructureCode).toBe("NOT_APPLICABLE");
  });

  it("calls add secondary evaluation endpoint", async () => {
    ApiService.mockResolvedValue(okResponse({ caseId: 1, evaluationId: 2, questionnaireResponseFhirId: 124 }));

    await addSecondaryEvaluation("token", 1, {
      encounterId: "enc-1",
      observerInitials: "ABC",
      careSettingCode: "INPATIENT",
      careSettingDisplay: "Hospitalización",
      studyConsentConfirmed: true,
      consentVersion: "MIA_STUDY_CONSENT_V1",
      questionnaireResponse: {
        item: [
          { linkId: "PAT_CODIGO", answer: [{ valueString: "STUDY-1" }] },
          { linkId: "PAT_NHC", answer: [{ valueString: "123" }] },
        ],
      },
    });

    expect(ApiService.mock.calls[0][2]).toBe("/app/cases/1/evaluations");
    expect(ApiService.mock.calls[0][3].careSettingCode).toBe("INPATIENT");
    expect(ApiService.mock.calls[0][3].careSettingDisplay).toBe("Hospitalización");
    expect(ApiService.mock.calls[0][3].studyPatientCode).toBeUndefined();
    expect(ApiService.mock.calls[0][3].studyConsentConfirmed).toBe(true);
    expect(ApiService.mock.calls[0][3].consentVersion).toBe("MIA_STUDY_CONSENT_V1");
    expect(JSON.stringify(ApiService.mock.calls[0][3].questionnaireResponse)).not.toContain("PAT_CODIGO");
    expect(JSON.stringify(ApiService.mock.calls[0][3].questionnaireResponse)).not.toContain("PAT_NHC");
  });

  it("maps 400 study consent validation to a safe message", async () => {
    ApiService.mockResolvedValue(errorResponseWithMessage(400, "STUDY_CONSENT_REQUIRED"));

    await expect(
      createCase("token", {
        centerId: "HURYC",
        nhc: "transient",
        lateralityCode: "RIGHT",
        lateralityDisplay: "Derecho",
        anatomicalStructureCode: "OVARY",
        anatomicalStructureDisplay: "Ovario",
        encounterId: "enc-1",
        observerInitials: "ABC",
        studyConsentConfirmed: true,
        consentVersion: "MIA_STUDY_CONSENT_V1",
        questionnaireResponse: { item: [] },
      })
    ).rejects.toThrow(CASE_ERROR_MESSAGES.studyConsentRequired);
  });

  it("maps 409 study code conflicts to a safe message", async () => {
    ApiService.mockResolvedValue(errorResponse(409));

    await expect(
      createCase("token", {
        centerId: "HURYC",
        nhc: "transient",
        lateralityCode: "RIGHT",
        lateralityDisplay: "Derecho",
        anatomicalStructureCode: "OVARY",
        anatomicalStructureDisplay: "Ovario",
        encounterId: "enc-1",
        observerInitials: "ABC",
        questionnaireResponse: { item: [] },
        studyPatientCode: "HURYC-0001",
      })
    ).rejects.toThrow(CASE_ERROR_MESSAGES.studyCodeConflict);
  });

  it("maps 403 to a safe message", async () => {
    ApiService.mockResolvedValue(errorResponse(403));

    await expect(
      createCase("token", {
        centerId: "HURYC",
        nhc: "transient",
        lateralityCode: "RIGHT",
        lateralityDisplay: "Derecho",
        anatomicalStructureCode: "OVARY",
        anatomicalStructureDisplay: "Ovario",
        encounterId: "enc-1",
        observerInitials: "ABC",
        questionnaireResponse: { item: [] },
      })
    ).rejects.toThrow(CASE_ERROR_MESSAGES.forbidden);
  });

  it("maps 401 to a session expired message", async () => {
    ApiService.mockResolvedValue(errorResponse(401));

    await expect(
      createCase("token", {
        centerId: "HURYC",
        nhc: "transient",
        lateralityCode: "RIGHT",
        lateralityDisplay: "Derecho",
        anatomicalStructureCode: "OVARY",
        anatomicalStructureDisplay: "Ovario",
        encounterId: "enc-1",
        observerInitials: "ABC",
        questionnaireResponse: { item: [] },
      })
    ).rejects.toThrow(CASE_ERROR_MESSAGES.unauthorized);
  });
});
