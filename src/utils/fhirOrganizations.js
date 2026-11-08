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

