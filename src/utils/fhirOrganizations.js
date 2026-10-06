import { getCareSettingLocationSuffix } from "./careSetting";
import { mapCenterToCode } from "./caseMetadata";

const normalizeCenter = (centerId = "") =>
  String(centerId)
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export const resolveCenterCode = (centerId = "") => {
  const normalized = normalizeCenter(centerId);

  if (["huryc", "hur yc"].includes(normalized) || normalized.includes("ramon y cajal")) {
    return "HURYC";
  }

  if (
    ["h12o", "12o"].includes(normalized) ||
    normalized.includes("12 de octubre") ||
    normalized.includes("doce de octubre")
  ) {
    return "H12O";
  }

  return normalized === "unknown" ? "" : mapCenterToCode(centerId);
};

export const getOrganizationForCenter = (centerId = "") => {
  switch (resolveCenterCode(centerId)) {
    case "HURYC":
      return {
        reference: "Organization/huryc",
        display: "Hospital Universitario Ramón y Cajal",
      };
    case "H12O":
      return {
        reference: "Organization/h12o",
        display: "Hospital Universitario 12 de Octubre",
      };
    default:
      return {
        reference: resolveCenterCode(centerId) ? `Organization/${resolveCenterCode(centerId).toLowerCase()}` : "Organization/unknown",
        display: resolveCenterCode(centerId) ? `Centro ${resolveCenterCode(centerId)}` : "Centro no especificado",
      };
  }
};

export const getLocationForCenter = (centerId = "", careSettingCode = "UNKNOWN") => {
  const centerCode = resolveCenterCode(centerId);
  const { suffix, display } = getCareSettingLocationSuffix(careSettingCode);

  switch (centerCode) {
    case "HURYC":
      return {
        reference: `Location/huryc-${suffix}`,
        display,
      };
    case "H12O":
      return {
        reference: `Location/h12o-${suffix}`,
        display,
      };
    default:
      return {
        reference: centerCode ? `Location/${centerCode.toLowerCase()}-${suffix}` : `Location/${suffix}`,
        display,
      };
  }
};
