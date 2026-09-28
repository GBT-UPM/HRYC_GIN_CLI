import { buildStudyAuditEndpoint, parseStudyAuditResourceFilter } from "./studyAuditService";

describe("studyAuditService", () => {
  it("builds a site coordinator endpoint with center, action and dates", () => {
    const endpoint = buildStudyAuditEndpoint({
      filters: {
        centerId: "",
        action: "UPDATE_CASE_STATUS",
        fromDate: "2026-06-01",
        toDate: "2026-06-30",
        resourceId: "HURYC-C000032",
      },
      allowedCenters: ["HURYC"],
      siteCoordinator: true,
      studyCoordinator: false,
      page: 0,
      limit: 25,
    });

    expect(endpoint).toBe(
      "/app/study-audit?centerId=HURYC&action=UPDATE_CASE_STATUS&fromDate=2026-06-01&toDate=2026-06-30&caseId=32&page=0&limit=25"
    );
  });

  it("builds a study coordinator endpoint without center when global view is selected", () => {
    const endpoint = buildStudyAuditEndpoint({
      filters: {
        centerId: "",
        action: "",
        fromDate: "",
        toDate: "",
        resourceId: "HURYC-C000032-E000105",
      },
      allowedCenters: ["HURYC"],
      siteCoordinator: false,
      studyCoordinator: true,
      page: 1,
      limit: 50,
    });

    expect(endpoint).toBe("/app/study-audit?evaluationId=105&page=1&limit=50");
    expect(endpoint).not.toContain("centerId=");
  });

  it("parses visible case and evaluation identifiers", () => {
    expect(parseStudyAuditResourceFilter("HURYC-C000032")).toEqual({
      caseId: "32",
      evaluationId: "",
    });
    expect(parseStudyAuditResourceFilter("HURYC-C000032-E000105")).toEqual({
      caseId: "",
      evaluationId: "105",
    });
    expect(parseStudyAuditResourceFilter("texto libre")).toEqual({
      caseId: "",
      evaluationId: "",
    });
  });
});
