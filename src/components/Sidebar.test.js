import { render, screen } from "@testing-library/react";
import Sidebar from "./Sidebar";

const buildKeycloak = (roles) => ({
  tokenParsed: {
    realm_access: { roles },
  },
});

describe("Sidebar", () => {
  it("does not show pending participants menu for clinicians", () => {
    render(
      <Sidebar
        sidebarOpen
        toggleSidebar={jest.fn()}
        download={jest.fn()}
        keycloak={buildKeycloak(["ROLE_CLINICIAN"])}
      />
    );

    expect(screen.queryByText("Participantes pendientes")).not.toBeInTheDocument();
  });

  it("shows pending participants menu for site coordinators", () => {
    render(
      <Sidebar
        sidebarOpen
        toggleSidebar={jest.fn()}
        download={jest.fn()}
        keycloak={buildKeycloak(["ROLE_SITE_COORDINATOR"])}
      />
    );

    expect(screen.getByText("Participantes pendientes")).toBeInTheDocument();
  });

  it("does not show pending participants menu for study coordinators", () => {
    render(
      <Sidebar
        sidebarOpen
        toggleSidebar={jest.fn()}
        download={jest.fn()}
        keycloak={buildKeycloak(["ROLE_STUDY_COORDINATOR"])}
      />
    );

    expect(screen.queryByText("Participantes pendientes")).not.toBeInTheDocument();
  });
});
