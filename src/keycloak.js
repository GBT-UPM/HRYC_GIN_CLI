import Keycloak from 'keycloak-js';

const runtimeConfig = window.__APP_CONFIG__ || {};

const keycloak = new Keycloak({
  url: runtimeConfig.OIDC_URL || process.env.REACT_APP_KEYCLOAK_URL || `${window.location.origin}/auth`,
  realm: runtimeConfig.OIDC_REALM || process.env.REACT_APP_KEYCLOAK_REALM || 'TFT',
  clientId: runtimeConfig.OIDC_CLIENT_ID || process.env.REACT_APP_KEYCLOAK_CLIENT_ID || 'my-api-client',
});

export default keycloak;
