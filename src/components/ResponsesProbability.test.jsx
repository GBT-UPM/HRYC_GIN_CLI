import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { within } from "@testing-library/react";
import ResponsesProbability from "./ResponsesProbability";
import ApiService from "../services/ApiService";
import {
  addSecondaryEvaluation,
  CASE_ERROR_MESSAGES,
  checkDuplicateCase,
  createCase,
} from "../services/caseService";
import { upsertEcoScoreResult } from "../services/ecoScoreResultService";
import { recordStudyUsageEvent } from "../services/studyUsageEventService";
import LogoHRYC from "../assets/images/LogoHRYC.jpg";
import Logo12oct from "../assets/images/Logo12oct.jpg";

jest.mock("../services/ApiService", () => jest.fn());
jest.mock("../services/caseService", () => ({
  addSecondaryEvaluation: jest.fn(),
  checkDuplicateCase: jest.fn(),
  createCase: jest.fn(),
  CASE_ERROR_MESSAGES: {
    forbidden: "forbidden",
    studyCodeConflict: "conflict",
    unauthorized: "unauthorized",
    network: "No se pudo guardar el caso. Revise la conexión e inténtelo de nuevo.",
  },
}));
jest.mock("../services/ecoScoreResultService", () => ({
  upsertEcoScoreResult: jest.fn(),
}));
jest.mock("../services/studyUsageEventService", () => ({
  recordStudyUsageEvent: jest.fn(),
  STUDY_USAGE_EVENT_TYPES: {
    questionnaireSaved: "QUESTIONNAIRE_SAVED",
    reportGenerated: "REPORT_GENERATED",
  },
}));

const mockGenerateEncounter = jest.fn(() => ({ resourceType: "Encounter" }));
const mockGenerateRiskAssessment = jest.fn(() => ({ resourceType: "RiskAssessment" }));
const mockPdfInstance = {
  addImage: jest.fn(),
  setFont: jest.fn(),
  setFontSize: jest.fn(),
  setTextColor: jest.fn(),
  setDrawColor: jest.fn(),
  setFillColor: jest.fn(),
  roundedRect: jest.fn(),
  line: jest.fn(),
  text: jest.fn(),
  splitTextToSize: jest.fn((text) => [text]),
  addPage: jest.fn(),
  autoPrint: jest.fn(),
  output: jest.fn(() => "blob:url"),
  internal: {
    pageSize: {
      getHeight: () => 297,
      getWidth: () => 210,
    },
  },
};
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
    generateRiskAssessment: mockGenerateRiskAssessment,
  }),
}));

jest.mock("../hooks/usePatientTemplate", () => ({
  usePatientTemplate: () => ({
    generatePatient: jest.fn(() => ({ resourceType: "Patient" })),
  }),
}));

jest.mock("jspdf", () => ({
  __esModule: true,
  default: (() => {
    const MockJsPDF = jest.fn(function MockJsPDF() {});
    MockJsPDF.prototype.addImage = (...args) => mockPdfInstance.addImage(...args);
    MockJsPDF.prototype.setFont = (...args) => mockPdfInstance.setFont(...args);
    MockJsPDF.prototype.setFontSize = (...args) => mockPdfInstance.setFontSize(...args);
    MockJsPDF.prototype.setTextColor = (...args) => mockPdfInstance.setTextColor(...args);
    MockJsPDF.prototype.setDrawColor = (...args) => mockPdfInstance.setDrawColor(...args);
    MockJsPDF.prototype.setFillColor = (...args) => mockPdfInstance.setFillColor(...args);
    MockJsPDF.prototype.roundedRect = (...args) => mockPdfInstance.roundedRect(...args);
    MockJsPDF.prototype.line = (...args) => mockPdfInstance.line(...args);
    MockJsPDF.prototype.text = (...args) => mockPdfInstance.text(...args);
    MockJsPDF.prototype.splitTextToSize = (...args) => mockPdfInstance.splitTextToSize(...args);
    MockJsPDF.prototype.addPage = (...args) => mockPdfInstance.addPage(...args);
    MockJsPDF.prototype.autoPrint = (...args) => mockPdfInstance.autoPrint(...args);
    MockJsPDF.prototype.output = (...args) => mockPdfInstance.output(...args);
    MockJsPDF.prototype.internal = {
      pageSize: {
        getHeight: () => mockPdfInstance.internal.pageSize.getHeight(),
        getWidth: () => mockPdfInstance.internal.pageSize.getWidth(),
      },
    };
    return MockJsPDF;
  })(),
}));
const mockJsPDFCtor = jest.requireMock("jspdf").default;

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
    studyUsageFlowId="flow-123"
    onCaseSaved={jest.fn()}
    {...props}
  />
);

