import { ObservationTemplate } from "../templetes/observationTemplate";

export const useObservationTemplate = () => {
  const generateObservation = (obsId,encId, patientId, imagingStudyId, observation) => {
    return {
      ...ObservationTemplate,
      id: obsId,
      subject: {
        reference: `Patient/${patientId}`,
        display: "",
      },
      encounter: {
        reference: `Encounter/${encId}`
      },

      basedOn: [
        {
          reference: `ImagingStudy/${imagingStudyId}`
        }
      ],
      valueString: observation
    };
  };

  return { generateObservation };
};
