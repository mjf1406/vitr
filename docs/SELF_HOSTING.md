# Self-hosting (local Docker)

Run the app on your machine with **no Instant Cloud or Polar**. Auth is Instant magic codes (Google optional if you configure it on the self-host dashboard). Billing is disabled. Instant runs as Postgres + server + MinIO.

This stack is meant for **LAN / local** hosting (one machine or a few devices on your network). It is **not** intended for hosting in the cloud for several remote users — ports are exposed directly, with no reverse proxy or TLS terminator sitting in front of it.

Clone-and-run and Portainer both use the same root [`docker-compose.yml`](../docker-compose.yml). Images for `web` and `admin` are **built on the host**.

## Defaults

| Service           | URL                         |
| ----------------- | --------------------------- |
| App               | http://`<PUBLIC_HOST>`:8088 |
| Instant API       | http://`<PUBLIC_HOST>`:8888 |
| Instant dashboard | http://`<PUBLIC_HOST>`:3000 |
| Admin API         | http://`<PUBLIC_HOST>`:8787 |

Data persists in Docker volumes `backend-db`, `minio_data`, and `server_config`.

After first boot, open the Instant dashboard (`:3000`), create an app, then set `INSTANT_APP_ID` / `INSTANT_APP_ADMIN_TOKEN` and push schema/perms:

```bash
INSTANT_CLI_API_URI=http://localhost:8888 bunx instant-cli push schema
INSTANT_CLI_API_URI=http://localhost:8888 bunx instant-cli push perms
```

## `PUBLIC_HOST`

Hostname or LAN IP that **browsers** use to reach the server (not a Docker service name).

| Where you open the app    | `PUBLIC_HOST`       |
| ------------------------- | ------------------- |
| Same machine as Docker    | `localhost`         |
| Other devices on your LAN | e.g. `192.168.1.50` |

## `CLASS_PRESENCE_ENABLED`

Self-host shows **who is online in a class** (header chip and green dots on member avatars). Enabled by default on Docker self-host and Electron. Set `CLASS_PRESENCE_ENABLED=false` in `.env` / Portainer to disable presence. The web container injects `VITE_CLASS_PRESENCE_ENABLED` for the SPA at runtime.

## Option A — Clone and run

Requires Docker Compose v2 and enough RAM to build (see below).

```bash
git clone <your-fork-or-repo-url>
cd <repo>
cp example.env .env   # set PUBLIC_HOST if needed
docker compose up -d --build
```

```bash
docker compose logs -f admin
docker compose logs -f web
docker compose down             # stop (keeps volume)
docker compose down -v          # stop and wipe data
```

## Option B — Portainer

1. Stacks → **Add stack** → **Repository**
2. Repository URL: `https://github.com/mjf1406/vitr`
3. Repository Reference: `refs/heads/master`
4. Compose path: `docker-compose.yml`
5. Environment variables → **Load variables from .env file** → upload [`example.env`](../example.env) (edit `PUBLIC_HOST` first if needed)
6. Deploy and wait for the `web` **build** to finish
7. Open `http://<PUBLIC_HOST>:8088` and sign in with a magic code (the **first** account can be granted instance admin via the admin API)

Default app port is **8088** (8080 is often used by qBittorrent and similar). Override with `WEB_PORT` if needed.

### Clean rebuild after compose/Dockerfile changes

Portainer often reuses old layers/images. If a deploy fails or you pulled new git commits:

1. Remove the stack (keep the volume if you want data).
2. Optionally prune unused build cache/images on the host:

   ```bash
   docker builder prune -f
   docker image prune -f
   ```

3. Redeploy the stack so `web` / `admin` rebuild from the current Dockerfile.

## Uninstall / wipe data

Wiping removes all classroom data (users, classes, uploads). A later deploy starts a fresh empty instance. Stopping without `-v` (or without deleting the volume) keeps data.

### Clone and run

```bash
cd <repo>
docker compose down             # stop (keeps volume)
docker compose down -v          # stop and wipe Instant volumes
```

### Portainer

1. Remove the stack.
2. To wipe data, also delete the Docker volumes (typically `<stack-name>_backend-db`, `_minio_data`, `_server_config`). Removing the stack alone keeps the volumes.

## Upgrading

When a new GitHub Release is published, self-hosted instances show an in-app banner linking here if the running version is older than GitHub’s latest release tag.

The web image stamps its version at build time automatically — you do **not** need to set `APP_VERSION` in Portainer or Compose. Resolution order:

1. Explicit `APP_VERSION` / `VITE_APP_VERSION` (optional override)
2. Nearest git tag (`git describe`, after fetching tags — covers Portainer shallow clones)
3. Committed [`VERSION`](../VERSION) file (auto-updated by the Electron release workflow when you push a `v*` tag)

Data lives in the Instant volumes — keep those volumes when rebuilding.

Push schema/perms after backend entity changes:

```bash
INSTANT_CLI_API_URI=http://localhost:8888 bunx instant-cli push schema
INSTANT_CLI_API_URI=http://localhost:8888 bunx instant-cli push perms
```

### Docker Compose

```bash
cd <repo>
git fetch --tags
git checkout v0.1.0   # or: git pull on the branch you track
docker compose up -d --build
```

### Portainer

1. Stacks → your stack → **Editor** (or recreate from **Repository**).
2. Pull the latest compose from the repo, or set **Repository Reference** to the release tag (e.g. `refs/tags/v0.1.0`).
3. Leave `APP_VERSION` unset — the image resolves version from git tags or the committed `VERSION` file.
4. **Update the stack** so `web` / `admin` rebuild.

## What differs from cloud

|                   | Cloud                  | Self-host                            |
| ----------------- | ---------------------- | ------------------------------------ |
| Backend           | Instant Cloud          | Instant in Docker (Postgres + MinIO) |
| Auth              | Magic code + Google    | Magic code (Google optional)         |
| Billing           | Polar + trial          | Always entitled / Polar off          |
| SPA host          | e.g. Cloudflare Pages  | nginx in Compose                     |
| Privileged writes | Admin server (`:8787`) | Admin container                      |

## Instance admin

The first user can be granted app-admin via `POST /api/admin/grant` (see `server/routes/admin.ts`). That user sees **Admin** in the nav. Password resets are not available — auth is magic codes.
