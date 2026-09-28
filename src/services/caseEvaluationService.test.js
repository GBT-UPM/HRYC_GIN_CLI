import ApiService from "./ApiService";
import {
  buildCaseEvaluationsEndpoint,
  CASE_EVALUATION_ERROR_MESSAGES,
  getCaseEvaluations,
} from "./caseEvaluationService";

jest.mock("./ApiService");

const keycloakWithRoles = (roles, allowedCenters) => ({
  tokenParsed: {
    realm_access: { roles },
    allowed_centers: allowedCenters,
  },
});

describe("caseEvaluationService", () => {
  beforeEach(() => {
    ApiService.mockReset();
  });

  it("builds center scoped endpoint for clinicians", () => {
    const keycloak = keycloakWithRoles(["ROLE_CLINICIAN"], ["HURYC"]);

    expect(buildCaseEvaluationsEndpoint(keycloak)).toBe("/app/cases/evaluations?centerId=HURYC");
  });

  it("builds center scoped endpoint for site coordinators", () => {
    const keycloak = keycloakWithRoles(["ROLE_SITE_COORDINATOR"], ["HURYC"]);

    expect(buildCaseEvaluationsEndpoint(keycloak)).toBe("/app/cases/evaluations?centerId=HURYC");
  });

  it("builds global endpoint for study coordinators", () => {
    const keycloak = keycloakWithRoles(["ROLE_STUDY_COORDINATOR"], []);

    expect(buildCaseEvaluationsEndpoint(keycloak)).toBe("/app/cases/evaluations");
  });

  it("does not build global endpoint for center scoped user without center", () => {
    const keycloak = keycloakWithRoles(["ROLE_SITE_COORDINATOR"], []);

    expect(buildCaseEvaluationsEndpoint(keycloak)).toBe("");
  });

  it("calls scoped endpoint and returns evaluations", async () => {
    ApiService.mockResolvedValue({
      status: 200,
      json: jest.fn().mockResolvedValue([{ caseId: 1 }]),
    });

    const keycloak = keycloakWithRoles(["ROLE_SITE_COORDINATOR"], ["HURYC"]);
    const result = await getCaseEvaluations("token", keycloak);

    expect(ApiService).toHaveBeenCalledWith("token", "GET", "/app/cases/evaluations?centerId=HURYC", {});
    expect(result).toEqual([{ caseId: 1 }]);
  });

  it("maps 403 to a visible permissions message", async () => {
    ApiService.mockResolvedValue({ status: 403 });

    const keycloak = keycloakWithRoles(["ROLE_SITE_COORDINATOR"], ["HURYC"]);

    await expect(getCaseEvaluations("token", keycloak)).rejects.toThrow(
      CASE_EVALUATION_ERROR_MESSAGES.forbidden
    );
  });
});
