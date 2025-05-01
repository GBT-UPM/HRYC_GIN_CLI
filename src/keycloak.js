import Keycloak from 'keycloak-js';

// Configura el Keycloak con las credenciales del realm y el cliente
const keycloak = new Keycloak({
  url: 'https://emma.gbt.tfo.upm.es/auth', // URL del servidor Keycloak
  realm: 'TFT',                  // Nombre del realm en Keycloak
  clientId: 'my-api-client',           // ID del cliente configurado en Keycloak
});

export default keycloak;