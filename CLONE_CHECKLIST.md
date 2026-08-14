# Clone checklist

Follow this after cloning the template into a **new** git remote. Paths are relative to the repo root.

**Automated start:** run `bun run post-clone` to rewrite brand identity, write `.env.example`, optionally install deps, and check off the items it completed. Then finish the remaining boxes here.

Do **not** reuse the template’s Instant app or copy `.env` / `.env.local` secrets from another machine.

---

## 1. Identity

<!-- clone:identity-remote -->

- [ ] New git remote; do not copy secrets from another machine

<!-- clone:identity-license -->

- [ ] License reviewed (`LICENSE.md` is MIT — change only if you want a different license)

<!-- clone:identity-package -->

- [ ] `package.json` name / description / author / repository updated

<!-- clone:identity-app-config -->

- [ ] `shared/appConfig.ts` fields set for the new product (`name`, `slug`, URLs, …)

<!-- clone:identity-title -->

- [ ] `index.html` title updated

<!-- clone:identity-footer-tagline -->

- [ ] `common.footerTagline` updated in all locales under `src/i18n/resources/`

<!-- clone:identity-self-host-docs -->

- [ ] `docs/SELF_HOSTING.md` Portainer/repo examples retargeted (not `mjf1406/vitr` / `classclarus-*`)

<!-- clone:identity-compose -->

- [ ] `docker-compose.yml` / `example.env` instance names updated

<!-- clone:env-example -->

- [ ] `.env.example` present with Vite-side vars documented

`bun run post-clone` marks the identity items it edits. Product brand: `public/brand/` (sun sample assets — replaceable). Template favicon: `public/vctr/vctr-favicon.webp` (`index.html`) — replace file or update the `href` when rebranding.

<!-- clone:brand-assets -->

- [ ] Brand assets + favicon replaced (or intentionally kept)

Electron `productName` / `appId` / storage keys derive from `APP_CONFIG.name` / `slug` — no separate config files.

---

## 2. Install

```bash
vp install
# or: bun install
```

<!-- clone:install-deps -->

- [ ] `vp install` / `bun install` completed with no errors

---

## 3. InstantDB (new app)

This template already has `instant.schema.ts` and `instant.perms.ts`. You still need a **fresh** Instant app.

```bash
bunx instant-cli login
bunx instant-cli init-without-files --title <APP_NAME>
bunx instant-cli push schema
bunx instant-cli push perms
```

<!-- clone:instant-new-app -->

- [ ] Logged into Instant; created a **new** app (not the template’s)

<!-- clone:instant-env-local -->

- [ ] `.env.local` has `VITE_INSTANT_APP_ID`, `INSTANT_APP_ID`, `INSTANT_APP_ADMIN_TOKEN` (and `VITE_INSTANT_API_URI` / `INSTANT_API_URI` for self-host)

<!-- clone:instant-dev-running -->

- [ ] Left `vp run ds` running (web + admin API). Instant cloud or self-host must already be reachable.

Already wired: `instant.schema.ts`, `instant.perms.ts`, `instant.config.ts`, `src/main.tsx`, `server/`.

---

## 4. Auth (magic code + Google)

Auth is Instant magic codes plus optional Google OAuth. Email/password is not used.

<!-- clone:auth-magic-code -->

- [ ] Magic-code sign-in works against the new Instant app

---

## 5. Google OAuth

Configure a Google client in the Instant dashboard. The SPA uses `db.auth.createAuthorizationURL` with client name `VITE_INSTANT_GOOGLE_CLIENT_NAME` (default `google-web`).

1. Google Cloud Console → OAuth consent screen (match new brand).
2. Credentials → OAuth client ID (Web application).
3. Authorized JavaScript origins: `http://localhost:5173` and production SPA origin (`APP_CONFIG.appUrl`).
4. Authorized redirect URI: Instant’s callback for that client (from the Instant dashboard).

<!-- clone:google-credentials -->

- [ ] Google client registered in Instant; `VITE_INSTANT_GOOGLE_CLIENT_NAME` matches

<!-- clone:google-redirect -->

- [ ] Redirect URI matches Instant’s Google callback

---

## 6. Billing (Polar)

Subscriptions use `@polar-sh/sdk` on the Bun admin server. Trial length is app-managed via `APP_CONFIG.trial` (not a Polar-native trial). Empty Polar credentials throw — set sandbox env for local/dev.

**Create-only entitlement:** paid gate is for creating classes; membership and day-to-day class ops use Instant CEL + roles.

