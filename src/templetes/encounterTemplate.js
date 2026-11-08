export const EncounterTemplate = {
    resourceType: "Encounter",
    status: "finished",
    class: {
        system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
        code: "AMB",
        display: "Ambulatory",
    },
    type: [
        {
            coding: [
                {
                    system: "http://snomed.info/sct",
                    code: "83607001",
                },
            ],
            text: "Examen ginecológico",
        },
    ],
    reasonCode: [
        {
            coding: [
                {
                    system: "http://snomed.info/sct",
                    code: "74601000119101",
                },
            ],
            text: "Examen ginecológico de rutina realizado",
        },
    ]
};
