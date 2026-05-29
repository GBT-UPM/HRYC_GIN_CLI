import Keycloak from 'keycloak-js';

const keycloak = new Keycloak({
  url: process.env.REACT_APP_KEYCLOAK_URL || 'https://emma.gbt.tfo.upm.es/auth',
  realm: process.env.REACT_APP_KEYCLOAK_REALM || 'TFT',
  clientId: process.env.REACT_APP_KEYCLOAK_CLIENT_ID || 'my-api-client',
});

export default keycloak;
