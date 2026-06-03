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
  });

  it("shows exports but not pending participants for study coordinators", () => {
    renderNavigation(["ROLE_STUDY_COORDINATOR"]);

    expect(screen.getByText("Exportaciones")).toBeInTheDocument();
    expect(screen.queryByText("Pendientes")).not.toBeInTheDocument();
  });
});
