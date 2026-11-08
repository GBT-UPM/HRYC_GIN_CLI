import { resolveCenterCode } from "./fhirOrganizations";

describe("FHIR center normalization", () => {
  it("normalizes known and future center codes without generating references", () => {
    expect(resolveCenterCode("Hospital Universitario Ramón y Cajal")).toBe("HURYC");
    expect(resolveCenterCode("Hospital Universitario 12 de Octubre")).toBe("H12O");
    expect(resolveCenterCode("MIA_DEV")).toBe("MIA_DEV");
    expect(resolveCenterCode("CENTRO_03")).toBe("CENTRO_03");
  });
});
