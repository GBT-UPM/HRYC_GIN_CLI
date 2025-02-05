export const ObservationHistologyTemplate = {
    resourceType: "Observation",
    status: "final",
    category: [
      {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/observation-category",
            code: "laboratory",
            display: "Laboratory"
          }
        ]
      }
    ],
    code: {
      coding: [
        {
          system: "http://snomed.info/sct",
          code: "252999005",
          display: "Histological examination following biopsy"
        }
      ],
      text: "Examen histopatológico"
    }
  };