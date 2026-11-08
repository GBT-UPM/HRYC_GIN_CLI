import { RiskAssessmentTemplate } from "../templetes/riskAssessmentTemplate";

const hasUsablePractitionerId = (practitionerId) => {
  const value = String(practitionerId || "").trim();
  return value !== "" && value !== "null" && value !== "undefined";
};

const requireFhirLogicalId = (value, resourceType) => {
  const logicalId = String(value || "").trim();
  if (!/^[A-Za-z0-9\-.]{1,64}$/.test(logicalId)) {
    throw new Error(`${resourceType}.id lógico FHIR no válido.`);
  }
  return logicalId;
};

export const useRiskAssessmentTemplate = () => {
  const generateRiskAssessment = (riskId, encId, patientId, practitioner, prob, mitigation, questionnaireResponseId) => {
    const questionnaireResponseLogicalId = requireFhirLogicalId(
      questionnaireResponseId,
      "QuestionnaireResponse"
    );
    const riskAssessment = {
      ...RiskAssessmentTemplate,
      id: riskId,
      subject: {
        reference: `Patient/${patientId}`,
      },
      encounter: {
        reference: `Encounter/${encId}`
      },
      basis: [
        {
          reference: `QuestionnaireResponse/${questionnaireResponseLogicalId}`
        }
      ],
      occurrenceDateTime: new Date().toISOString(),
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
      ]
    };

    if (String(mitigation || "").trim()) {
      riskAssessment.mitigation = String(mitigation).trim();
    }

    if (hasUsablePractitionerId(practitioner)) {
      riskAssessment.performer = {
        reference: `Practitioner/${String(practitioner).trim()}`,
      };
    }

    return riskAssessment;
  };

  return { generateRiskAssessment };
};
