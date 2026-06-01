import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PendingParticipantsScreen from "./PendingParticipantsScreen";
import {
  assignStudyPatientCode,
  getPendingStudyParticipants,
  STUDY_PARTICIPANT_ERROR_MESSAGES,
} from "../services/studyParticipantService";

let mockKeycloak;

jest.mock("@react-keycloak/web", () => ({
  useKeycloak: () => ({
    keycloak: mockKeycloak,
    initialized: true,
  }),
}));

jest.mock("../services/studyParticipantService", () => ({
  assignStudyPatientCode: jest.fn(),
  getPendingStudyParticipants: jest.fn(),
  STUDY_PARTICIPANT_ERROR_MESSAGES: {
    forbidden: "No tiene permisos para gestionar códigos en este centro.",
    conflict: "El código de estudio ya está asignado a otra participante del mismo centro.",
    unauthorized: "Sesión caducada. Vuelva a iniciar sesión.",
    assignGeneric: "No se pudo asignar el código de estudio.",
    fetchGeneric: "No se pudieron obtener las participantes pendientes.",
  },
}));

const buildKeycloak = (roles = ["ROLE_SITE_COORDINATOR"], allowedCenters = ["HURYC"]) => ({
  token: "token",
  tokenParsed: {
    realm_access: { roles },
    allowed_centers: allowedCenters,
  },
});

const pendingParticipants = [
  {
    studyParticipantId: 4,
    centerId: "HURYC",
    codeStatus: "PENDING_CODE",
    numberOfCases: 1,
    nhc: "123456",
    patientPseudonym: "secret-pseudonym",
    linkedCases: [
      {
        caseDisplayId: "HURYC-C000004",
        lateralityDisplay: "Derecho",
        anatomicalStructureDisplay: "Ovario",
        createdAt: "2026-05-29T10:00:00Z",
        numberOfEvaluations: 2,
      },
    ],
  },
];

describe("PendingParticipantsScreen", () => {
  beforeEach(() => {
    mockKeycloak = buildKeycloak();
    getPendingStudyParticipants.mockReset();
    assignStudyPatientCode.mockReset();
    getPendingStudyParticipants.mockResolvedValue({ items: pendingParticipants });
    assignStudyPatientCode.mockResolvedValue({ studyParticipantId: 4 });
  });

  it("renders participants returned inside items without sensitive identifiers", async () => {
    render(<PendingParticipantsScreen />);

    expect(await screen.findByText("HURYC-C000004")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("Derecho")).toBeInTheDocument();
    expect(screen.getByText("Ovario")).toBeInTheDocument();
    expect(screen.queryByText("123456")).not.toBeInTheDocument();
    expect(screen.queryByText("secret-pseudonym")).not.toBeInTheDocument();
    expect(screen.queryByText("PAT_CODIGO")).not.toBeInTheDocument();
    expect(screen.queryByText("PAT_NHC")).not.toBeInTheDocument();
    expect(screen.queryByText("PAT_NOMBRE")).not.toBeInTheDocument();
  });

  it("shows empty state when items is empty", async () => {
    getPendingStudyParticipants.mockResolvedValue({ items: [] });

    render(<PendingParticipantsScreen />);

    expect(await screen.findByText("No hay participantes pendientes.")).toBeInTheDocument();
  });

  it("fetches pending participants once on initial load for a single center", async () => {
    render(<PendingParticipantsScreen />);

    await screen.findByText("HURYC-C000004");

    expect(getPendingStudyParticipants).toHaveBeenCalledTimes(1);
    expect(getPendingStudyParticipants).toHaveBeenCalledWith("token", "HURYC");
  });

  it("shows a safe 403 message and clears NHC after assign error", async () => {
    assignStudyPatientCode.mockRejectedValue(new Error(STUDY_PARTICIPANT_ERROR_MESSAGES.forbidden));

    render(<PendingParticipantsScreen />);

    await screen.findByText("HURYC-C000004");
    await userEvent.click(screen.getByRole("button", { name: "Asignar código" }));
    const nhcInput = await screen.findByLabelText(/NHC/);
    await userEvent.type(nhcInput, "123456");
    await userEvent.type(await screen.findByLabelText(/Código de estudio/), "HURYC-0001");
    await userEvent.click(screen.getByRole("button", { name: "Asignar código" }));

    expect(
      await screen.findByText("No tiene permisos para gestionar códigos en este centro.")
    ).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText(/NHC/)).toHaveValue(""));
  });

  it("shows a safe 409 message", async () => {
    assignStudyPatientCode.mockRejectedValue(new Error(STUDY_PARTICIPANT_ERROR_MESSAGES.conflict));

    render(<PendingParticipantsScreen />);

    await screen.findByText("HURYC-C000004");
    await userEvent.click(screen.getByRole("button", { name: "Asignar código" }));
    await userEvent.type(await screen.findByLabelText(/NHC/), "123456");
    await userEvent.type(await screen.findByLabelText(/Código de estudio/), "HURYC-0001");
    await userEvent.click(screen.getByRole("button", { name: "Asignar código" }));

    expect(
      await screen.findByText("El código de estudio ya está asignado a otra participante del mismo centro.")
    ).toBeInTheDocument();
  });

  it("shows not authorized for users without site coordinator role", () => {
    mockKeycloak = buildKeycloak(["ROLE_CLINICIAN"], ["HURYC"]);

    render(<PendingParticipantsScreen />);

    expect(screen.getByText("No autorizado")).toBeInTheDocument();
    expect(getPendingStudyParticipants).not.toHaveBeenCalled();
  });
});
