import { Hono } from "hono";
import { id } from "@instantdb/admin";

import { accountDeleteConfirmationPhrase } from "../../shared/classValidation.ts";
import { isSelfHosted } from "../../shared/selfHosted.ts";
import { APP_CONFIG } from "../../shared/appConfig.ts";
import { MS_PER_DAY, normalizeEmail } from "../../shared/trial.ts";
import { requireUser } from "../auth.ts";
import { adminDb, adminTransact, firstLinkedId } from "../db.ts";
import { AppError, jsonError, readJson } from "../errors.ts";
import { consumeRateLimit } from "../rateLimit.ts";

export const accountRoutes = new Hono();

accountRoutes.get("/deletion-blockers", async (c) => {
  try {
    const user = await requireUser(c.req.raw);
    const data = await adminDb.query({
      classes: { $: { where: { "owner.id": user.id } } },
      subscriptions: { $: { where: { "user.id": user.id } } },
    });
    const blockers: Array<"owns_classes" | "active_subscription"> = [];
    if (data.classes.length > 0) {
      blockers.push("owns_classes");
    }
    if (
      !isSelfHosted() &&
      data.subscriptions.some((sub) => sub.status === "active" || sub.status === "trialing")
    ) {
      blockers.push("active_subscription");
    }
    return c.json({ blockers });
  } catch (error) {
    return jsonError(error);
  }
});

accountRoutes.post("/delete", async (c) => {
  try {
    const user = await requireUser(c.req.raw);
    consumeRateLimit("accountDelete", user.id);
    const body = await readJson<{ confirmation: string }>(c.req.raw);
    const expected = accountDeleteConfirmationPhrase(user.email);
    if (body.confirmation !== expected) {
      throw new AppError("INVALID_CONFIRMATION", "Confirmation phrase does not match");
    }
    const related = await adminDb.query({
      classes: { $: { where: { "owner.id": user.id } } },
      classMemberships: { $: { where: { "user.id": user.id } } },
      trialGrants: { $: { where: { "user.id": user.id } } },
      profiles: { $: { where: { "$user.id": user.id } } },
      fileRecords: { $: { where: { "owner.id": user.id } } },
      subscriptions: { $: { where: { "user.id": user.id } } },
      feedback: { $: { where: { "user.id": user.id } } },
    });
    if (related.classes.length > 0) {
      throw new AppError("OWNS_CLASSES", "Transfer or delete your classes first");
    }
    const txs = [
      ...related.classMemberships.map((row) => adminDb.tx.classMemberships[row.id].delete()),
      ...related.fileRecords.map((row) => adminDb.tx.fileRecords[row.id].delete()),
      ...related.subscriptions.map((row) => adminDb.tx.subscriptions[row.id].delete()),
      ...related.feedback.map((row) => adminDb.tx.feedback[row.id].delete()),
      ...related.profiles.map((row) => adminDb.tx.profiles[row.id].delete()),
      ...related.trialGrants.map((row) => adminDb.tx.trialGrants[row.id].delete()),
    ];
    if (txs.length > 0) {
      await adminTransact(txs);
    }
    await adminDb.auth.deleteUser({ id: user.id });
    return c.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
});

accountRoutes.post("/bootstrap", async (c) => {
  try {
    const user = await requireUser(c.req.raw);
    consumeRateLimit("ensureTrialGrant", user.id);
    const existing = await adminDb.query({
      profiles: { $: { where: { "$user.id": user.id } } },
    });
    const txs = [];
    if (!existing.profiles[0]) {
      const isFirstUser = await adminDb.query({ profiles: {} });
      txs.push(
        adminDb.tx.profiles[id()]
          .update({
            name: user.email?.split("@")[0],
            language: "en",
            isAppAdmin: isSelfHosted() && isFirstUser.profiles.length === 0,
            createdAt: Date.now(),
          })
          .link({ $user: user.id }),
      );
    }
    if (!isSelfHosted() && user.email) {
      const emailKey = normalizeEmail(user.email);
      if (emailKey) {
        const grants = await adminDb.query({
          trialGrants: { $: { where: { emailKey } }, user: {} },
        });
        const own = await adminDb.query({
          trialGrants: { $: { where: { "user.id": user.id } } },
        });
        if (!own.trialGrants[0]) {
          const existingGrant = grants.trialGrants[0];
          if (existingGrant && !firstLinkedId(existingGrant.user)) {
            txs.push(adminDb.tx.trialGrants[existingGrant.id].link({ user: user.id }));
          } else if (!existingGrant) {
            const now = Date.now();
            txs.push(
              adminDb.tx.trialGrants[id()]
                .update({
                  emailKey,
                  startedAt: now,
                  endsAt: now + APP_CONFIG.trial.days * MS_PER_DAY,
                })
                .link({ user: user.id }),
            );
          }
        }
      }
    }
    if (txs.length > 0) {
      await adminTransact(txs);
    }
    return c.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
});

accountRoutes.post("/update-profile", async (c) => {
  try {
    const user = await requireUser(c.req.raw);
    const body = await readJson<{ name?: string; language?: string; avatarFileId?: string | null }>(
      c.req.raw,
    );
    const data = await adminDb.query({
      profiles: { $: { where: { "$user.id": user.id } }, avatar: {} },
    });
    const profile = data.profiles[0];
    if (!profile) {
      throw new AppError("NOT_FOUND", "Profile not found", 404);
    }
    const patch: Record<string, unknown> = {};
    if (body.name !== undefined) patch.name = body.name.trim();
    if (body.language !== undefined) patch.language = body.language;
    const txs = [];
    if (Object.keys(patch).length > 0) {
      txs.push(adminDb.tx.profiles[profile.id].update(patch));
    }
    if (body.avatarFileId === null) {
      const avatarId = firstLinkedId(profile.avatar);
      if (avatarId) {
        txs.push(adminDb.tx.profiles[profile.id].unlink({ avatar: avatarId }));
      }
    } else if (body.avatarFileId) {
      txs.push(adminDb.tx.profiles[profile.id].link({ avatar: body.avatarFileId }));
    }
    if (txs.length > 0) {
      await adminTransact(txs);
    }
    return c.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
});
