import ApiService from "./ApiService";
import {
  addSecondaryEvaluation,
  checkDuplicateCase,
  createCase,
} from "./caseService";

jest.mock("./ApiService");

const okResponse = (body) => ({
  ok: true,
  status: 200,
  json: jest.fn().mockResolvedValue(body),
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
      laterality: "RIGHT",
      anatomicalStructure: "OVARY",
      lateralityCode: "RIGHT",
      lateralityDisplay: "Derecho",
      anatomicalStructureCode: "OVARY",
      anatomicalStructureDisplay: "Ovario",
    });
    expect(JSON.stringify(payload.questionnaireResponse)).not.toContain("PAT_NHC");
    expect(JSON.stringify(payload.questionnaireResponse)).not.toContain("PAT_NOMBRE");
  });

  it("calls add secondary evaluation endpoint", async () => {
    ApiService.mockResolvedValue(okResponse({ caseId: 1, evaluationId: 2, questionnaireResponseFhirId: 124 }));

    await addSecondaryEvaluation("token", 1, {
      encounterId: "enc-1",
      observerInitials: "ABC",
      questionnaireResponse: { item: [{ linkId: "PAT_CODIGO", answer: [{ valueString: "STUDY-1" }] }] },
    });

    expect(ApiService.mock.calls[0][2]).toBe("/app/cases/1/evaluations");
  });
});
