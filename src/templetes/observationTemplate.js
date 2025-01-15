export const ObservationTemplate = {
    resourceType: "Observation",
    status: "final",
    category: [
      {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/observation-category",
            code: "imaging",
            display: "Imaging"
          }
        ]
      }
    ],
    code: {
      coding: [
        {
          system: "http://loinc.org",
          code: "45030-1",
          display: "Findings of Ultrasound study"
        }
      ],
      text: "Findings from transvaginal ultrasound"
    }
  };