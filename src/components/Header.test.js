import { render, screen } from "@testing-library/react";
import Header from "./Header";

const buildKeycloak = () => ({
  token: "secret-access-token",
  refreshToken: "secret-refresh-token",
  tokenParsed: {
    preferred_username: "clinician_huryc",
    patientPseudonym: "secret-pseudonym",
    realm_access: {
      roles: ["ROLE_CLINICIAN"],
    },
    allowed_centers: ["HURYC"],
  },
});

describe("Header", () => {
  it("renders username, primary role and centers", () => {
    render(<Header keycloak={buildKeycloak()} closeSession={jest.fn()} />);

    expect(screen.getByText("clinician_huryc")).toBeInTheDocument();
    expect(screen.getByText("Clínico")).toBeInTheDocument();
    expect(screen.getByText("HURYC")).toBeInTheDocument();
  });

  it("does not render tokens or patient pseudonym", () => {
    render(<Header keycloak={buildKeycloak()} closeSession={jest.fn()} />);

    expect(screen.queryByText("secret-access-token")).not.toBeInTheDocument();
    expect(screen.queryByText("secret-refresh-token")).not.toBeInTheDocument();
    expect(screen.queryByText("secret-pseudonym")).not.toBeInTheDocument();
  });

  it("renders missing center clearly", () => {
    render(
      <Header
        closeSession={jest.fn()}
        keycloak={{
          tokenParsed: {
            preferred_username: "clinician_without_center",
            realm_access: { roles: ["ROLE_CLINICIAN"] },
          },
        }}
      />
    );

    expect(screen.getByText("Sin centro asignado")).toBeInTheDocument();
  });
});
