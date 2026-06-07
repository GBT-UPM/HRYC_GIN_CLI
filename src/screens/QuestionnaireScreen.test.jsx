import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import QuestionnaireScreen from "./QuestionnaireScreen";
import ApiService from "../services/ApiService";
import { recordStudyUsageEvent } from "../services/studyUsageEventService";

const mockNavigate = jest.fn();

jest.mock("../services/ApiService", () => jest.fn());
jest.mock("../services/studyUsageEventService", () => ({
  recordStudyUsageEvent: jest.fn(),
  STUDY_USAGE_EVENT_TYPES: {
    questionnaireStarted: "QUESTIONNAIRE_STARTED",
  },
}));

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

let mockKeycloak;

jest.mock("@react-keycloak/web", () => ({
  useKeycloak: () => ({
    keycloak: mockKeycloak,
    initialized: true,
  }),
}));

jest.mock("../components/QuestionnaireForm", () => (props) => (
  <div>
    <div>Formulario clínico renderizado</div>
    <button type="button" onClick={() => props.onQuestionnaireInteraction?.([])}>
      Disparar inicio
    </button>
    <button type="button" onClick={() => props.onQuestionnaireInteraction?.([{ linkId: "PAT_MA", answer: [{ valueCoding: { display: "Sí" } }] }])}>
      Disparar cambio extra
    </button>
    <button type="button" onClick={() => props.event?.([{ linkId: "HOSPITAL_REF", answer: [{ valueString: "HURYC" }] }])}>
      Continuar al resumen
    </button>
  </div>
));
jest.mock("../components/ResponsesProbability", () => (props) => (
  <div>Resumen de probabilidad {props.studyUsageFlowId}</div>
));

const buildKeycloak = (roles = ["ROLE_SITE_COORDINATOR"], allowedCenters = ["HURYC"]) => ({
  token: "token",
  authenticated: true,
  tokenParsed: {
    realm_access: { roles },
    allowed_centers: allowedCenters,
  },
});

