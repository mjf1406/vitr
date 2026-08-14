# syntax=docker/dockerfile:1

# --- Admin: Bun + Hono privileged API ---------------------------------
FROM oven/bun:1.3.14 AS admin

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --ignore-scripts

COPY instant.schema.ts instant.perms.ts ./
COPY shared ./shared
COPY server ./server

ENV ADMIN_PORT=8787
EXPOSE 8787
CMD ["bun", "server/index.ts"]

# --- Web: install + build in ONE full image (same glibc / native deps) -
FROM node:22-bookworm AS web-build

RUN npm install -g bun@1.3.14 \
  && apt-get update \
  && apt-get install -y --no-install-recommends git \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --ignore-scripts

COPY . .

ARG VITE_INSTANT_APP_ID=
ARG VITE_INSTANT_API_URI=http://localhost:8888
ARG VITE_ADMIN_URL=http://localhost:8787
ARG VITE_SELF_HOSTED=true
ARG VITE_APP_VERSION=0.0.0

ENV VITE_INSTANT_APP_ID=$VITE_INSTANT_APP_ID \
    VITE_INSTANT_API_URI=$VITE_INSTANT_API_URI \
    VITE_ADMIN_URL=$VITE_ADMIN_URL \
    VITE_SELF_HOSTED=$VITE_SELF_HOSTED \
    VITE_APP_VERSION=$VITE_APP_VERSION \
    NODE_ENV=production \
    DISABLE_REACT_COMPILER=true \
    NODE_OPTIONS=--max-old-space-size=8192 \
    UV_THREADPOOL_SIZE=2

RUN set -eux; \
  VER="${VITE_APP_VERSION:-}"; \
  if [ -z "$VER" ] || [ "$VER" = "0.0.0" ]; then \
    if [ -d .git ]; then \
      git fetch --tags --force 2>/dev/null || true; \
      TAG="$(git describe --tags --abbrev=0 2>/dev/null || true)"; \
      if [ -z "$TAG" ]; then \
        TAG="$(git tag -l 'v*.*.*' --sort=-v:refname | head -n1 || true)"; \
      fi; \
      if [ -n "$TAG" ]; then \
        VER="${TAG#v}"; \
      fi; \
    fi; \
  fi; \
  if [ -z "$VER" ] || [ "$VER" = "0.0.0" ]; then \
    if [ -f VERSION ]; then \
      VER="$(tr -d '[:space:]' < VERSION)"; \
    fi; \
  fi; \
  export VITE_APP_VERSION="${VER:-0.0.0}"; \
  echo "Building with VITE_APP_VERSION=${VITE_APP_VERSION}"; \
  if [ "$VITE_APP_VERSION" = "0.0.0" ]; then \
    echo "WARNING: Could not resolve app version (no git tags / VERSION file). Self-host update banner will stay off." >&2; \
  fi; \
  node node_modules/vite-plus/bin/vp build

FROM nginx:1.27-alpine AS web

ARG PUBLIC_HOST=localhost
ARG INSTANT_PORT=8888
ARG ADMIN_PORT=8787

COPY docker/nginx.conf /etc/nginx/templates/default.conf.template
COPY docker/self-host-env.template.js /self-host-env.template.js
COPY docker/web-entrypoint.sh /web-entrypoint.sh
COPY --from=web-build /app/dist /usr/share/nginx/html

RUN chmod +x /web-entrypoint.sh

ENV PUBLIC_HOST=$PUBLIC_HOST \
    INSTANT_PORT=$INSTANT_PORT \
    ADMIN_PORT=$ADMIN_PORT \
    VITE_SELF_HOSTED=true \
    NGINX_ENVSUBST_OUTPUT_DIR=/etc/nginx/conf.d \
    NGINX_ENVSUBST_FILTER=^(PUBLIC_HOST|INSTANT_PORT|ADMIN_PORT)$

EXPOSE 80
ENTRYPOINT ["/web-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
