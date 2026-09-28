import ApiService from "./ApiService";
import {
  recordStudyUsageEvent,
  sanitizeStudyUsageEventPayload,
  STUDY_USAGE_EVENT_ERROR_MESSAGES,
} from "./studyUsageEventService";

jest.mock("./ApiService", () => jest.fn());

const okResponse = (body = {}) => ({
  ok: true,
  status: 201,
  json: jest.fn().mockResolvedValue(body),
});

describe("studyUsageEventService", () => {
  beforeEach(() => {
    ApiService.mockReset();
  });

  it("sanitizes payloads so they do not include sensitive metadata or questionnaire content", () => {
    expect(
      sanitizeStudyUsageEventPayload({
        eventType: "QUESTIONNAIRE_STARTED",
        flowId: "flow-1",
        centerId: "HURYC",
        caseId: 12,
        evaluationId: 14,
        encounterId: "enc-1",
        questionnaireResponseFhirId: 99,
        careSettingCode: "EMERGENCY",
        evaluationType: "PRIMARY",
        hasAdnexalMass: true,
        numberOfMassesInEncounter: 1,
        ecoScoreStatus: "CALCULATED",
        questionnaireResponse: { item: [{ linkId: "PAT_NHC" }] },
        metadata: {
          source: "questionnaire_form",
          includesProbability: true,
          nhc: "123456",
          patientPseudonym: "pseudo-1",
          hash: "hash-1",
          item: [{ linkId: "PAT_MA" }],
        },
      })
    ).toEqual({
      eventType: "QUESTIONNAIRE_STARTED",
      flowId: "flow-1",
      centerId: "HURYC",
      caseId: 12,
      evaluationId: 14,
      encounterId: "enc-1",
      questionnaireResponseFhirId: 99,
      careSettingCode: "EMERGENCY",
      evaluationType: "PRIMARY",
      hasAdnexalMass: true,
      numberOfMassesInEncounter: 1,
      ecoScoreStatus: "CALCULATED",
      metadata: {
        source: "questionnaire_form",
        includesProbability: true,
      },
    });
  });

  it("posts only the sanitized usage payload", async () => {
    ApiService.mockResolvedValue(okResponse({ id: 44 }));

    await recordStudyUsageEvent("token", {
      eventType: "REPORT_GENERATED",
      flowId: "flow-2",
      centerId: "HURYC",
      metadata: {
        reportSource: "encounters_screen",
        includesProbability: false,
        nhc: "123456",
      },
    });

    expect(ApiService).toHaveBeenCalledWith("token", "POST", "/app/study-usage-events", {
      eventType: "REPORT_GENERATED",
      flowId: "flow-2",
      centerId: "HURYC",
      caseId: null,
      evaluationId: null,
      encounterId: null,
      questionnaireResponseFhirId: null,
      careSettingCode: null,
      evaluationType: null,
      hasAdnexalMass: null,
      numberOfMassesInEncounter: null,
      ecoScoreStatus: null,
      metadata: {
        reportSource: "encounters_screen",
        includesProbability: false,
      },
    });
  });

  it("maps 403 responses to the safe permission error", async () => {
    ApiService.mockResolvedValue({
      ok: false,
      status: 403,
      json: jest.fn(),
    });

    await expect(
      recordStudyUsageEvent("token", { eventType: "QUESTIONNAIRE_STARTED" })
    ).rejects.toThrow(STUDY_USAGE_EVENT_ERROR_MESSAGES.forbidden);
  });
});