1. Create a [Polar](https://polar.sh) org (**sandbox** while developing).
2. Create two subscription products (example UI copy: **USD 3**/mo, **USD 30**/yr). If prices differ, update `billing.monthlyPrice` / `billing.yearlyPrice` in **every** locale under `src/i18n/resources/`.
3. Org access token with products/subscriptions/customers/checkouts/portal scopes.
4. Webhook at `{VITE_ADMIN_URL}/api/billing/webhook` for `product.created`, `product.updated`, `subscription.created`, `subscription.updated`.

Set on the **admin server** (`.env.local` / Docker `admin` service):

```text
POLAR_ACCESS_TOKEN
POLAR_WEBHOOK_SECRET
POLAR_ORGANIZATION_ID
POLAR_MONTHLY_PRODUCT_ID
POLAR_YEARLY_PRODUCT_ID
```

<!-- clone:polar-products -->

- [ ] Sandbox products + webhook created; i18n prices match if not $3/$30

<!-- clone:polar-env -->

- [ ] Admin-server Polar env vars set (token/secret, org id, both product IDs)

Checkout return URLs are built server-side from the SPA origin + `/billing`.

---

## 7. Theme (shadcn)

```bash
bunx --bun shadcn@latest preset resolve
bunx --bun shadcn@latest apply <preset-code> --only theme,font
```

<!-- clone:theme -->

- [ ] New theme/font applied (or confirmed keeping current tokens)

<!-- clone:theme-background -->

- [ ] `src/style.css` light/dark `--background` still matches `APP_CONFIG.themeColors` / `backgroundColors`

---

## 8. Reshape the example domain

Do this **after** auth + branding smoke-test. ClassClarus-style clones can keep most of this and only retarget brand/URLs/prices.

See `shared/roles.ts`, `instant.schema.ts`, `instant.perms.ts`, routes under `src/routes/_authenticated/_class/`, and feature folders under `src/components/classes|members|invitations`.

Class access is a role on `classMemberships`. There is no Permissions page or per-permission overrides. Privileged writes go through `server/`.

<!-- clone:domain-authz -->

- [ ] Redefined roles in `shared/roles.ts` and CEL in `instant.perms.ts` for the new domain (or kept ClassClarus)

<!-- clone:domain-surface -->

- [ ] Replaced or removed example entities/routes/components (if not keeping classroom)

<!-- clone:domain-i18n -->

- [ ] Trimmed or rewrote feature i18n keys in all locales + tests

---

## 9. Run and verify

Prefer verifying login/brand/theme on the example app **before** a large domain rewrite.

```bash
vp run ds
```

<!-- clone:verify-load -->

- [ ] App loads against the **new** `VITE_INSTANT_APP_ID`

<!-- clone:verify-auth -->

- [ ] Magic-code and/or Google sign-in completes (authenticated shell)

<!-- clone:verify-brand -->

- [ ] Brand name/logo/favicon/tagline look correct

<!-- clone:verify-theme -->

- [ ] Theme looks correct in light and dark

<!-- clone:verify-billing -->

- [ ] Billing page loads products from the admin server

<!-- clone:verify-check -->

- [ ] `vp check` and `vp test` pass after your edits

---

## 10. Production (when ready)

<!-- clone:prod-instant -->

- [ ] Instant prod app + `instant-cli push schema` / `push perms`

<!-- clone:prod-google -->

- [ ] Prod Google OAuth origins + Instant client + redirect URI

<!-- clone:prod-polar -->

- [ ] Prod Polar token/secret/product IDs + webhook to the admin server

<!-- clone:prod-urls -->

- [ ] `APP_CONFIG` production URLs set; SPA built with prod `VITE_INSTANT_*`

<!-- clone:prod-host -->

- [ ] Host serves `public/_headers` (CSP); build uses prod Instant Vite env

Build (Cloudflare Pages example): command `bun run build`, output `dist`, env `VITE_INSTANT_APP_ID` + `VITE_INSTANT_API_URI` + `VITE_ADMIN_URL` for the **prod** deployment.

---

## Env quick reference

Vite / `.env.local`: `VITE_INSTANT_APP_ID`, `VITE_INSTANT_API_URI`, `VITE_ADMIN_URL`, optional `VITE_INSTANT_GOOGLE_CLIENT_NAME`.

Admin server: `INSTANT_APP_ID`, `INSTANT_APP_ADMIN_TOKEN`, `INSTANT_API_URI`, Polar vars. See [`.env.example`](./.env.example).

Polar secrets belong on the **admin server**, not in Vite.
