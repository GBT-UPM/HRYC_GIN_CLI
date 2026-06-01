import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ResponsesProbability from "./ResponsesProbability";
import ApiService from "../services/ApiService";
import { CASE_ERROR_MESSAGES } from "../services/caseService";

jest.mock("../services/ApiService", () => jest.fn());

const mockGenerateEncounter = jest.fn(() => ({ resourceType: "Encounter" }));

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
    generateEncounter: mockGenerateEncounter,
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
    generateRiskAssessment: jest.fn(() => ({ resourceType: "RiskAssessment" })),
  }),
}));

jest.mock("../hooks/usePatientTemplate", () => ({
  usePatientTemplate: () => ({
    generatePatient: jest.fn(() => ({ resourceType: "Patient" })),
  }),
}));

jest.mock("jspdf", () => jest.fn().mockImplementation(() => ({
  addImage: jest.fn(),
  setFont: jest.fn(),
  setFontSize: jest.fn(),
  text: jest.fn(),
  splitTextToSize: jest.fn(() => []),
  addPage: jest.fn(),
  autoPrint: jest.fn(),
  output: jest.fn(() => "blob:url"),
  internal: { pageSize: { getHeight: () => 297 } },
})));

const okResponse = (body = {}) => ({
  ok: true,
  status: 200,
  json: jest.fn().mockResolvedValue(body),
});

const conflictResponse = () => ({
  ok: false,
  status: 409,
  json: jest.fn(),
});

const questionnaireResponse = {
  resourceType: "QuestionnaireResponse",
  status: "completed",
  item: [
    { linkId: "PAT_MA", answer: [{ valueCoding: { code: "yes", display: "Sí" } }] },
    { linkId: "HOSPITAL_REF", answer: [{ valueString: "HURYC" }] },
    { linkId: "MA_LADO", answer: [{ valueCoding: { code: "RIGHT", display: "Derecho" } }] },
    { linkId: "MA_ESTRUCTURA", answer: [{ valueCoding: { code: "FALLOPIAN_TUBE", display: "Trompa" } }] },
    { linkId: "ECO_EXP_SIGLAS", answer: [{ valueString: "ABC" }] },
    { linkId: "PAT_CODIGO", answer: [{ valueString: "NO-DEBE-IR" }] },
    { linkId: "PAT_NHC", answer: [{ valueString: "123456" }] },
  ],
};

const renderComponent = (props = {}) => render(
  <ResponsesProbability
    responses={[questionnaireResponse]}
    event={jest.fn()}
    transientNhc="123456"
    onClearTransientNhc={jest.fn()}
    studyPatientCode="HURYC-0001"
    canUseStudyPatientCode
    careSetting={{ code: "EMERGENCY", display: "Urgencias" }}
    onCaseSaved={jest.fn()}
    {...props}
  />
);

const setupApi = ({ secondCaseResponse = okResponse({ questionnaireResponseFhirId: "qr-1" }) } = {}) => {
  let createCaseCalls = 0;
  ApiService.mockImplementation((token, method, endpoint, body) => {
    if (endpoint === "/app/cases/check-duplicate") {
      return Promise.resolve(okResponse({ matches: [] }));
    }

    if (endpoint === "/audit/register") {
      return Promise.resolve({ ok: true, status: 200 });
    }

    if (endpoint === "/fhir/Patient/check-or-create") {
      return Promise.resolve({ ok: true, status: 200 });
    }

    if (endpoint === "/fhir/Encounter") {
      return Promise.resolve({ ok: true, status: 200 });
    }

    if (endpoint === "/fhir/ImagingStudy") {
      return Promise.resolve({ ok: true, status: 200 });
    }

    if (endpoint === "/app/cases") {
      createCaseCalls += 1;
      return Promise.resolve(createCaseCalls === 1 ? conflictResponse() : secondCaseResponse);
    }

    if (endpoint === "/fhir/Observation" || endpoint === "/fhir/RiskAssessment") {
      return Promise.resolve(okResponse({}));
    }

    return Promise.resolve(okResponse({}));
  });
};

const submitInitialSave = async () => {
  await screen.findByText("Masa anexial #1");
  await userEvent.type(screen.getByRole("textbox"), "Conclusión clínica");
  await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

  expect(await screen.findByText("Confirmar guardado")).toBeInTheDocument();
  expect(screen.getByText("NHC informado")).toBeInTheDocument();
  expect(screen.queryByText("123456")).not.toBeInTheDocument();
  expect(screen.getByText("Número de masas:")).toBeInTheDocument();
  expect(screen.getByText("Ámbito asistencial:")).toBeInTheDocument();
  expect(screen.getByText("Urgencias")).toBeInTheDocument();

  const saveButtons = screen.getAllByRole("button", { name: "Guardar" });
  await userEvent.click(saveButtons[saveButtons.length - 1]);
};

