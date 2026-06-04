import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import QuestionnaireScreen from "./QuestionnaireScreen";
import ApiService from "../services/ApiService";

const mockNavigate = jest.fn();

jest.mock("../services/ApiService", () => jest.fn());

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

jest.mock("../components/QuestionnaireForm", () => () => <div>Formulario clínico renderizado</div>);
jest.mock("../components/ResponsesProbability", () => () => <div>Resumen de probabilidad</div>);

const buildKeycloak = (roles = ["ROLE_SITE_COORDINATOR"], allowedCenters = ["HURYC"]) => ({
  token: "token",
  authenticated: true,
  tokenParsed: {
    realm_access: { roles },
    allowed_centers: allowedCenters,
  },
});

describe("QuestionnaireScreen", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockKeycloak = buildKeycloak();
    ApiService.mockReset();
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

  it("shows the institutional questionnaire header and info button", async () => {
    render(<QuestionnaireScreen />);

    expect(await screen.findByText("Formulario clínico renderizado")).toBeInTheDocument();
    expect(screen.getByText("Nuevo cuestionario ecográfico")).toBeInTheDocument();
    expect(
      screen.getByText("Registro estructurado de hallazgos clínicos y ecográficos para el estudio MIA.")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Información del cuestionario" })).toBeInTheDocument();
    expect(screen.getByText("Datos pseudonimizados")).toBeInTheDocument();
    expect(screen.getByText("Coordinador de centro")).toBeInTheDocument();
  });

  it("opens and closes the questionnaire information modal", async () => {
    render(<QuestionnaireScreen />);

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
});
