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
                    display: "Examen ginecológico (procedimiento) ",
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
                    display: "Examen ginecológico de rutina realizado",
                },
            ],
            text: "Examen ginecológico de rutina realizado",
        },
    ],
    location: [
        {
            location: {
                reference: "Location/gyn-unit"
            }
        }
    ]
};
