import { PatientTemplate } from "../templetes/patientTemplate";

export const usePatientTemplate = () => {
  const generatePatient = (patientId, nhc, family, given) => {
    return {
      ...PatientTemplate,
      id: patientId,
      identifier: [
        {
          system: "http://hospital-ramon-cajal.org/pacientes",
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
