import ApiService from "./ApiService";

export const MANAGED_USER_ROLES = [
  { value: "ROLE_CLINICIAN", label: "Clínico" },
  { value: "ROLE_SITE_COORDINATOR", label: "Coordinador de centro" },
];

export const MANAGED_USER_ERROR_MESSAGES = {
  fetch: "No se pudieron cargar los usuarios del centro.",
  save: "No se pudo guardar la cuenta.",
  forbidden: "No tiene permisos para gestionar usuarios de este centro.",
  unavailable: "La gestión de usuarios no está configurada. Consulte al administrador de Keycloak.",
  conflict: "Ya existe una cuenta con ese nombre o no se puede modificar esa cuenta.",
  invalid: "Revise los datos introducidos e inténtelo de nuevo.",
  unauthorized: "La sesión ha caducado. Vuelva a iniciar sesión.",
};

const parseErrorMessage = async (response, fallback) => {
  try {
    const payload = await response.json();
    return payload?.message || payload?.detail || fallback;
  } catch (error) {
    return fallback;
  }
};

const requireSuccess = async (response, fallback) => {
  if (response.ok) {
    if (response.status === 204) return null;
    return response.json().catch(() => null);
  }

  const fallbackByStatus = {
    400: MANAGED_USER_ERROR_MESSAGES.invalid,
    401: MANAGED_USER_ERROR_MESSAGES.unauthorized,
    403: MANAGED_USER_ERROR_MESSAGES.forbidden,
    409: MANAGED_USER_ERROR_MESSAGES.conflict,
    503: MANAGED_USER_ERROR_MESSAGES.unavailable,
  };
  throw new Error(await parseErrorMessage(response, fallbackByStatus[response.status] || fallback));
};

export const listManagedUsers = async (token, centerId) => {
  const query = new URLSearchParams({ centerId });
  return requireSuccess(
    await ApiService(token, "GET", `/app/admin/users?${query.toString()}`, {}),
    MANAGED_USER_ERROR_MESSAGES.fetch
  );
};

export const createManagedUser = async (token, user) =>
  requireSuccess(
    await ApiService(token, "POST", "/app/admin/users", user),
    MANAGED_USER_ERROR_MESSAGES.save
  );

export const updateManagedUserRole = async (token, userId, role) =>
  requireSuccess(
    await ApiService(token, "POST", `/app/admin/users/${encodeURIComponent(userId)}/role`, { role }),
    MANAGED_USER_ERROR_MESSAGES.save
  );

export const updateManagedUserStatus = async (token, userId, enabled) =>
  requireSuccess(
    await ApiService(token, "POST", `/app/admin/users/${encodeURIComponent(userId)}/status`, { enabled }),
    MANAGED_USER_ERROR_MESSAGES.save
  );

export const resetManagedUserPassword = async (token, userId, temporaryPassword) =>
  requireSuccess(
    await ApiService(token, "POST", `/app/admin/users/${encodeURIComponent(userId)}/password`, { temporaryPassword }),
    MANAGED_USER_ERROR_MESSAGES.save
  );