describe("QuestionnaireScreen", () => {
  const confirmStudyConsent = async (label = "Si, consentimiento confirmado") => {
    await userEvent.click(screen.getByRole("radio", { name: label }));
    await userEvent.click(screen.getByRole("button", { name: "Continuar" }));
    await waitFor(() => {
      expect(screen.queryByText("Confirmacion de participacion en el estudio")).not.toBeInTheDocument();
    });
  };

  beforeEach(() => {
    mockNavigate.mockReset();
    mockKeycloak = buildKeycloak();
    ApiService.mockReset();
    recordStudyUsageEvent.mockReset();
    recordStudyUsageEvent.mockResolvedValue({ id: 1 });
    ApiService.mockResolvedValue({
      status: 200,
      ok: true,
      json: jest.fn().mockResolvedValue([
        {
          resourceData: {
            title: "Registro ginecológico",
            item: [],
          },
        },
      ]),
    });
  });

  it("shows the mandatory participation confirmation modal before rendering the form", () => {
    render(<QuestionnaireScreen />);

    expect(screen.getByText("Confirmacion de participacion en el estudio")).toBeInTheDocument();
    expect(screen.queryByText("Formulario clínico renderizado")).not.toBeInTheDocument();
  });

  it("shows the institutional questionnaire header and info button", async () => {
    render(<QuestionnaireScreen />);

    await confirmStudyConsent();
    expect(await screen.findByText("Formulario clínico renderizado")).toBeInTheDocument();
    expect(screen.getByText("Nuevo cuestionario ecográfico")).toBeInTheDocument();
    expect(
      screen.getByText("Registro estructurado de hallazgos clínicos y ecográficos para el estudio MIA.")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Información del cuestionario" })).toBeInTheDocument();
    expect(screen.getByText("Datos pseudonimizados")).toBeInTheDocument();
    expect(screen.getByText("Coordinador de centro")).toBeInTheDocument();
  });

  it("does not render the questionnaire form for study coordinators without registration role", () => {
    mockKeycloak = buildKeycloak(["ROLE_STUDY_COORDINATOR"], ["HURYC"]);

    render(<QuestionnaireScreen />);

    expect(screen.getByText("No autorizado")).toBeInTheDocument();
    expect(
      screen.getByText("No tiene permisos para registrar nuevos cuestionarios o casos desde esta interfaz.")
    ).toBeInTheDocument();
    expect(screen.queryByText("Formulario clínico renderizado")).not.toBeInTheDocument();
    expect(ApiService).not.toHaveBeenCalled();
  });

  it("allows registration for mixed study coordinator and clinician users", async () => {
    mockKeycloak = buildKeycloak(["ROLE_STUDY_COORDINATOR", "ROLE_CLINICIAN"], ["HURYC"]);

    render(<QuestionnaireScreen />);

    await confirmStudyConsent();
    expect(await screen.findByText("Formulario clínico renderizado")).toBeInTheDocument();
  });

  it("does not render the questionnaire form for admin-only users", () => {
    mockKeycloak = buildKeycloak(["ROLE_ADMIN"], ["HURYC"]);

    render(<QuestionnaireScreen />);

    expect(screen.getByText("No autorizado")).toBeInTheDocument();
    expect(screen.queryByText("Formulario clínico renderizado")).not.toBeInTheDocument();
  });

  it("opens and closes the questionnaire information modal", async () => {
    render(<QuestionnaireScreen />);

    await confirmStudyConsent();
    expect(await screen.findByText("Formulario clínico renderizado")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Información del cuestionario" }));

    expect(
      await screen.findByText("Referencias de uso clínico y de privacidad para el registro ecográfico del estudio.")
    ).toBeInTheDocument();
    expect(
      screen.getByText("El cuestionario recoge información clínica y ecográfica estructurada para el estudio MIA.")
    ).toBeInTheDocument();

    const closeButtons = screen.getAllByRole("button", { name: "Cerrar" });
    await userEvent.click(closeButtons[closeButtons.length - 1]);

    await waitFor(() => {
      expect(
        screen.queryByText("Referencias de uso clínico y de privacidad para el registro ecográfico del estudio.")
      ).not.toBeInTheDocument();
    });
  });

  it("does not open the questionnaire when participation is not confirmed", async () => {
    render(<QuestionnaireScreen />);

    await userEvent.click(screen.getByLabelText("No confirmado / no incluir en el estudio"));
    expect(screen.getByRole("button", { name: "Volver al inicio" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Volver al inicio" }));

    expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
    expect(screen.queryByText("Formulario clínico renderizado")).not.toBeInTheDocument();
    expect(recordStudyUsageEvent).not.toHaveBeenCalled();
  });

  it("returns to start when cancelling the consent modal", async () => {
    render(<QuestionnaireScreen />);

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
    expect(screen.queryByText("Formulario clínico renderizado")).not.toBeInTheDocument();
  });

  it("records QUESTIONNAIRE_STARTED only once and reuses the same flowId in the save flow", async () => {
    render(<QuestionnaireScreen />);

    expect(recordStudyUsageEvent).not.toHaveBeenCalled();
    await confirmStudyConsent();
    expect(await screen.findByText("Formulario clínico renderizado")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Disparar inicio" }));
    await userEvent.click(screen.getByRole("button", { name: "Disparar cambio extra" }));

    expect(recordStudyUsageEvent).toHaveBeenCalledTimes(1);
    const [, usagePayload] = recordStudyUsageEvent.mock.calls[0];
    expect(usagePayload.eventType).toBe("QUESTIONNAIRE_STARTED");
    expect(usagePayload.flowId).toBeTruthy();
    expect(usagePayload.centerId).toBe("HURYC");
    expect(usagePayload.metadata).toEqual({ source: "questionnaire_form" });

    await userEvent.click(screen.getByRole("button", { name: "Continuar al resumen" }));

    expect(await screen.findByText(new RegExp(`Resumen de probabilidad ${usagePayload.flowId}`))).toBeInTheDocument();
  });
});
