# vitr

[![AI Level 3](https://ai-level.dev/badge/standard/3.svg)](https://ai-level.dev/level-3)

Vite+ / React / InstantDB app **template**. Package manager is **bun** only.

**ClassClarus** (classroom CRUD, members, join codes, teacher/student roles) is a **worked example**, not the product. Keep the platform patterns; replace the nouns when cloning for another domain.

| Keep (platform)                                          | Example domain (replace)                                       |
| -------------------------------------------------------- | -------------------------------------------------------------- |
| Auth, theme, toasts, forms, empty/error/pending          | `classes`, members, join codes, class sidebar                  |
| i18n plumbing + `common` / `auth` namespaces             | Classroom copy (`footerTagline`, invite/member strings)        |
| Instant hooks, CEL perms, admin-server privileged writes | `shared/roles.ts` resources/roles                              |
| `shared/appConfig.ts` + `public/brand/`                  | Schema entities tied to classes; feature routes under `_class` |
| UI kit under `src/components/ui/` + `/ui` playground     | Role badges / people pages for classroom roles                 |

> **Convention for agents:** anything named `class` / classroom roles is sample product code. Keep the _patterns_ (scoped membership, Instant hooks, invite codes); replace the _nouns_.

**Fork intent:** a ClassClarus-style product can keep most of the classroom domain. Other products should smoke-test auth on the example UI first, then reshape or remove that domain — see [`CLONE_CHECKLIST.md`](./CLONE_CHECKLIST.md).

Toolchain notes also live in [`AGENTS.md`](./AGENTS.md) (`vp install`, `vp check`, `vp test`).

**Self-host (local Docker, no cloud):** [`docs/SELF_HOSTING.md`](./docs/SELF_HOSTING.md) — retargeted by `bun run post-clone`.

**Electron (downloadable classroom host):** [`docs/electron.md`](./docs/electron.md) — same self-host mode, embedded Instant, LAN join for students. Releases from tags `v*` via `.github/workflows/electron-release.yml`.

---

## Prerequisites

- [Bun](https://bun.sh) — this repo pins Bun via `package.json` → `devEngines.packageManager` (currently `1.3.14`; `onFail: "download"` will fetch a matching Bun when the engine check runs).
- [Vite+](https://viteplus.dev/guide/) CLI (`vp`) — install globally if `vp` is missing (`bun install -g vite-plus` or follow the Vite+ docs). `prepare` runs `vp config` after install.
- InstantDB app ([dashboard](https://instantdb.com/dash) or self-host dashboard)
- Google Cloud project (if keeping Google sign-in)
- Polar account ([polar.sh](https://polar.sh)) if keeping billing (sandbox for local/dev)

---

## Getting started

1. Clone or fork into a **new** git remote. Do **not** reuse the template’s Instant app or copy `.env` / `.env.local` secrets.
2. Run the identity wizard:

   ```bash
   bun run post-clone
   ```

   This rewrites brand fields (`shared/appConfig.ts`, package metadata, compose/self-host examples, footer tagline), writes [`.env.example`](./.env.example), optionally runs `vp install`, and checks off what it did in [`CLONE_CHECKLIST.md`](./CLONE_CHECKLIST.md).

3. Open [`CLONE_CHECKLIST.md`](./CLONE_CHECKLIST.md) and finish the remaining boxes (Instant, Auth, Google, Polar, brand assets, verify).

Dry run (no writes): `bun scripts/post-clone.mjs --dry-run`.

Non-interactive: `bun scripts/post-clone.mjs --name MyApp --slug my-app --github https://github.com/org/repo --no-install` (optional `--tagline`, `--yes`, `--keep-classroom`, `--dry-run`).

---

## Day-to-day commands

| Command                      | Purpose                                                                                       |
| ---------------------------- | --------------------------------------------------------------------------------------------- |
| `bun run post-clone`         | First-time identity setup after cloning                                                       |
| `vp install`                 | Install deps after pull                                                                       |
| `vp dev`                     | Vite+ web dev server                                                                          |
| `bun run dev:admin`          | Bun + Hono admin API (`server/`)                                                              |
| `vp run ds`                  | Web + admin API together ([`vite.config.ts`](./vite.config.ts))                               |
| `vp run push:schema`         | `instant-cli push schema`                                                                     |
| `vp run push:perms`          | `instant-cli push perms`                                                                      |
| `bun run tp`                 | Safe annotated release tag + push (clean tree; no `--force`)                                  |
| `vp check`                   | Format / Oxlint (this repo also runs ESLint via `bun run lint:fix` in `package.json` `check`) |
| `vp test`                    | Tests                                                                                         |
| `bun run typecheck`          | `tsc -b`                                                                                      |
| `bunx --bun shadcn@latest …` | Theme / UI components                                                                         |

---

## Platform notes

- **Billing:** entitlement is create-only — the admin server gates paying-to-create (e.g. class create); membership and day-to-day class ops are CEL + role based.
- **Roles:** class access is a role on `classMemberships` plus CEL in `instant.perms.ts`. There is no per-permission override page.
- **Presence:** class online presence (who is viewing a class) is on by default for Docker self-host and Electron; set `CLASS_PRESENCE_ENABLED=false` to disable.
- **Brand:** sun sample assets live under `public/brand/` — replace via `bun run post-clone` (and swap `public/vctr/vctr-favicon.webp` when rebranding).

---

## Env

Client vars: see [`.env.example`](./.env.example). Instant app id / admin token live in `.env.local`.

Google OAuth is configured in the Instant dashboard (client name `VITE_INSTANT_GOOGLE_CLIENT_NAME`). Polar secrets belong on the **admin server**, not in Vite. Full setup order lives in [`CLONE_CHECKLIST.md`](./CLONE_CHECKLIST.md).

---

## Stack pointers

- React 19 + Vite+ ([`vite.config.ts`](./vite.config.ts), React Compiler)
- TanStack Router / Form / Table
- InstantDB (`@instantdb/react` + `@instantdb/admin`) + Bun/Hono admin server
- Polar (`@polar-sh/sdk`) on the admin server
- shadcn (Base UI) + Tailwind v4
- i18n: `react-i18next` ([`src/i18n/`](./src/i18n/))

---

## License

This template is released under the [MIT License](./LICENSE.md). If you clone it and want a different license for your project, update [`LICENSE.md`](./LICENSE.md).
