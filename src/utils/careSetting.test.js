import {
  getEncounterClassForCareSetting,
  getCareSettingLocationSuffix,
  normalizeCareSetting,
} from "./careSetting";

describe("careSetting helpers", () => {
  it("normalizes known care setting values", () => {
    expect(normalizeCareSetting("Urgencias")).toEqual({ code: "EMERGENCY", display: "Urgencias" });
    expect(normalizeCareSetting("inpatient")).toEqual({ code: "INPATIENT", display: "Hospitalización" });
    expect(normalizeCareSetting("")).toEqual({ code: "UNKNOWN", display: "No especificado" });
  });

  it("maps care setting to Encounter class", () => {
    expect(getEncounterClassForCareSetting("EMERGENCY").code).toBe("EMER");
    expect(getEncounterClassForCareSetting("INPATIENT").code).toBe("IMP");
    expect(getEncounterClassForCareSetting("GYNE_ULTRASOUND").code).toBe("AMB");
  });

  it("maps care setting to location suffix", () => {
    expect(getCareSettingLocationSuffix("GYNE_ULTRASOUND")).toEqual({
      suffix: "gyne-ultrasound-unit",
      display: "Unidad de ecografía ginecológica",
    });
  });
});
