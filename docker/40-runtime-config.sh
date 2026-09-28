#!/bin/sh
set -eu

envsubst '${API_BASE_URL} ${OIDC_URL} ${OIDC_REALM} ${OIDC_CLIENT_ID}' \
  < /usr/share/nginx/html/config.template.js \
  > /usr/share/nginx/html/config.js