const setupApi = ({ secondCaseResponse = { questionnaireResponseFhirId: "qr-1", evaluationId: 88 } } = {}) => {
  let createCaseCalls = 0;
  checkDuplicateCase.mockResolvedValue({ matches: [] });
  createCase.mockImplementation(() => {
    createCaseCalls += 1;
    if (createCaseCalls === 1) {
      return Promise.reject(new Error(CASE_ERROR_MESSAGES.studyCodeConflict));
    }
    return Promise.resolve(secondCaseResponse);
  });
  ApiService.mockImplementation((token, method, endpoint, body) => {
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

    if (endpoint === "/fhir/Observation" || endpoint === "/fhir/RiskAssessment") {
      return Promise.resolve(okResponse({}));
    }

    return Promise.resolve(okResponse({}));
  });
};

const setupDuplicateSecondaryApi = ({
  duplicateMatch,
  secondaryResponse = { questionnaireResponseFhirId: "qr-2", evaluationId: 89 },
  independentResponse = { questionnaireResponseFhirId: "qr-3", evaluationId: 90 },
}) => {
  checkDuplicateCase.mockResolvedValue({ matches: [duplicateMatch] });
  addSecondaryEvaluation.mockResolvedValue(secondaryResponse);
  createCase.mockResolvedValue(independentResponse);
  ApiService.mockImplementation((token, method, endpoint) => {
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

    if (endpoint === "/fhir/Observation" || endpoint === "/fhir/RiskAssessment") {
      return Promise.resolve(okResponse({}));
    }

    return Promise.resolve(okResponse({}));
  });
};

const submitInitialSave = async () => {
  await screen.findAllByText("Masa anexial #1");
  await userEvent.type(screen.getByRole("textbox"), "Conclusión clínica");
  await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

  expect(await screen.findByText("Confirmar guardado del cuestionario")).toBeInTheDocument();
  expect(screen.getByText("Revise los datos principales antes de guardar el cuestionario ecográfico.")).toBeInTheDocument();
  expect(screen.getByText("Contexto del estudio")).toBeInTheDocument();
  expect(screen.getByText("Datos de comprobación")).toBeInTheDocument();
  expect(screen.getByText("Cuestionario")).toBeInTheDocument();
  expect(screen.getAllByText("NHC informado").length).toBeGreaterThan(0);
  expect(screen.queryByText("123456")).not.toBeInTheDocument();
  expect(screen.getAllByText("1 masa").length).toBeGreaterThan(0);
  expect(screen.getAllByText("Ámbito asistencial").length).toBeGreaterThan(0);
  expect(screen.getAllByText("Urgencias").length).toBeGreaterThan(0);

  const saveButtons = screen.getAllByRole("button", { name: "Guardar" });
  await userEvent.click(saveButtons[saveButtons.length - 1]);
};

