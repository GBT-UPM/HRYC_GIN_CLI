import { getLocationForCenter, getOrganizationForCenter, resolveCenterCode } from "./fhirOrganizations";

describe("FHIR organization helpers", () => {
  it("maps HURYC to its FHIR Organization", () => {
    expect(getOrganizationForCenter("HURyC")).toEqual({
      reference: "Organization/huryc",
      display: "Hospital Universitario Ramón y Cajal",
    });
    expect(resolveCenterCode("Hospital Universitario Ramón y Cajal")).toBe("HURYC");
  });

  it("maps H12O to its FHIR Organization", () => {
    expect(getOrganizationForCenter("Hospital Universitario 12 de Octubre")).toEqual({
      reference: "Organization/h12o",
      display: "Hospital Universitario 12 de Octubre",
    });
  });

  it("returns safe fallback organization for unknown centers", () => {
    expect(getOrganizationForCenter("")).toEqual({
      reference: "Organization/unknown",
      display: "Centro no especificado",
    });
  });

  it("maps known center locations and keeps a generic fallback", () => {
    expect(getLocationForCenter("HURYC").reference).toBe("Location/huryc-gyn-unit");
    expect(getLocationForCenter("unknown").reference).toBe("Location/gyn-unit");
  });

  it("maps care setting locations by center", () => {
    expect(getLocationForCenter("HURYC", "EMERGENCY")).toEqual({
      reference: "Location/huryc-emergency-department",
      display: "Urgencias",
    });
    expect(getLocationForCenter("H12O", "GYNE_ULTRASOUND")).toEqual({
      reference: "Location/h12o-gyne-ultrasound-unit",
      display: "Unidad de ecografía ginecológica",
    });
  });
});
