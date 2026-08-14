#!/bin/sh
set -eu

PUBLIC_HOST="${PUBLIC_HOST:-localhost}"
INSTANT_PORT="${INSTANT_PORT:-8888}"
ADMIN_PORT="${ADMIN_PORT:-8787}"

export PUBLIC_HOST INSTANT_PORT ADMIN_PORT
export VITE_INSTANT_API_URI="http://${PUBLIC_HOST}:${INSTANT_PORT}"
export VITE_ADMIN_URL="http://${PUBLIC_HOST}:${ADMIN_PORT}"
export INSTANT_APP_ID="${INSTANT_APP_ID:-}"
export VITE_CLASS_PRESENCE_ENABLED="${CLASS_PRESENCE_ENABLED:-true}"
export VITE_SELF_HOSTED="${VITE_SELF_HOSTED:-true}"

APP_VERSION_VALUE="${APP_VERSION:-${VITE_APP_VERSION:-}}"
case "$APP_VERSION_VALUE" in
"" | "0.0.0" | "docker")
  export VITE_APP_VERSION=""
  ;;
*)
  export VITE_APP_VERSION="$APP_VERSION_VALUE"
  ;;
esac

envsubst '${INSTANT_APP_ID} ${VITE_INSTANT_API_URI} ${VITE_ADMIN_URL} ${VITE_CLASS_PRESENCE_ENABLED} ${VITE_SELF_HOSTED} ${VITE_APP_VERSION}' \
  < /self-host-env.template.js \
  > /usr/share/nginx/html/self-host-env.js

exec /docker-entrypoint.sh "$@"
