import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ResponsesProbability from "./ResponsesProbability";
import ApiService from "../services/ApiService";
import { createCase, addSecondaryEvaluation, checkDuplicateCase } from "../services/caseService";
import { upsertEcoScoreResult } from "../services/ecoScoreResultService";

jest.mock("../services/ApiService", () => jest.fn());
jest.mock("../utils/pdfReport", () => ({
  generateClinicalReportPdf: jest.fn(),
}));
jest.mock("../services/caseService", () => ({
  createCase: jest.fn(),
  addSecondaryEvaluation: jest.fn(),
  checkDuplicateCase: jest.fn(),
  CASE_ERROR_MESSAGES: {
    forbidden: "forbidden",
    studyCodeConflict: "conflict",
    unauthorized: "unauthorized",
    network: "network",
  },
}));
jest.mock("../services/ecoScoreResultService", () => ({
  upsertEcoScoreResult: jest.fn(),
}));

const mockGenerateRiskAssessment = jest.fn((riskId, encId, patientId, practitioner, prob, mitigation, quesRId) => ({
  resourceType: "RiskAssessment",
  id: riskId,
  derivedFrom: [{ reference: `QuestionnaireResponse/${quesRId}` }],
  prediction: [{ probabilityDecimal: prob }],
}));

jest.mock("@react-keycloak/web", () => ({
  useKeycloak: () => ({
    keycloak: { token: "token" },
  }),
}));

jest.mock("../screens/QuestionnaireScreen", () => ({
  generateId: jest.fn(() => "generated-id"),
  generatePeriod: jest.fn(() => ({
    start: "2026-06-01T10:00:00.000Z",
    end: "2026-06-01T10:15:00.000Z",
  })),
}));

jest.mock("../hooks/useEncounterTemplate", () => ({
  useEncounterTemplate: () => ({
    generateEncounter: jest.fn(() => ({ resourceType: "Encounter" })),
  }),
}));

jest.mock("../hooks/useObservationTemplate", () => ({
  useObservationTemplate: () => ({
    generateObservation: jest.fn(() => ({ resourceType: "Observation" })),
  }),
}));

jest.mock("../hooks/useImageStudyTemplate", () => ({
  useImageStudyTemplate: () => ({
    generateImagingStudy: jest.fn(() => ({ resourceType: "ImagingStudy" })),
  }),
}));

jest.mock("../hooks/useRiskAssessmentTemplate", () => ({
  useRiskAssessmentTemplate: () => ({
    generateRiskAssessment: mockGenerateRiskAssessment,
  }),
}));

jest.mock("../hooks/usePatientTemplate", () => ({
  usePatientTemplate: () => ({
    generatePatient: jest.fn(() => ({ resourceType: "Patient" })),
  }),
}));

const okResponse = (body = {}) => ({
  ok: true,
  status: 200,
  json: jest.fn().mockResolvedValue(body),
});

const baseMassItems = [
  { linkId: "PAT_MA", answer: [{ valueCoding: { code: "yes", display: "Sí" } }] },
  { linkId: "HOSPITAL_REF", answer: [{ valueString: "HURYC" }] },
  { linkId: "MA_LADO", answer: [{ valueCoding: { code: "RIGHT", display: "Derecho" } }] },
  { linkId: "MA_ESTRUCTURA", answer: [{ valueCoding: { code: "FALLOPIAN_TUBE", display: "Trompa" } }] },
  { linkId: "ECO_EXP_SIGLAS", answer: [{ valueString: "ABC" }] },
];

const calculableResponse = {
  resourceType: "QuestionnaireResponse",
  status: "completed",
  item: [
    ...baseMassItems,
    { linkId: "MA_Q_CONTORNO", answer: [{ valueCoding: { display: "Regular" } }] },
    { linkId: "MA_SA", answer: [{ valueCoding: { display: "No" } }] },
    { linkId: "MA_Q_AS", answer: [{ valueCoding: { display: "No" } }] },
    { linkId: "MA_PAPS", answer: [{ valueCoding: { display: "No" } }] },
  ],
};

const notCalculableResponse = {
  resourceType: "QuestionnaireResponse",
  status: "completed",
  item: [
    ...baseMassItems,
    { linkId: "MA_SA", answer: [{ valueCoding: { display: "No" } }] },
    { linkId: "MA_Q_AS", answer: [{ valueCoding: { display: "No" } }] },
    { linkId: "MA_PAPS", answer: [{ valueCoding: { display: "No" } }] },
  ],
};

const notApplicableResponse = {
  resourceType: "QuestionnaireResponse",
  status: "completed",
  item: [
    { linkId: "PAT_MA", answer: [{ valueCoding: { code: "no", display: "No" } }] },
    { linkId: "HOSPITAL_REF", answer: [{ valueString: "HURYC" }] },
    { linkId: "ECO_EXP_SIGLAS", answer: [{ valueString: "ABC" }] },
    { linkId: "OD_M1", answer: [{ valueInteger: 3 }] },
    { linkId: "OD_M2", answer: [{ valueInteger: 4 }] },
    { linkId: "OD_FOL", answer: [{ valueInteger: 2 }] },
    { linkId: "OI_M1", answer: [{ valueInteger: 5 }] },
    { linkId: "OI_M2", answer: [{ valueInteger: 6 }] },
    { linkId: "OI_FOL", answer: [{ valueInteger: 4 }] },
  ],
};