describe("ResponsesProbability study code conflict flow", () => {
  beforeEach(() => {
    ApiService.mockReset();
    mockGenerateEncounter.mockClear();
    mockGenerateEncounter.mockReturnValue({ resourceType: "Encounter" });
  });

  it("keeps clinical data visible and opens administrative conflict actions on 409", async () => {
    setupApi();
    const event = jest.fn();
    renderComponent({ event });

    await submitInitialSave();

    expect(await screen.findByText(CASE_ERROR_MESSAGES.studyCodeConflict)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Corregir código de estudio" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar sin código y dejar pendiente" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
    expect(screen.getByText("Masa anexial #1")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Conclusión clínica")).toBeInTheDocument();
    expect(event).not.toHaveBeenCalled();
  });

  it("retries with a corrected top-level studyPatientCode and keeps it out of QuestionnaireResponse", async () => {
    setupApi();
    const event = jest.fn();
    renderComponent({ event });

    await submitInitialSave();
    await screen.findByText(CASE_ERROR_MESSAGES.studyCodeConflict);

    await userEvent.clear(screen.getByLabelText("Nuevo código de estudio"));
    await userEvent.type(screen.getByLabelText("Nuevo código de estudio"), "HURYC-0002");
    await userEvent.click(screen.getByRole("button", { name: "Reintentar guardado" }));

    await waitFor(() => expect(event).toHaveBeenCalled());

    const createCaseCalls = ApiService.mock.calls.filter((call) => call[2] === "/app/cases");
    expect(createCaseCalls).toHaveLength(2);
    expect(createCaseCalls[0][3].studyPatientCode).toBe("HURYC-0001");
    expect(createCaseCalls[0][3].careSettingCode).toBe("EMERGENCY");
    expect(createCaseCalls[0][3].careSettingDisplay).toBe("Urgencias");
    expect(createCaseCalls[1][3].studyPatientCode).toBe("HURYC-0002");
    expect(JSON.stringify(createCaseCalls[1][3].questionnaireResponse)).not.toContain("EMERGENCY");
    expect(JSON.stringify(createCaseCalls[1][3].questionnaireResponse)).not.toContain("HURYC-0002");
    expect(JSON.stringify(createCaseCalls[1][3].questionnaireResponse)).not.toContain("PAT_CODIGO");
    expect(JSON.stringify(createCaseCalls[1][3].questionnaireResponse)).not.toContain("PAT_NHC");
    expect(ApiService.mock.calls.filter((call) => call[2] === "/fhir/Patient/check-or-create")).toHaveLength(1);
    expect(window.localStorage.getItem("123456")).toBeNull();
    expect(window.sessionStorage.getItem("123456")).toBeNull();
  });

  it("retries without studyPatientCode when saving as pending", async () => {
    setupApi();
    const event = jest.fn();
    renderComponent({ event });

    await submitInitialSave();
    await screen.findByText(CASE_ERROR_MESSAGES.studyCodeConflict);
    await userEvent.click(screen.getByRole("button", { name: "Guardar sin código y dejar pendiente" }));

    await waitFor(() => expect(event).toHaveBeenCalled());

    const createCaseCalls = ApiService.mock.calls.filter((call) => call[2] === "/app/cases");
    expect(createCaseCalls).toHaveLength(2);
    expect(createCaseCalls[1][3]).not.toHaveProperty("studyPatientCode");
    expect(createCaseCalls[1][3].nhc).toBe("123456");
    expect(JSON.stringify(createCaseCalls[1][3].questionnaireResponse)).not.toContain("123456");
  });

  it("passes metadata centerId to Encounter generation", async () => {
    setupApi({ secondCaseResponse: okResponse({ questionnaireResponseFhirId: "qr-1" }) });
    renderComponent({ studyPatientCode: "" });

    await submitInitialSave();

    await waitFor(() => expect(mockGenerateEncounter).toHaveBeenCalled());
    expect(mockGenerateEncounter).toHaveBeenCalledWith(
      expect.objectContaining({
        centerId: "HURYC",
        careSettingCode: "EMERGENCY",
      })
    );
  });
});
