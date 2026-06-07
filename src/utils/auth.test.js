import {
  getAllowedCenters,
  getCentersDisplayLabel,
  getDefaultCenter,
  getPrimaryRoleLabel,
  getUserRoles,
  canUseGlobalView,
  canRegisterQuestionnaire,
  isClinician,
  isSiteCoordinator,
  isStudyCoordinator,
  isAdmin,
  requiresCenterScopedView,
} from "./auth";

describe("auth helpers", () => {
  it("reads roles from realm_access.roles", () => {
    const keycloak = {
      tokenParsed: {
        realm_access: {
          roles: ["ROLE_CLINICIAN", "ROLE_SITE_COORDINATOR"],
        },
      },
    };

    expect(getUserRoles(keycloak)).toEqual(["ROLE_CLINICIAN", "ROLE_SITE_COORDINATOR"]);
  });

  it("returns an empty role list when realm roles are missing", () => {
    expect(getUserRoles({ tokenParsed: {} })).toEqual([]);
  });

  it("reads allowed_centers array", () => {
    const keycloak = { tokenParsed: { allowed_centers: [" huryc ", "H12O"] } };

    expect(getAllowedCenters(keycloak)).toEqual(["HURYC", "H12O"]);
  });

  it("reads allowed_centers simple string", () => {
    const keycloak = { tokenParsed: { allowed_centers: " huryc " } };

    expect(getAllowedCenters(keycloak)).toEqual(["HURYC"]);
  });

  it("reads allowed_centers CSV string", () => {
    const keycloak = { tokenParsed: { allowed_centers: " huryc, h12o ,, " } };

    expect(getAllowedCenters(keycloak)).toEqual(["HURYC", "H12O"]);
  });

  it("returns an empty center list when allowed_centers is missing", () => {
    expect(getAllowedCenters({ tokenParsed: {} })).toEqual([]);
    expect(getAllowedCenters()).toEqual([]);
  });

  it("detects application roles", () => {
    const keycloak = {
      tokenParsed: {
        realm_access: {
          roles: [
            "ROLE_CLINICIAN",
            "ROLE_SITE_COORDINATOR",
            "ROLE_STUDY_COORDINATOR",
            "ROLE_ADMIN",
          ],
        },
      },
    };

    expect(isClinician(keycloak)).toBe(true);
    expect(isSiteCoordinator(keycloak)).toBe(true);
    expect(isStudyCoordinator(keycloak)).toBe(true);
    expect(isAdmin(keycloak)).toBe(true);
  });

  it("allows questionnaire registration only for clinicians or site coordinators", () => {
    expect(
      canRegisterQuestionnaire({
        tokenParsed: { realm_access: { roles: ["ROLE_CLINICIAN"] } },
      })
    ).toBe(true);
    expect(
      canRegisterQuestionnaire({
        tokenParsed: { realm_access: { roles: ["ROLE_SITE_COORDINATOR"] } },
      })
    ).toBe(true);
    expect(
      canRegisterQuestionnaire({
        tokenParsed: { realm_access: { roles: ["ROLE_STUDY_COORDINATOR"] } },
      })
    ).toBe(false);
    expect(
      canRegisterQuestionnaire({
        tokenParsed: { realm_access: { roles: ["ROLE_ADMIN"] } },
      })
    ).toBe(false);
  });

  it("gets primary role label for clinicians", () => {
    const keycloak = { tokenParsed: { realm_access: { roles: ["ROLE_CLINICIAN"] } } };

    expect(getPrimaryRoleLabel(keycloak)).toBe("Clínico");
  });

  it("gets primary role label for site coordinators", () => {
    const keycloak = {
      tokenParsed: {
        realm_access: { roles: ["ROLE_CLINICIAN", "ROLE_SITE_COORDINATOR"] },
      },
    };

    expect(getPrimaryRoleLabel(keycloak)).toBe("Coordinador de centro");
  });

  it("gets primary role label for study coordinators", () => {
    const keycloak = {
      tokenParsed: {
        realm_access: { roles: ["ROLE_ADMIN", "ROLE_STUDY_COORDINATOR"] },
      },
    };

    expect(getPrimaryRoleLabel(keycloak)).toBe("Coordinador del estudio");
  });

  it("formats centers display label", () => {
    expect(getCentersDisplayLabel({ tokenParsed: { allowed_centers: ["HURYC", "H12O"] } })).toBe(
      "HURYC, H12O"
    );
  });

  it("formats global center label for study coordinator without centers", () => {
    const keycloak = {
      tokenParsed: {
        realm_access: { roles: ["ROLE_STUDY_COORDINATOR"] },
      },
    };

    expect(getCentersDisplayLabel(keycloak)).toBe("Global");
  });

  it("formats missing center label for non-global users", () => {
    const keycloak = {
      tokenParsed: {
        realm_access: { roles: ["ROLE_CLINICIAN"] },
      },
    };

    expect(getCentersDisplayLabel(keycloak)).toBe("Sin centro asignado");
  });

  it("gets default center with one allowed center", () => {
    const keycloak = { tokenParsed: { allowed_centers: ["HURYC"] } };

    expect(getDefaultCenter(keycloak)).toBe("HURYC");
  });

  it("returns empty default center without centers", () => {
    const keycloak = { tokenParsed: {} };

    expect(getDefaultCenter(keycloak)).toBe("");
  });

  it("allows global view for study coordinators", () => {
    const keycloak = {
      tokenParsed: {
        realm_access: { roles: ["ROLE_STUDY_COORDINATOR"] },
      },
    };

    expect(canUseGlobalView(keycloak)).toBe(true);
  });

  it("requires center scoped view for clinicians", () => {
    const keycloak = {
      tokenParsed: {
        realm_access: { roles: ["ROLE_CLINICIAN"] },
      },
    };

    expect(requiresCenterScopedView(keycloak)).toBe(true);
  });

  it("requires center scoped view for site coordinators", () => {
    const keycloak = {
      tokenParsed: {
        realm_access: { roles: ["ROLE_SITE_COORDINATOR"] },
      },
    };

    expect(requiresCenterScopedView(keycloak)).toBe(true);
  });
});
