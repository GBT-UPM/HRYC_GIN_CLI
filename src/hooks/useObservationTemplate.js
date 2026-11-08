import { ObservationTemplate } from "../templetes/observationTemplate";

const requireFhirLogicalId = (value, resourceType) => {
  const logicalId = String(value || "").trim();
  if (!/^[A-Za-z0-9\-.]{1,64}$/.test(logicalId)) {
    throw new Error(`${resourceType}.id lógico FHIR no válido.`);
  }
  return logicalId;
};

export const useObservationTemplate = () => {
  const generateObservation = (obsId, encId, patientId, observation, questionnaireResponseId) => {
    const questionnaireResponseLogicalId = requireFhirLogicalId(
      questionnaireResponseId,
      "QuestionnaireResponse"
    );
    const resource = {
      ...ObservationTemplate,
      id: obsId,
      subject: {
        reference: `Patient/${patientId}`,
      },
      encounter: {
        reference: `Encounter/${encId}`
      },
      valueString: observation
    };

    resource.derivedFrom = [{
      reference: `QuestionnaireResponse/${questionnaireResponseLogicalId}`,
    }];

    return resource;
  };

  return { generateObservation };
};
