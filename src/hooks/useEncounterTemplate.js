import { EncounterTemplate } from "../templetes/encounterTemplate";

export const useEncounterTemplate = () => {
  const generateEncounter = (encId, patientId, practitioner, practitionerName, generatePeriod) => {
    return {
      ...EncounterTemplate,
      id: encId,
      subject: {
        reference: `Patient/${patientId}`,
        display: "",
      },
      participant: [
        {
          individual: {
            reference: `Practitioner/${practitioner}`,
            display: practitionerName,
          },
        },
      ],
      period: generatePeriod,
    };
  };

  return { generateEncounter };
};
