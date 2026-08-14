import { Hono } from "hono";

import { isSelfHosted } from "../../shared/selfHosted.ts";
import { requireUser } from "../auth.ts";
import { adminDb } from "../db.ts";
import { AppError, jsonError, readJson } from "../errors.ts";

export const feedbackRoutes = new Hono();

async function requireFeedbackAdmin(userId: string) {
  if (isSelfHosted()) {
    throw new AppError("FORBIDDEN", "Feedback admin is cloud-only", 403);
  }
  const data = await adminDb.query({
    profiles: { $: { where: { "$user.id": userId } } },
  });
  if (!data.profiles[0]?.isAppAdmin) {
    throw new AppError("FORBIDDEN", "Admin access required", 403);
  }
}

feedbackRoutes.post("/set-archived", async (c) => {
  try {
    const user = await requireUser(c.req.raw);
    await requireFeedbackAdmin(user.id);
    const body = await readJson<{ feedbackId: string; archived: boolean }>(c.req.raw);
    await adminDb.transact(
      adminDb.tx.feedback[body.feedbackId].update({
        archivedAt: body.archived ? Date.now() : null,
      }),
    );
    return c.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
});
