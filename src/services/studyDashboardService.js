import ApiService from './ApiService';
import { canUseGlobalView, getDefaultCenter, requiresCenterScopedView } from '../utils/auth';

export const DASHBOARD_ERROR_MESSAGES = {
  forbidden:    'No tiene permisos para consultar datos de este centro.',
  unauthorized: 'Sesión caducada. Vuelva a iniciar sesión.',
  generic:      'No se pudieron cargar las estadísticas del panel.',
  missingCenter: 'Usuario sin centro asignado.',
};

export const buildDashboardStatsEndpoint = (keycloak, selectedCenter) => {
  if (canUseGlobalView(keycloak)) {
    return '/app/study-dashboard/stats';
  }
  if (requiresCenterScopedView(keycloak)) {
    const centerId = selectedCenter || getDefaultCenter(keycloak);
    if (!centerId) return '';
    return `/app/study-dashboard/stats?centerId=${encodeURIComponent(centerId)}`;
  }
  return '';
};

export const getStudyDashboardStats = async (token, keycloak, selectedCenter) => {
  const endpoint = buildDashboardStatsEndpoint(keycloak, selectedCenter);
  if (!endpoint) throw new Error(DASHBOARD_ERROR_MESSAGES.missingCenter);

  const response = await ApiService(token, 'GET', endpoint, {});

  if (response.status === 200) {
    return response.json();
  }
  if (response.status === 401) throw new Error(DASHBOARD_ERROR_MESSAGES.unauthorized);
  if (response.status === 403) throw new Error(DASHBOARD_ERROR_MESSAGES.forbidden);
  throw new Error(DASHBOARD_ERROR_MESSAGES.generic);
};
