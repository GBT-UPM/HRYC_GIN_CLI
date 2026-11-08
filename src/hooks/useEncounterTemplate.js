import { EncounterTemplate } from "../templetes/encounterTemplate";
import { getEncounterClassForCareSetting, getEncounterServiceType, normalizeCareSetting } from "../utils/careSetting";

const hasUsablePractitionerId = (practitionerId) => {
  const value = String(practitionerId || "").trim();
  return value !== "" && value !== "null" && value !== "undefined";
};

export const useEncounterTemplate = () => {
  const generateEncounter = ({
    encId,
    patientId,
    period,
    centerId,
    careSettingCode,
    practitionerId,
    practitionerDisplay,
  }) => {
    const careSetting = normalizeCareSetting(careSettingCode);
    const encounter = {
      ...EncounterTemplate,
      id: encId,
      class: getEncounterClassForCareSetting(careSetting.code),
      subject: {
        reference: `Patient/${patientId}`,
      },
      serviceType: getEncounterServiceType(careSetting.code),
      period,
    };

    if (hasUsablePractitionerId(practitionerId)) {
      encounter.participant = [
        {
          individual: {
            reference: `Practitioner/${String(practitionerId).trim()}`,
            ...(practitionerDisplay ? { display: practitionerDisplay } : {}),
          },
        },
      ];
    }

    return encounter;
  };

  return { generateEncounter };
};
