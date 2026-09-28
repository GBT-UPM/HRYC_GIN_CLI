export const usePatientTemplate = () => {
  const generatePatient = (patientId) => {
    return {
      resourceType: "Patient",
      id: patientId,
      gender: "female",
    };
  };

  return { generatePatient };
};
