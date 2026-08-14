/**
 * Migrations component runner — define batch migrations with `migrations.define`
 * and run via `bunx convex run migrations:run` (or the exported `run` from the dashboard).
 * No sample migrations ship with the template; add them here when schema needs backfills.
 */
import { Migrations } from "@convex-dev/migrations";
import { components } from "./_generated/api.js";
import { internalMutation } from "./_generated/server.js";

export const migrations = new Migrations(components.migrations, { internalMutation });
export const run = migrations.runner();
