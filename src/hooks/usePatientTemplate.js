import { PatientTemplate } from "../templetes/patientTemplate";

export const usePatientTemplate = () => {
  const generatePatient = (patientId, nhc, family, given, patientCode, hospitalName) => {
    return {
      ...PatientTemplate,
      id: patientId,
      identifier: [
  {
    system: "https://mia.upm.es/patients",
    value: patientCode,
    assigner: {
      display: hospitalName  // ej. "Hospital Universitario Ramón y Cajal"
    }
  },
  {
    system: "https://mia.upm.es/patients/nhc",
    value: nhc
  }
],
      name: [
        {
          family: family,
          given: [given]
        }
      ],
   
    };
  };

  return { generatePatient };
};
