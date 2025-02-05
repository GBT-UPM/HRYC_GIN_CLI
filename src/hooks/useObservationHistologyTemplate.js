import { ObservationHistologyTemplate } from "../templetes/observationHistologyTemplate";

export const useObservationHistologyTemplate = () => {
  const generateObservation = (obsId, encId,quesRId, patientId, code, display, text, note) => {
    return {
      ...ObservationHistologyTemplate,
      id: obsId,
      subject: {
        reference: `Patient/${patientId}`,
        display: "",
      },
      encounter: {
        reference: `Encounter/${encId}`
      },

      derivedFrom: [
          {
            reference: `QuestionnaireResponse/${quesRId}`
          }
        ],
      effectiveDateTime:new Date().toISOString(),
      valueCodeableConcept: {
        coding: [
          {
            system: "http://snomed.info/sct",
            code: code,
            display: display
          }
        ],
        text: text
      },
      note: [
        {
          text: note
        }
      ]
    };
  };

  return { generateObservation };
};
