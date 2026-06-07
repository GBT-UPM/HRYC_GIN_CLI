import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import TopNavigation from "./TopNavigation";

const buildKeycloak = (roles) => ({
  tokenParsed: {
    realm_access: { roles },
  },
});

const renderNavigation = (roles) =>
  render(
    <MemoryRouter>
      <TopNavigation keycloak={buildKeycloak(roles)} />
    </MemoryRouter>
  );

describe("TopNavigation", () => {
  it("shows the core study navigation", () => {
    renderNavigation(["ROLE_CLINICIAN"]);

    expect(screen.getByText("Inicio")).toBeInTheDocument();
    expect(screen.getByText("Nuevo cuestionario")).toBeInTheDocument();
    expect(screen.getByText("Casos y evaluaciones")).toBeInTheDocument();
    expect(screen.getByText("Citas / encuentros")).toBeInTheDocument();
  });

  it("shows pending participants and exports for site coordinators", () => {
    renderNavigation(["ROLE_SITE_COORDINATOR"]);

    expect(screen.getByText("Pendientes")).toBeInTheDocument();
    expect(screen.getByText("Exportaciones")).toBeInTheDocument();
    expect(screen.getByText("Trazabilidad")).toBeInTheDocument();
  });

  it("shows exports but not pending participants for study coordinators", () => {
    renderNavigation(["ROLE_STUDY_COORDINATOR"]);

    expect(screen.getByText("Exportaciones")).toBeInTheDocument();
    expect(screen.getByText("Trazabilidad")).toBeInTheDocument();
    expect(screen.queryByText("Nuevo cuestionario")).not.toBeInTheDocument();
    expect(screen.queryByText("Pendientes")).not.toBeInTheDocument();
  });

  it("does not show questionnaire registration for admin-only users", () => {
    renderNavigation(["ROLE_ADMIN"]);

    expect(screen.queryByText("Nuevo cuestionario")).not.toBeInTheDocument();
    expect(screen.getByText("Casos y evaluaciones")).toBeInTheDocument();
  });

  it("shows questionnaire registration for mixed study coordinator and clinician users", () => {
    renderNavigation(["ROLE_STUDY_COORDINATOR", "ROLE_CLINICIAN"]);

    expect(screen.getByText("Nuevo cuestionario")).toBeInTheDocument();
  });
});
