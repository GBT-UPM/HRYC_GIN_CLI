const runtimeConfig = window.__APP_CONFIG__ || {};

module.exports = {
  BASE_URL: runtimeConfig.API_BASE_URL || '/api',
};