describe("ResponsesProbability study code conflict flow", () => {
  beforeEach(() => {
    ApiService.mockReset();
    createCase.mockReset();
    addSecondaryEvaluation.mockReset();
    checkDuplicateCase.mockReset();
    recordStudyUsageEvent.mockReset();
    recordStudyUsageEvent.mockResolvedValue({ id: 1 });
    upsertEcoScoreResult.mockReset();
    mockGenerateEncounter.mockClear();
    mockGenerateEncounter.mockReturnValue({ resourceType: "Encounter" });
    mockGenerateRiskAssessment.mockClear();
    mockGenerateRiskAssessment.mockReturnValue({ resourceType: "RiskAssessment" });
    upsertEcoScoreResult.mockResolvedValue({ id: 1 });
    Object.values(mockPdfInstance).forEach((value) => {
      if (typeof value === "function" && value.mockClear) {
        value.mockClear();
      }
    });
    mockPdfInstance.splitTextToSize.mockImplementation((text) => [text]);
    jest.spyOn(window, "open").mockImplementation(() => null);
  });

  afterEach(() => {
    window.open.mockRestore();
  });

  it("renders the final clinical review layout without changing report or actions", async () => {
    renderComponent();

    expect(await screen.findByText("Informe médico")).toBeInTheDocument();
    expect(screen.getByText("Revisión del contenido generado a partir del cuestionario ecográfico.")).toBeInTheDocument();
    expect(screen.getByText("Informe estructurado")).toBeInTheDocument();
    expect(screen.getByText("Contexto clínico")).toBeInTheDocument();
    expect(screen.getByText("Conclusión del ecografista")).toBeInTheDocument();
    expect(
      screen.getByText("Añada una conclusión clínica libre si desea complementar el informe estructurado.")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar e Imprimir" })).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
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
    expect(screen.getAllByText("Masa anexial #1").length).toBeGreaterThan(0);
    expect(screen.getByDisplayValue("Conclusión clínica")).toBeInTheDocument();
    expect(event).not.toHaveBeenCalled();
  });

  it("shows the clinical save confirmation summary without exposing the real NHC", async () => {
    renderComponent({ studyPatientCode: "" });

    await screen.findAllByText("Masa anexial #1");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByText("Confirmar guardado del cuestionario")).toBeInTheDocument();
    expect(screen.getByText("Revise los datos principales antes de guardar el cuestionario ecográfico.")).toBeInTheDocument();
    expect(screen.getByText("Contexto del estudio")).toBeInTheDocument();
    expect(screen.getByText("Datos de comprobación")).toBeInTheDocument();
    expect(screen.getByText("Cuestionario")).toBeInTheDocument();
    expect(screen.getAllByText("Pendiente").length).toBeGreaterThan(0);
    expect(screen.getAllByText("NHC informado").length).toBeGreaterThan(0);
    expect(screen.getAllByText("1 masa").length).toBeGreaterThan(0);
    expect(screen.queryByText("123456")).not.toBeInTheDocument();
    expect(screen.queryByText(/patientPseudonym/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/hash/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Guardar" }).length).toBeGreaterThan(0);
  });

  const setupPdfApi = () => {
    checkDuplicateCase.mockResolvedValue({ matches: [] });
    createCase.mockResolvedValue({ questionnaireResponseFhirId: "qr-1", evaluationId: 88 });
    ApiService.mockImplementation((token, method, endpoint) => {
      if (["/audit/register", "/fhir/Patient/check-or-create", "/fhir/Encounter", "/fhir/ImagingStudy"].includes(endpoint)) return Promise.resolve({ ok: true, status: 200 });
      if (["/fhir/Observation", "/fhir/RiskAssessment"].includes(endpoint)) return Promise.resolve(okResponse({ questionnaireResponseFhirId: "qr-1" }));
      return Promise.resolve(okResponse({}));
    });
  };

  const triggerPdf = async (event) => {
    await screen.findAllByText("Masa anexial #1");
    await userEvent.type(screen.getByRole("textbox"), "Conclusión clínica");
    await userEvent.click(screen.getByRole("button", { name: "Guardar e Imprimir" }));
    expect(await screen.findByText("Confirmar guardado del cuestionario")).toBeInTheDocument();
    const saveButtons = screen.getAllByRole("button", { name: "Guardar" });
    await userEvent.click(saveButtons[saveButtons.length - 1]);
    await waitFor(() => expect(event).toHaveBeenCalled());
  };

  it("generates a professional pdf with only the generating center logo and no visible NHC", async () => {
    setupPdfApi();
    const event = jest.fn();
    renderComponent({ event });

    await triggerPdf(event);

    expect(mockJsPDFCtor).toHaveBeenCalled();
    expect(mockPdfInstance.addImage).toHaveBeenCalledTimes(1);
    expect(mockPdfInstance.addImage).toHaveBeenCalledWith(LogoHRYC, "JPEG", 18, 18, 42, 12);
    expect(mockPdfInstance.addImage).not.toHaveBeenCalledWith(Logo12oct, expect.anything(), expect.anything(), expect.anything(), expect.anything(), expect.anything());

    const pdfText = mockPdfInstance.text.mock.calls.map((call) => String(call[0])).join(" ");
    expect(pdfText).toContain("Informe ecográfico de masa anexial");
    expect(pdfText).toContain("Hospital Universitario Ramón y Cajal");
    expect(pdfText).toContain("Servicio de Ginecología y Obstetricia");
    expect(pdfText).not.toContain("Rio Hortega");
    expect(pdfText).not.toContain("Río Hortega");
    expect(pdfText).not.toContain("123456");
    expect(pdfText).not.toContain("patientPseudonym");
    expect(pdfText).not.toContain("hash");
  });

  it("generates pdf with H12O identity when HOSPITAL_REF is H12O", async () => {
    setupPdfApi();
    const event = jest.fn();
    const responsesH12O = [{
      ...questionnaireResponse,
      item: questionnaireResponse.item.map((item) =>
        item.linkId === "HOSPITAL_REF"
          ? { ...item, answer: [{ valueString: "H12O" }] }
          : item
      ),
    }];
    renderComponent({ event, responses: responsesH12O });

    await triggerPdf(event);

    expect(mockPdfInstance.addImage).toHaveBeenCalledWith(Logo12oct, "JPEG", 18, 18, 42, 12);
    expect(mockPdfInstance.addImage).not.toHaveBeenCalledWith(LogoHRYC, expect.anything(), expect.anything(), expect.anything(), expect.anything(), expect.anything());

    const pdfText = mockPdfInstance.text.mock.calls.map((call) => String(call[0])).join(" ");
    expect(pdfText).toContain("Hospital Universitario 12 de Octubre");
    expect(pdfText).not.toContain("Rio Hortega");
    expect(pdfText).not.toContain("Río Hortega");
    expect(pdfText).not.toContain("123456");
    expect(pdfText).not.toContain("patientPseudonym");
    expect(pdfText).not.toContain("hash");
  });

  it("blocks save and generates no pdf when center is unrecognised", async () => {
    const event = jest.fn();
    const responsesUnknown = [{
      ...questionnaireResponse,
      item: questionnaireResponse.item.map((item) =>
        item.linkId === "HOSPITAL_REF"
          ? { ...item, answer: [{ valueString: "CENTRO_DESCONOCIDO" }] }
          : item
      ),
    }];
    renderComponent({ event, responses: responsesUnknown });

    await screen.findAllByText("Masa anexial #1");
    await userEvent.click(screen.getByRole("button", { name: "Guardar e Imprimir" }));

    expect(await screen.findByText("No se pudo identificar el centro participante.")).toBeInTheDocument();
    expect(screen.queryByText("Confirmar guardado del cuestionario")).not.toBeInTheDocument();
    expect(mockJsPDFCtor).not.toHaveBeenCalled();
    expect(event).not.toHaveBeenCalled();

    const uiText = document.body.textContent;
    expect(uiText).not.toContain("Rio Hortega");
    expect(uiText).not.toContain("Río Hortega");
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

    const createCaseCalls = createCase.mock.calls;
    expect(createCaseCalls).toHaveLength(2);
    expect(createCaseCalls[0][1].studyPatientCode).toBe("HURYC-0001");
    expect(createCaseCalls[0][1].careSettingCode).toBe("EMERGENCY");
    expect(createCaseCalls[0][1].careSettingDisplay).toBe("Urgencias");
    expect(createCaseCalls[1][1].studyPatientCode).toBe("HURYC-0002");
    expect(JSON.stringify(createCaseCalls[1][1].questionnaireResponse)).not.toContain("EMERGENCY");
    expect(JSON.stringify(createCaseCalls[1][1].questionnaireResponse)).not.toContain("HURYC-0002");
    expect(JSON.stringify(createCaseCalls[1][1].questionnaireResponse)).not.toContain("PAT_CODIGO");
    expect(JSON.stringify(createCaseCalls[1][1].questionnaireResponse)).not.toContain("PAT_NHC");
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

    const createCaseCalls = createCase.mock.calls;
    expect(createCaseCalls).toHaveLength(2);
    expect(createCaseCalls[1][1].studyPatientCode).toBeUndefined();
    expect(createCaseCalls[1][1].nhc).toBe("123456");
    expect(JSON.stringify(createCaseCalls[1][1].questionnaireResponse)).not.toContain("123456");
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

  it("includes studyPatientCode in secondary evaluation payload for site coordinators", async () => {
    setupDuplicateSecondaryApi({
      duplicateMatch: {
        caseId: 7,
        codeStatus: "PENDING_CODE",
        studyPatientCode: null,
        lateralityDisplay: "Derecho",
        anatomicalStructureDisplay: "Trompa",
      },
    });
    const event = jest.fn();
    renderComponent({ event });

    await submitInitialSave();

    expect(await screen.findByText("Se añadirá una evaluación secundaria al caso existente y se asignará el código de estudio indicado.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Añadir como nueva evaluación" }));

    await waitFor(() => expect(event).toHaveBeenCalled());

    expect(addSecondaryEvaluation).toHaveBeenCalledWith(
      "token",
      "7",
      expect.objectContaining({
        studyPatientCode: "HURYC-0001",
      })
    );
    expect(JSON.stringify(addSecondaryEvaluation.mock.calls[0][2].questionnaireResponse)).not.toContain("PAT_CODIGO");
  });

  it("shows the redesigned duplicate modal without exposing NHC or pseudonym fields", async () => {
    setupDuplicateSecondaryApi({
      duplicateMatch: {
        caseId: 7,
        caseDisplayId: "HURYC-C000028",
        codeStatus: "CODE_ASSIGNED",
        studyPatientCode: "SP-100",
        lateralityDisplay: "Derecho",
        anatomicalStructureDisplay: "Trompa",
        centerId: "HURYC",
        careSettingDisplay: "Urgencias",
        createdAt: "2026-06-04T10:00:00Z",
        patientPseudonym: "secret-pseudonym",
        hash: "secret-hash",
      },
    });
    renderComponent();

    await submitInitialSave();

    expect(await screen.findByText("Caso previo detectado")).toBeInTheDocument();
    expect(screen.getByText("Se ha encontrado un caso registrado con la misma paciente, lateralidad y estructura anatómica. Revise la información antes de continuar.")).toBeInTheDocument();
    expect(screen.getByText(/Esta comprobación utiliza el NHC de forma transitoria para detectar posibles duplicados\./)).toBeInTheDocument();
    expect(screen.getByText(/No se almacenará en los recursos FHIR generados\./)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Caso coincidente" })).toBeInTheDocument();
    expect(screen.getByText("HURYC-C000028")).toBeInTheDocument();
    expect(screen.getByText("Derecho · Trompa")).toBeInTheDocument();
    expect(screen.getByText(/4\/6\/2026|04\/06\/2026/)).toBeInTheDocument();
    expect(screen.getByText("HURYC · Urgencias")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Crear caso independiente" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Añadir como nueva evaluación" })).toBeInTheDocument();
    expect(screen.queryByText("123456")).not.toBeInTheDocument();
    expect(screen.queryByText("secret-pseudonym")).not.toBeInTheDocument();
    expect(screen.queryByText("secret-hash")).not.toBeInTheDocument();
  });

  it("does not include studyPatientCode in secondary evaluation payload for clinicians", async () => {
    setupDuplicateSecondaryApi({
      duplicateMatch: {
        caseId: 7,
        codeStatus: "PENDING_CODE",
        studyPatientCode: null,
        lateralityDisplay: "Derecho",
        anatomicalStructureDisplay: "Trompa",
      },
    });
    const event = jest.fn();
    renderComponent({ event, canUseStudyPatientCode: false });

    await submitInitialSave();
    expect(await screen.findByRole("button", { name: "Añadir como nueva evaluación" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Añadir como nueva evaluación" }));

    await waitFor(() => expect(event).toHaveBeenCalled());

    expect(addSecondaryEvaluation.mock.calls[0][2].studyPatientCode).toBeUndefined();
  });

  it("keeps the close controls working in the duplicate modal", async () => {
    setupDuplicateSecondaryApi({
      duplicateMatch: {
        caseId: 7,
        caseDisplayId: "HURYC-C000028",
        codeStatus: "PENDING_CODE",
        lateralityDisplay: "Derecho",
        anatomicalStructureDisplay: "Trompa",
      },
    });
    const event = jest.fn();
    renderComponent({ event });

    await submitInitialSave();

    await userEvent.click(await screen.findByRole("button", { name: "Cancelar" }));
    expect(screen.queryByText("Caso previo detectado")).not.toBeInTheDocument();

    await submitInitialSave();
    await userEvent.click(await screen.findByLabelText("Cerrar"));
    expect(screen.queryByText("Caso previo detectado")).not.toBeInTheDocument();
  });

  it("keeps the independent-case action working in the duplicate modal", async () => {
    setupDuplicateSecondaryApi({
      duplicateMatch: {
        caseId: 7,
        caseDisplayId: "HURYC-C000028",
        codeStatus: "PENDING_CODE",
        lateralityDisplay: "Derecho",
        anatomicalStructureDisplay: "Trompa",
      },
    });
    const event = jest.fn();
    renderComponent({ event });

    await submitInitialSave();
    await userEvent.click(await screen.findByRole("button", { name: "Crear caso independiente" }));

    await waitFor(() => expect(event).toHaveBeenCalled());

    const createCaseCalls = createCase.mock.calls;
    expect(createCaseCalls).toHaveLength(1);
  });

  it("shows when the selected duplicate case already has a study code", async () => {
    setupDuplicateSecondaryApi({
      duplicateMatch: {
        caseId: 7,
        codeStatus: "CODE_ASSIGNED",
        studyPatientCode: "SP-100",
        lateralityDisplay: "Derecho",
        anatomicalStructureDisplay: "Trompa",
      },
    });
    renderComponent();

    await submitInitialSave();

    expect(await screen.findByText("El caso seleccionado ya tiene código de estudio asignado: SP-100.")).toBeInTheDocument();
    const duplicateSection = screen.getByRole("heading", { name: "Caso coincidente" }).closest("section");
    expect(within(duplicateSection).getByText("Código SP-100")).toBeInTheDocument();
  });
});

describe("no-mass questionnaire (PAT_MA = No)", () => {
  const questionnaireResponseNoMass = {
    resourceType: "QuestionnaireResponse",
    status: "completed",
    item: [
      { linkId: "PAT_MA", answer: [{ valueCoding: { code: "no", display: "No" } }] },
      { linkId: "HOSPITAL_REF", answer: [{ valueString: "HURYC" }] },
      { linkId: "ECO_EXP_SIGLAS", answer: [{ valueString: "ABC" }] },
      { linkId: "PAT_NHC", answer: [{ valueString: "123456" }] },
      { linkId: "OD_M1", answer: [{ valueInteger: 3 }] },
      { linkId: "OD_M2", answer: [{ valueInteger: 4 }] },
      { linkId: "OD_FOL", answer: [{ valueInteger: 2 }] },
      { linkId: "OI_M1", answer: [{ valueInteger: 5 }] },
      { linkId: "OI_M2", answer: [{ valueInteger: 6 }] },
      { linkId: "OI_FOL", answer: [{ valueInteger: 4 }] },
    ],
  };

  const setupNoMassApi = () => {
    createCase.mockResolvedValue({ questionnaireResponseFhirId: "qr-no-mass-1", evaluationId: 88 });
    ApiService.mockImplementation((token, method, endpoint) => {
      if (["/audit/register", "/fhir/Patient/check-or-create", "/fhir/Encounter", "/fhir/ImagingStudy"].includes(endpoint)) return Promise.resolve({ ok: true, status: 200 });
      if (["/fhir/Observation", "/fhir/RiskAssessment"].includes(endpoint)) return Promise.resolve(okResponse({ questionnaireResponseFhirId: "qr-no-mass-1" }));
      return Promise.resolve(okResponse({}));
    });
  };

  beforeEach(() => {
    ApiService.mockReset();
    createCase.mockReset();
    addSecondaryEvaluation.mockReset();
    checkDuplicateCase.mockReset();
    upsertEcoScoreResult.mockReset();
    mockGenerateEncounter.mockClear();
    mockGenerateEncounter.mockReturnValue({ resourceType: "Encounter" });
    mockGenerateRiskAssessment.mockClear();
    mockGenerateRiskAssessment.mockReturnValue({ resourceType: "RiskAssessment" });
    upsertEcoScoreResult.mockResolvedValue({ id: 1 });
    Object.values(mockPdfInstance).forEach((v) => {
      if (typeof v === "function" && v.mockClear) v.mockClear();
    });
    mockPdfInstance.splitTextToSize.mockImplementation((t) => [t]);
  });

  it("renders the structured report section without Masa anexial label", async () => {
    renderComponent({ responses: [questionnaireResponseNoMass] });

    expect(await screen.findByText("Informe estructurado")).toBeInTheDocument();
    expect(screen.queryByText("Masa anexial #1")).not.toBeInTheDocument();
  });

  it("opens save confirmation without laterality or structure errors when PAT_MA is No", async () => {
    renderComponent({ responses: [questionnaireResponseNoMass] });

    await screen.findByText("Informe estructurado");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByText("Confirmar guardado del cuestionario")).toBeInTheDocument();
    expect(screen.queryByText(/lateralidad de la masa/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/estructura anatómica de la masa/i)).not.toBeInTheDocument();
    expect(screen.queryByText("123456")).not.toBeInTheDocument();
    expect(screen.queryByText(/patientPseudonym/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/hash/i)).not.toBeInTheDocument();
  });

  it("does not call checkDuplicateCase for a no-mass questionnaire", async () => {
    setupNoMassApi();
    const event = jest.fn();
    renderComponent({ responses: [questionnaireResponseNoMass], event });

    await screen.findByText("Informe estructurado");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await screen.findByText("Confirmar guardado del cuestionario");
    const saveButtons = screen.getAllByRole("button", { name: "Guardar" });
    await userEvent.click(saveButtons[saveButtons.length - 1]);

    await waitFor(() => expect(event).toHaveBeenCalled());

    expect(checkDuplicateCase).not.toHaveBeenCalled();
  });

  it("calls createCase and completes the save for a no-mass questionnaire", async () => {
    setupNoMassApi();
    const event = jest.fn();
    renderComponent({ responses: [questionnaireResponseNoMass], event });

    await screen.findByText("Informe estructurado");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await screen.findByText("Confirmar guardado del cuestionario");
    const saveButtons = screen.getAllByRole("button", { name: "Guardar" });
    await userEvent.click(saveButtons[saveButtons.length - 1]);

    await waitFor(() => expect(event).toHaveBeenCalled());

    const createCaseCalls = createCase.mock.calls;
    expect(createCaseCalls).toHaveLength(1);
  });

  it("does not show probability modal for a no-mass questionnaire", async () => {
    renderComponent({ responses: [questionnaireResponseNoMass] });

    await screen.findByText("Informe estructurado");
    await userEvent.click(screen.getByRole("button", { name: "Guardar e Imprimir" }));

    expect(screen.queryByText("Incluir probabilidad en el informe")).not.toBeInTheDocument();
    expect(await screen.findByText("Confirmar guardado del cuestionario")).toBeInTheDocument();
  });

  it("with PAT_MA Sí but missing laterality, still shows laterality error", async () => {
    const responseMissingLaterality = {
      ...questionnaireResponse,
      item: questionnaireResponse.item.filter((i) => i.linkId !== "MA_LADO" && i.linkId !== "MA_ESTRUCTURA"),
    };
    renderComponent({ responses: [responseMissingLaterality] });

    await screen.findByText("Informe estructurado");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByText(/No se pudo identificar la lateralidad de la masa/)).toBeInTheDocument();
  });
});

describe("probability inclusion modal content and behaviour", () => {
  const setupPdfFlowApi = () => {
    checkDuplicateCase.mockResolvedValue({ matches: [] });
    createCase.mockResolvedValue({ questionnaireResponseFhirId: "qr-1", evaluationId: 88 });
    ApiService.mockImplementation((token, method, endpoint) => {
      if (["/audit/register", "/fhir/Patient/check-or-create", "/fhir/Encounter", "/fhir/ImagingStudy"].includes(endpoint)) {
        return Promise.resolve({ ok: true, status: 200 });
      }
      if (["/fhir/Observation", "/fhir/RiskAssessment"].includes(endpoint)) {
        return Promise.resolve(okResponse({ questionnaireResponseFhirId: "qr-1" }));
      }
      return Promise.resolve(okResponse({}));
    });
  };

  const calculableEcoScoreItems = [
    { linkId: "MA_PROB", answer: [{ valueCoding: { display: "Sí" } }] },
    { linkId: "MA_Q_CONTORNO", answer: [{ valueCoding: { display: "Regular" } }] },
    { linkId: "MA_SA", answer: [{ valueCoding: { display: "No" } }] },
    { linkId: "MA_Q_AS", answer: [{ valueCoding: { display: "No" } }] },
    { linkId: "MA_PAPS", answer: [{ valueCoding: { display: "No" } }] },
  ];
  const responseWithScore = {
    ...questionnaireResponse,
    item: [
      ...questionnaireResponse.item,
      ...calculableEcoScoreItems,
    ],
  };
  const responseWithScoreAndProbabilityNo = {
    ...questionnaireResponse,
    item: [
      ...questionnaireResponse.item,
      ...calculableEcoScoreItems.map((item) =>
        item.linkId === "MA_PROB"
          ? { ...item, answer: [{ valueCoding: { display: "No" } }] }
          : item
      ),
    ],
  };

  beforeEach(() => {
    ApiService.mockReset();
    createCase.mockReset();
    addSecondaryEvaluation.mockReset();
    checkDuplicateCase.mockReset();
    recordStudyUsageEvent.mockReset();
    recordStudyUsageEvent.mockResolvedValue({ id: 1 });
    upsertEcoScoreResult.mockReset();
    mockGenerateEncounter.mockClear();
    mockGenerateRiskAssessment.mockClear();
    upsertEcoScoreResult.mockResolvedValue({ id: 1 });
    Object.values(mockPdfInstance).forEach((v) => {
      if (typeof v === "function" && v.mockClear) v.mockClear();
    });
    mockPdfInstance.splitTextToSize.mockImplementation((t) => [t]);
  });

  it("opens with updated title, description and informational text", async () => {
    renderComponent({ responses: [responseWithScore] });
    await screen.findAllByText("Masa anexial #1");
    await userEvent.click(screen.getByRole("button", { name: "Guardar e Imprimir" }));

    expect(await screen.findByText("Incluir probabilidad en el informe")).toBeInTheDocument();
    expect(screen.getByText("Seleccione si desea que la probabilidad de malignidad calculada se incluya en el informe PDF.")).toBeInTheDocument();
    expect(screen.getByText(/Esta decisión afecta únicamente a la versión del informe/)).toBeInTheDocument();
    expect(screen.queryByText("Confirmación")).not.toBeInTheDocument();
    expect(screen.queryByText(/Desea incluir/)).not.toBeInTheDocument();
  });

  it("shows No incluir and Incluir en informe labels instead of No and Sí", async () => {
    renderComponent({ responses: [responseWithScore] });
    await screen.findAllByText("Masa anexial #1");
    await userEvent.click(screen.getByRole("button", { name: "Guardar e Imprimir" }));

    expect(await screen.findByRole("button", { name: "No incluir" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Incluir en informe" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sí" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "No" })).not.toBeInTheDocument();
  });

  it("Incluir en informe closes the probability modal and opens save confirmation", async () => {
    renderComponent({ responses: [responseWithScore] });
    await screen.findAllByText("Masa anexial #1");
    await userEvent.click(screen.getByRole("button", { name: "Guardar e Imprimir" }));

    await userEvent.click(await screen.findByRole("button", { name: "Incluir en informe" }));

    expect(await screen.findByText("Confirmar guardado del cuestionario")).toBeInTheDocument();
    expect(screen.queryByText("Incluir probabilidad en el informe")).not.toBeInTheDocument();
  });

  it("No incluir closes the probability modal and opens save confirmation", async () => {
    renderComponent({ responses: [responseWithScore] });
    await screen.findAllByText("Masa anexial #1");
    await userEvent.click(screen.getByRole("button", { name: "Guardar e Imprimir" }));

    await userEvent.click(await screen.findByRole("button", { name: "No incluir" }));

    expect(await screen.findByText("Confirmar guardado del cuestionario")).toBeInTheDocument();
    expect(screen.queryByText("Incluir probabilidad en el informe")).not.toBeInTheDocument();
  });

  it("X button closes the probability modal without opening save confirmation", async () => {
    renderComponent({ responses: [responseWithScore] });
    await screen.findAllByText("Masa anexial #1");
    await userEvent.click(screen.getByRole("button", { name: "Guardar e Imprimir" }));

    await screen.findByText("Incluir probabilidad en el informe");
    await userEvent.click(screen.getByRole("button", { name: "Cerrar" }));

    await waitFor(() => {
      expect(screen.queryByText("Incluir probabilidad en el informe")).not.toBeInTheDocument();
    });
    expect(screen.queryByText("Confirmar guardado del cuestionario")).not.toBeInTheDocument();
  });

  it("shows the probability modal when ECO-SCORE is calculable even if MA_PROB is No", async () => {
    renderComponent({ responses: [responseWithScoreAndProbabilityNo] });
    await screen.findAllByText("Masa anexial #1");
    await userEvent.click(screen.getByRole("button", { name: "Guardar e Imprimir" }));

    expect(await screen.findByText("Incluir probabilidad en el informe")).toBeInTheDocument();
  });

  it("creates RiskAssessment when MA_PROB is No but ECO-SCORE is calculated", async () => {
    setupPdfFlowApi();
    const event = jest.fn();
    renderComponent({ event, responses: [responseWithScoreAndProbabilityNo] });

    await screen.findAllByText("Masa anexial #1");
    await userEvent.type(screen.getByRole("textbox"), "Conclusión clínica");
    await userEvent.click(screen.getByRole("button", { name: "Guardar e Imprimir" }));
    await userEvent.click(await screen.findByRole("button", { name: "No incluir" }));
    expect(await screen.findByText("Confirmar guardado del cuestionario")).toBeInTheDocument();

    const saveButtons = screen.getAllByRole("button", { name: "Guardar" });
    await userEvent.click(saveButtons[saveButtons.length - 1]);

    await waitFor(() => expect(event).toHaveBeenCalled());

    expect(mockGenerateRiskAssessment).toHaveBeenCalled();
    expect(ApiService.mock.calls.some((call) => call[2] === "/fhir/RiskAssessment")).toBe(true);
    expect(screen.queryByText("Incluir probabilidad en el informe")).not.toBeInTheDocument();
  });

  it("records saved and generated-report usage events with the same flowId and without sensitive payloads", async () => {
    setupPdfFlowApi();
    createCase.mockResolvedValue({
      caseId: 11,
      evaluationId: 88,
      encounterFhirId: "enc-usage-1",
      questionnaireResponseFhirId: 501,
      careSettingCode: "EMERGENCY",
    });

    const event = jest.fn();
    renderComponent({ event, responses: [responseWithScore], studyUsageFlowId: "flow-usage-1" });

    await screen.findAllByText("Masa anexial #1");
    await userEvent.type(screen.getByRole("textbox"), "Conclusión clínica");
    await userEvent.click(screen.getByRole("button", { name: "Guardar e Imprimir" }));
    await userEvent.click(await screen.findByRole("button", { name: "No incluir" }));

    const saveButtons = screen.getAllByRole("button", { name: "Guardar" });
    await userEvent.click(saveButtons[saveButtons.length - 1]);

    await waitFor(() => expect(event).toHaveBeenCalled());

    expect(recordStudyUsageEvent).toHaveBeenCalledTimes(2);
    const usagePayloads = recordStudyUsageEvent.mock.calls.map(([, payload]) => payload);

    expect(usagePayloads[0]).toMatchObject({
      eventType: "QUESTIONNAIRE_SAVED",
      flowId: "flow-usage-1",
      centerId: "HURYC",
      caseId: 11,
      evaluationId: 88,
      encounterId: "enc-usage-1",
      questionnaireResponseFhirId: 501,
      metadata: {
        source: "questionnaire_save_flow",
      },
    });
    expect(usagePayloads[1]).toMatchObject({
      eventType: "REPORT_GENERATED",
      flowId: "flow-usage-1",
      encounterId: "enc-usage-1",
      metadata: {
        reportSource: "questionnaire_save_flow",
        includesProbability: false,
      },
    });

    const serializedPayloads = JSON.stringify(usagePayloads);
    expect(serializedPayloads).not.toContain("123456");
    expect(serializedPayloads).not.toContain("patientPseudonym");
    expect(serializedPayloads).not.toContain("hash");
    expect(serializedPayloads).not.toContain("PAT_NHC");
    expect(serializedPayloads).not.toContain("\"item\"");
  });
});
