import Keycloak from 'keycloak-js';

if (process.env.NODE_ENV === "development") {
  console.log("[keycloak.js] config", {
    url: process.env.REACT_APP_KEYCLOAK_URL,
    realm: process.env.REACT_APP_KEYCLOAK_REALM,
    clientId: process.env.REACT_APP_KEYCLOAK_CLIENT_ID,
  });
}

const keycloak = new Keycloak({
  url: process.env.REACT_APP_KEYCLOAK_URL || 'https://emma.gbt.tfo.upm.es/auth',
  realm: process.env.REACT_APP_KEYCLOAK_REALM || 'TFT',
  clientId: process.env.REACT_APP_KEYCLOAK_CLIENT_ID || 'my-api-client',
});

export default keycloak;
