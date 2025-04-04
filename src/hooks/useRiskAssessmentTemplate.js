import { RiskAssessmentTemplate } from "../templetes/riskAssessmentTemplate";

export const useRiskAssessmentTemplate = () => {
  const generateRiskAssessment = (riskId, encId, patientId, practitioner, prob, mitigation,quesRId) => {
    return {
      ...RiskAssessmentTemplate,
      id: riskId,
      subject: {
        reference: `Patient/${patientId}`,
      },
      encounter: {
        reference: `Encounter/${encId}`
      },
      derivedFrom: [
        {
          reference: `QuestionnaireResponse/${quesRId}`
        }
      ],
      date: new Date().toISOString(),
      performer: {
        reference: `Practitioner/${practitioner}`,
      },
      prediction: [
        {
          outcome: {
            coding: [
              {
                system: "http://snomed.info/sct",
                code: "363346000",
                display: "Malignant neoplastic disease (disorder)"
              }
            ],
            text: "Riesgo de neoplasia maligna"
          },
          probabilityDecimal: prob,
          rationale: "Probabilidad calculada a partir de las respuestas del cuestionario."
        }
      ],
      mitigation: mitigation
    };
  };

  return { generateRiskAssessment };
};
