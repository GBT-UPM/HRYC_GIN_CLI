describe('runtime configuration', () => {
  const originalConfig = window.__APP_CONFIG__;

  afterEach(() => {
    jest.resetModules();
    window.__APP_CONFIG__ = originalConfig;
  });

  test('uses same-origin deployment defaults', () => {
    delete window.__APP_CONFIG__;

    const globals = require('./utils/Globals');

    expect(globals.BASE_URL).toBe('/api');
  });

  test('uses values injected by the deployment', () => {
    window.__APP_CONFIG__ = { API_BASE_URL: '/hospital-api' };

    const globals = require('./utils/Globals');

    expect(globals.BASE_URL).toBe('/hospital-api');
  });
});

describe('OIDC configuration', () => {
  const originalConfig = window.__APP_CONFIG__;

  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    window.__APP_CONFIG__ = originalConfig;
  });

  test('passes the injected Keycloak settings to the client', () => {
    const Keycloak = jest.fn((configuration) => ({ configuration }));
    jest.doMock('keycloak-js', () => Keycloak);
    window.__APP_CONFIG__ = {
      OIDC_URL: '/auth-test',
      OIDC_REALM: 'HOSPITAL-TEST',
      OIDC_CLIENT_ID: 'hospital-web',
    };

    require('./keycloak').default;

    expect(Keycloak).toHaveBeenCalledWith({
      url: '/auth-test',
      realm: 'HOSPITAL-TEST',
      clientId: 'hospital-web',
    });
  });
});
