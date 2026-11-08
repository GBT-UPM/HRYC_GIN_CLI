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
          code: "19005-8"
        }
      ],
      text: "Conclusión ecográfica narrativa"
    }
  };
