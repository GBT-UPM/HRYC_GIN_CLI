const runtimeConfig = window.__APP_CONFIG__ || {};

module.exports = {
  STORE_KEY: 'a56z0fzrNpl^2',
  BASE_URL: runtimeConfig.API_BASE_URL || process.env.REACT_APP_API_BASE_URL || '/api',
};