const renderComponent = (responses) =>
  render(
    <ResponsesProbability
      responses={responses}
      event={jest.fn()}
      transientNhc="123456"
      onClearTransientNhc={jest.fn()}
      studyPatientCode=""
      canUseStudyPatientCode={false}
      careSetting={{ code: "EMERGENCY", display: "Urgencias" }}
      onCaseSaved={jest.fn()}
    />
  );

const prepareDirectSave = async () => {
  await screen.findByRole("button", { name: "Guardar" });
  await userEvent.type(screen.getByRole("textbox"), "Observacion");
  await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
  await screen.findByText("Confirmar guardado del cuestionario");
  const saveButtons = screen.getAllByRole("button", { name: "Guardar" });
  await userEvent.click(saveButtons[saveButtons.length - 1]);
};

describe("ResponsesProbability ECO-SCORE persistence", () => {
  beforeEach(() => {
    ApiService.mockReset();
    createCase.mockReset();
    addSecondaryEvaluation.mockReset();
    checkDuplicateCase.mockReset();
    upsertEcoScoreResult.mockReset();
    mockGenerateRiskAssessment.mockClear();

    checkDuplicateCase.mockResolvedValue({ matches: [] });
    createCase.mockResolvedValue({
      caseId: 1,
      evaluationId: 88,
      questionnaireResponseFhirId: 501,
    });
    ApiService.mockImplementation((token, method, endpoint, body) => {
      if (["/audit/register", "/fhir/Patient/check-or-create", "/fhir/Encounter", "/fhir/ImagingStudy"].includes(endpoint)) {
        return Promise.resolve({ ok: true, status: 200 });
      }
      if (endpoint === "/fhir/Observation" || endpoint === "/fhir/RiskAssessment") {
        return Promise.resolve(okResponse(body));
      }
      return Promise.resolve(okResponse({}));
    });
    upsertEcoScoreResult.mockResolvedValue({ id: 1 });
  });

  it("persists calculated ECO-SCORE and creates RiskAssessment with numeric probability", async () => {
    renderComponent([calculableResponse]);

    await prepareDirectSave();

    await waitFor(() => expect(upsertEcoScoreResult).toHaveBeenCalled());

    expect(mockGenerateRiskAssessment).toHaveBeenCalled();
    expect(ApiService.mock.calls.some((call) => call[2] === "/fhir/RiskAssessment")).toBe(true);
    const riskAssessmentArgs = mockGenerateRiskAssessment.mock.calls[0];
    expect(riskAssessmentArgs[3]).toBeNull();
    expect(riskAssessmentArgs[4]).toEqual(expect.any(Number));
    expect(riskAssessmentArgs[5]).toBe("");
    expect(riskAssessmentArgs[6]).toBe(501);
    const expectedRiskAssessmentFhirId = riskAssessmentArgs[0];

    expect(upsertEcoScoreResult).toHaveBeenCalledWith(
      "token",
      88,
      expect.objectContaining({
        questionnaireResponseFhirId: 501,
        riskAssessmentFhirId: expectedRiskAssessmentFhirId,
        status: "CALCULATED",
        probability: expect.any(Number),
        probabilityPercent: expect.any(Number),
        formulaVersion: "ECO_SCORE_V1",
        missingVariables: [],
      })
    );
    expect(JSON.stringify(upsertEcoScoreResult.mock.calls[0][2])).not.toContain("123456");
    expect(JSON.stringify(upsertEcoScoreResult.mock.calls[0][2])).not.toContain("patientPseudonym");
    expect(JSON.stringify(upsertEcoScoreResult.mock.calls[0][2])).not.toContain("hash");
  });

  it("persists NOT_CALCULABLE without creating RiskAssessment", async () => {
    renderComponent([notCalculableResponse]);

    await prepareDirectSave();

    await waitFor(() => expect(upsertEcoScoreResult).toHaveBeenCalled());

    expect(mockGenerateRiskAssessment).not.toHaveBeenCalled();
    expect(ApiService.mock.calls.some((call) => call[2] === "/fhir/RiskAssessment")).toBe(false);
    expect(upsertEcoScoreResult).toHaveBeenCalledWith(
      "token",
      88,
      expect.objectContaining({
        status: "NOT_CALCULABLE",
        probability: null,
        probabilityPercent: null,
        riskAssessmentFhirId: null,
        missingVariables: expect.arrayContaining(["MA_Q_CONTORNO"]),
      })
    );
  });

  it("persists NOT_APPLICABLE for no-mass questionnaires without RiskAssessment", async () => {
    renderComponent([notApplicableResponse]);

    await prepareDirectSave();

    await waitFor(() => expect(upsertEcoScoreResult).toHaveBeenCalled());

    expect(mockGenerateRiskAssessment).not.toHaveBeenCalled();
    expect(upsertEcoScoreResult).toHaveBeenCalledWith(
      "token",
      88,
      expect.objectContaining({
        status: "NOT_APPLICABLE",
        probability: null,
        probabilityPercent: null,
        riskAssessmentFhirId: null,
      })
    );
  });
});
