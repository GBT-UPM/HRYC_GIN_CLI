import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import StudyAuditScreen from "./StudyAuditScreen";
import { getStudyAuditEvents } from "../services/studyAuditService";

let mockKeycloak;

jest.mock("@react-keycloak/web", () => ({
  useKeycloak: () => ({
    keycloak: mockKeycloak,
    initialized: true,
  }),
}));

jest.mock("../services/studyAuditService", () => ({
  getStudyAuditEvents: jest.fn(),
  STUDY_AUDIT_ERROR_MESSAGES: {
    forbidden: "No tiene permisos para consultar la trazabilidad del estudio.",
    unauthorized: "Sesión caducada. Vuelva a iniciar sesión.",
    invalidRequest: "Revise los filtros de trazabilidad e inténtelo de nuevo.",
    fetchGeneric: "No se pudo cargar la trazabilidad del estudio.",
  },
}));

const buildKeycloak = (roles = ["ROLE_SITE_COORDINATOR"], allowedCenters = ["HURYC"]) => ({
  token: "token",
  tokenParsed: {
    realm_access: { roles },
    allowed_centers: allowedCenters,
  },
});

const auditItems = [
  {
    id: 12,
    timestamp: "2026-06-06T10:30:00",
    action: "UPDATE_CASE_STATUS",
    actionDisplay: "Cambio de estado de caso",
    centerId: "HURYC",
    resourceType: "CASE",
    resourceDisplayId: "HURYC-C000032",
    details: "OPEN → EXCLUDED. Motivo: Exclusión validada.",
    performedBy: "usuario:site_***",
  },
];

describe("StudyAuditScreen", () => {
  beforeEach(() => {
    mockKeycloak = buildKeycloak();
    getStudyAuditEvents.mockReset();
    getStudyAuditEvents.mockResolvedValue({
      items: auditItems,
      total: 1,
      page: 0,
      limit: 25,
    });
  });

  it("shows the study audit screen for coordinators and loads relevant events", async () => {
    render(<StudyAuditScreen />);

    expect(screen.getByText("Trazabilidad del estudio")).toBeInTheDocument();
    expect(
      screen.getByText("Consulta de eventos relevantes del estudio: códigos, histopatología, estados, ECO-SCORE y exportaciones.")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Se muestran los eventos relevantes del estudio asociados explícitamente a los centros permitidos.")
    ).toBeInTheDocument();

    expect(await screen.findByText("Cambio de estado de caso")).toBeInTheDocument();
    expect(screen.getByText("HURYC-C000032")).toBeInTheDocument();
    expect(screen.getByText("usuario:site_***")).toBeInTheDocument();
    expect(getStudyAuditEvents).toHaveBeenCalledWith("token", expect.objectContaining({
      siteCoordinator: true,
      studyCoordinator: false,
      page: 0,
      limit: 25,
    }));
  });

  it("does not show the study audit content for clinicians", () => {
    mockKeycloak = buildKeycloak(["ROLE_CLINICIAN"], ["HURYC"]);

    render(<StudyAuditScreen />);

    expect(
      screen.getByText("Las vistas de trazabilidad del estudio están disponibles para coordinadores de centro y coordinadores del estudio.")
    ).toBeInTheDocument();
    expect(screen.queryByText("Cambio de estado de caso")).not.toBeInTheDocument();
  });

  it("does not render direct sensitive identifiers", async () => {
    getStudyAuditEvents.mockResolvedValue({
      items: [
        {
          ...auditItems[0],
          details: "Datos protegidos: [REDACTED], [REDACTED], [REDACTED]",
        },
      ],
      total: 1,
    });

    render(<StudyAuditScreen />);

    expect(await screen.findByText(/Datos protegidos/)).toBeInTheDocument();
    expect(screen.queryByText("123456")).not.toBeInTheDocument();
    expect(screen.queryByText("patientPseudonym")).not.toBeInTheDocument();
    expect(screen.queryByText("hash")).not.toBeInTheDocument();
  });

  it("applies the action filter", async () => {
    render(<StudyAuditScreen />);
    await screen.findByText("Cambio de estado de caso");

    fireEvent.mouseDown(screen.getByLabelText("Acción"));
    fireEvent.click(await screen.findByRole("option", { name: "UPDATE_CASE_STATUS" }));
    fireEvent.click(screen.getByRole("button", { name: "Aplicar filtros" }));

    await waitFor(() => {
      expect(getStudyAuditEvents).toHaveBeenLastCalledWith(
        "token",
        expect.objectContaining({
          filters: expect.objectContaining({ action: "UPDATE_CASE_STATUS" }),
        })
      );
    });
  });

  it("applies date filters", async () => {
    render(<StudyAuditScreen />);
    await screen.findByText("Cambio de estado de caso");

    fireEvent.change(screen.getByLabelText("Fecha desde"), { target: { value: "2026-06-01" } });
    fireEvent.change(screen.getByLabelText("Fecha hasta"), { target: { value: "2026-06-30" } });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar filtros" }));

    await waitFor(() => {
      expect(getStudyAuditEvents).toHaveBeenLastCalledWith(
        "token",
        expect.objectContaining({
          filters: expect.objectContaining({
            fromDate: "2026-06-01",
            toDate: "2026-06-30",
          }),
        })
      );
    });
  });

  it("shows a clear empty state", async () => {
    getStudyAuditEvents.mockResolvedValue({
      items: [],
      total: 0,
      page: 0,
      limit: 25,
    });

    render(<StudyAuditScreen />);

    expect(await screen.findByText("No hay eventos relevantes para los filtros seleccionados.")).toBeInTheDocument();
  });
});
