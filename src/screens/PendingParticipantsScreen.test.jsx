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
    codeAlreadyAssigned: "El código de estudio ya está asignado a otra participante del mismo centro.",
    multipleCandidates:
      "Existen varios participantes pendientes compatibles. Revise los pendientes o contacte con coordinación del estudio.",
    notFound: "No se ha encontrado ningún participante pendiente para el NHC introducido en este centro.",
    participantNotPending: "El participante localizado ya no está pendiente de asignación.",
    invalidRequest: "Revise los datos introducidos e inténtelo de nuevo.",
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
        careSettingDisplay: "Consulta externa",
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

  it("shows the main assign action and uses detail per row", async () => {
    render(<PendingParticipantsScreen />);

    await screen.findByText("HURYC-C000004");

    expect(screen.getByRole("button", { name: "Asignar código por NHC" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ver detalle" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Asignar código$/ })).not.toBeInTheDocument();
  });

  it("shows a safe 403 message and clears NHC after assign error", async () => {
    assignStudyPatientCode.mockRejectedValue(new Error(STUDY_PARTICIPANT_ERROR_MESSAGES.forbidden));

    render(<PendingParticipantsScreen />);

    await screen.findByText("HURYC-C000004");
    await userEvent.click(screen.getByRole("button", { name: "Asignar código por NHC" }));
    const nhcInput = await screen.findByLabelText(/NHC/);
    await userEvent.type(nhcInput, "123456");
    await userEvent.type(await screen.findByLabelText(/Código de estudio/), "HURYC-0001");
    await userEvent.click(screen.getByRole("button", { name: /^Asignar código$/ }));

    expect(
      await screen.findByText("No tiene permisos para gestionar códigos en este centro.")
    ).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText(/NHC/)).toHaveValue(""));
  });

  it("shows a safe 409 code-used message", async () => {
    assignStudyPatientCode.mockRejectedValue(
      new Error(STUDY_PARTICIPANT_ERROR_MESSAGES.codeAlreadyAssigned)
    );

    render(<PendingParticipantsScreen />);

    await screen.findByText("HURYC-C000004");
    await userEvent.click(screen.getByRole("button", { name: "Asignar código por NHC" }));
    await userEvent.type(await screen.findByLabelText(/NHC/), "123456");
    await userEvent.type(await screen.findByLabelText(/Código de estudio/), "HURYC-0001");
    await userEvent.click(screen.getByRole("button", { name: /^Asignar código$/ }));

    expect(
      await screen.findByText("El código de estudio ya está asignado a otra participante del mismo centro.")
    ).toBeInTheDocument();
  });

  it("shows a safe 404 message", async () => {
    assignStudyPatientCode.mockRejectedValue(new Error(STUDY_PARTICIPANT_ERROR_MESSAGES.notFound));

    render(<PendingParticipantsScreen />);

    await screen.findByText("HURYC-C000004");
    await userEvent.click(screen.getByRole("button", { name: "Asignar código por NHC" }));
    await userEvent.type(await screen.findByLabelText(/NHC/), "123456");
    await userEvent.type(await screen.findByLabelText(/Código de estudio/), "HURYC-0001");
    await userEvent.click(screen.getByRole("button", { name: /^Asignar código$/ }));

    expect(
      await screen.findByText(
        "No se ha encontrado ningún participante pendiente para el NHC introducido en este centro."
      )
    ).toBeInTheDocument();
    expect(window.location.href).not.toContain("123456");
  });

  it("shows a safe multiple-candidates message", async () => {
    assignStudyPatientCode.mockRejectedValue(
      new Error(STUDY_PARTICIPANT_ERROR_MESSAGES.multipleCandidates)
    );

    render(<PendingParticipantsScreen />);

    await screen.findByText("HURYC-C000004");
    await userEvent.click(screen.getByRole("button", { name: "Asignar código por NHC" }));
    await userEvent.type(await screen.findByLabelText(/NHC/), "123456");
    await userEvent.type(await screen.findByLabelText(/Código de estudio/), "HURYC-0001");
    await userEvent.click(screen.getByRole("button", { name: /^Asignar código$/ }));

    expect(
      await screen.findByText(
        "Existen varios participantes pendientes compatibles. Revise los pendientes o contacte con coordinación del estudio."
      )
    ).toBeInTheDocument();
  });

  it("shows a safe participant-not-pending message without echoing the NHC", async () => {
    assignStudyPatientCode.mockRejectedValue(
      new Error(STUDY_PARTICIPANT_ERROR_MESSAGES.participantNotPending)
    );

    render(<PendingParticipantsScreen />);

    await screen.findByText("HURYC-C000004");
    await userEvent.click(screen.getByRole("button", { name: "Asignar código por NHC" }));
    await userEvent.type(await screen.findByLabelText(/NHC/), "123456");
    await userEvent.type(await screen.findByLabelText(/Código de estudio/), "HURYC-0001");
    await userEvent.click(screen.getByRole("button", { name: /^Asignar código$/ }));

    expect(
      await screen.findByText("El participante localizado ya no está pendiente de asignación.")
    ).toBeInTheDocument();
    expect(screen.queryByText("123456")).not.toBeInTheDocument();
  });

  it("opens detail dialog without exposing NHC or pseudonym", async () => {
    render(<PendingParticipantsScreen />);

    await screen.findByText("HURYC-C000004");
    await userEvent.click(screen.getByRole("button", { name: "Ver detalle" }));

    expect(await screen.findByText("Detalle del participante pendiente")).toBeInTheDocument();
    expect(
      screen.getByText("Información del caso pendiente de asignación de código de estudio.")
    ).toBeInTheDocument();
    expect(screen.getByText("Identificación del caso")).toBeInTheDocument();
    expect(screen.getByText("Información clínica")).toBeInTheDocument();
    expect(screen.getByText("Estado de asignación")).toBeInTheDocument();
    expect(screen.getByText("Ámbito asistencial")).toBeInTheDocument();
    expect(screen.getByText("Consulta externa")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.queryByText("123456")).not.toBeInTheDocument();
    expect(screen.queryByText("secret-pseudonym")).not.toBeInTheDocument();
  });

  it("shows care setting code when display text is not available", async () => {
    getPendingStudyParticipants.mockResolvedValue({
      items: [
        {
          ...pendingParticipants[0],
          linkedCases: [
            {
              ...pendingParticipants[0].linkedCases[0],
              careSettingDisplay: "",
              careSettingCode: "ER",
            },
          ],
        },
      ],
    });

    render(<PendingParticipantsScreen />);

    await screen.findByText("HURYC-C000004");
    await userEvent.click(screen.getByRole("button", { name: "Ver detalle" }));

    expect(await screen.findByText("Ámbito asistencial")).toBeInTheDocument();
    expect(screen.getByText("ER")).toBeInTheDocument();
  });

  it("cleans the NHC field when the modal closes", async () => {
    render(<PendingParticipantsScreen />);

    await screen.findByText("HURYC-C000004");
    await userEvent.click(screen.getByRole("button", { name: "Asignar código por NHC" }));
    await userEvent.type(await screen.findByLabelText(/NHC/), "123456");
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Asignar código de estudio" })).not.toBeInTheDocument()
    );
    await userEvent.click(screen.getByRole("button", { name: "Asignar código por NHC" }));

    expect(await screen.findByLabelText(/NHC/)).toHaveValue("");
  });

  it("cleans the NHC field after a successful assignment", async () => {
    render(<PendingParticipantsScreen />);

    await screen.findByText("HURYC-C000004");
    await userEvent.click(screen.getByRole("button", { name: "Asignar código por NHC" }));
    await userEvent.type(await screen.findByLabelText(/NHC/), "123456");
    await userEvent.type(await screen.findByLabelText(/Código de estudio/), "HURYC-0001");
    await userEvent.click(screen.getByRole("button", { name: /^Asignar código$/ }));

    expect(await screen.findByText("Código de estudio asignado correctamente.")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Asignar código de estudio" })).not.toBeInTheDocument()
    );
    await userEvent.click(screen.getByRole("button", { name: "Asignar código por NHC" }));
    expect(await screen.findByLabelText(/NHC/)).toHaveValue("");
    expect(window.location.href).not.toContain("123456");
  });

  it("shows not authorized for users without site coordinator role", () => {
    mockKeycloak = buildKeycloak(["ROLE_CLINICIAN"], ["HURYC"]);

    render(<PendingParticipantsScreen />);

    expect(screen.getByText("No autorizado")).toBeInTheDocument();
    expect(getPendingStudyParticipants).not.toHaveBeenCalled();
  });
});
