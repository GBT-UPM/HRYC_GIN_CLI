import { getCareSettingLocationSuffix } from "./careSetting";

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

  return "";
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
        reference: "Organization/unknown",
        display: "Centro no especificado",
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
        reference: `Location/${suffix}`,
        display,
      };
  }
};
