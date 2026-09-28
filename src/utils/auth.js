export const getUserRoles = (keycloak) => {
  const roles = keycloak?.tokenParsed?.realm_access?.roles;
  return Array.isArray(roles) ? roles : [];
};

export const getAllowedCenters = (keycloak) => {
  const centers = keycloak?.tokenParsed?.allowed_centers;

  if (Array.isArray(centers)) {
    return centers
      .map((center) => String(center).trim().toUpperCase())
      .filter(Boolean);
  }

  if (typeof centers === "string") {
    return centers
      .split(",")
      .map((center) => center.trim().toUpperCase())
      .filter(Boolean);
  }

  return [];
};

export const hasRole = (keycloak, role) => getUserRoles(keycloak).includes(role);

export const isClinician = (keycloak) => hasRole(keycloak, "ROLE_CLINICIAN");

export const isSiteCoordinator = (keycloak) => hasRole(keycloak, "ROLE_SITE_COORDINATOR");

export const isStudyCoordinator = (keycloak) => hasRole(keycloak, "ROLE_STUDY_COORDINATOR");

export const isAdmin = (keycloak) => hasRole(keycloak, "ROLE_ADMIN");

export const canRegisterQuestionnaire = (keycloak) =>
  isClinician(keycloak) || isSiteCoordinator(keycloak);

export const getPrimaryRoleLabel = (keycloak) => {
  if (isSiteCoordinator(keycloak)) {
    return "Coordinador de centro";
  }

  if (isStudyCoordinator(keycloak)) {
    return "Coordinador del estudio";
  }

  if (isClinician(keycloak)) {
    return "Clínico";
  }

  if (isAdmin(keycloak)) {
    return "Administrador técnico";
  }

  return "Sin rol asignado";
};

export const getCentersDisplayLabel = (keycloak) => {
  const allowedCenters = getAllowedCenters(keycloak);

  if (allowedCenters.length > 0) {
    return allowedCenters.join(", ");
  }

  if (isStudyCoordinator(keycloak)) {
    return "Global";
  }

  return "Sin centro asignado";
};

export const getPreferredUsername = (keycloak) =>
  keycloak?.tokenParsed?.preferred_username || "";

export const getDefaultCenter = (keycloak) => {
  const allowedCenters = getAllowedCenters(keycloak);
  return allowedCenters.length === 1 ? allowedCenters[0] : "";
};

export const canUseGlobalView = (keycloak) => isStudyCoordinator(keycloak);

export const requiresCenterScopedView = (keycloak) =>
  isClinician(keycloak) || isSiteCoordinator(keycloak);
