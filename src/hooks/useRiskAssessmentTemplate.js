import { RiskAssessmentTemplate } from "../templetes/riskAssessmentTemplate";

const hasUsablePractitionerId = (practitionerId) => {
  const value = String(practitionerId || "").trim();
  return value !== "" && value !== "null" && value !== "undefined";
};

export const useRiskAssessmentTemplate = () => {
  const generateRiskAssessment = (riskId, encId, patientId, practitioner, prob, mitigation,quesRId) => {
    const riskAssessment = {
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

    if (hasUsablePractitionerId(practitioner)) {
      riskAssessment.performer = {
        reference: `Practitioner/${String(practitioner).trim()}`,
      };
    }

    return riskAssessment;
  };

  return { generateRiskAssessment };
};
