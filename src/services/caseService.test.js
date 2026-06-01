import ApiService from "./ApiService";
import {
  addSecondaryEvaluation,
  CASE_ERROR_MESSAGES,
  checkDuplicateCase,
  createCase,
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
      studyPatientCode: "HURYC-0001",
      careSettingCode: "EMERGENCY",
      careSettingDisplay: "Urgencias",
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
      studyPatientCode: "HURYC-0001",
      careSettingCode: "EMERGENCY",
      careSettingDisplay: "Urgencias",
    });
    expect(JSON.stringify(payload.questionnaireResponse)).not.toContain("PAT_NHC");
    expect(JSON.stringify(payload.questionnaireResponse)).not.toContain("PAT_NOMBRE");
    expect(JSON.stringify(payload.questionnaireResponse)).not.toContain("PAT_CODIGO");
    expect(JSON.stringify(payload.questionnaireResponse)).not.toContain("HURYC-0001");
    expect(payload.nhc).not.toBe("STUDY-1");
  });

  it("calls add secondary evaluation endpoint", async () => {
    ApiService.mockResolvedValue(okResponse({ caseId: 1, evaluationId: 2, questionnaireResponseFhirId: 124 }));

    await addSecondaryEvaluation("token", 1, {
      encounterId: "enc-1",
      observerInitials: "ABC",
      careSettingCode: "INPATIENT",
      careSettingDisplay: "Hospitalización",
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
    expect(JSON.stringify(ApiService.mock.calls[0][3].questionnaireResponse)).not.toContain("PAT_CODIGO");
    expect(JSON.stringify(ApiService.mock.calls[0][3].questionnaireResponse)).not.toContain("PAT_NHC");
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
