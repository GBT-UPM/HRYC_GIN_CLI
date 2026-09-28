import { renderHook } from "@testing-library/react";
import { usePatientTemplate } from "./usePatientTemplate";

describe("usePatientTemplate", () => {
  it("generates a minimal Patient without identifier or name", () => {
    const { result } = renderHook(() => usePatientTemplate());

    const patient = result.current.generatePatient("patient-id");

    expect(patient).toEqual({
      resourceType: "Patient",
      id: "patient-id",
      gender: "female",
    });
    expect(patient).not.toHaveProperty("identifier");
    expect(patient).not.toHaveProperty("name");
  });
});
