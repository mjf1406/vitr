import { Hono } from "hono";
import { id } from "@instantdb/admin";

import {
  deleteClassConfirmationPhrase,
  normalizeClassDescription,
  normalizeClassIcon,
  normalizeClassName,
  normalizeClassYear,
} from "../../shared/classValidation.ts";
import { requireUser } from "../auth.ts";
import { adminDb, firstLinkedId } from "../db.ts";
import { AppError, jsonError, readJson } from "../errors.ts";
import { assertEntitled } from "../entitlement.ts";
import { listClassMemberships, requireMembership, requirePermission } from "../membership.ts";
import { consumeRateLimit } from "../rateLimit.ts";

export const classesRoutes = new Hono();

classesRoutes.post("/create", async (c) => {
  try {
    const user = await requireUser(c.req.raw);
    consumeRateLimit("classCreate", user.id);
    consumeRateLimit("classCreateGlobal", "global");
    await assertEntitled(user.id);
    const body = await readJson<{
      name: string;
      year: number;
      description?: string;
      icon?: string;
    }>(c.req.raw);
    const name = normalizeClassName(body.name);
    const year = normalizeClassYear(body.year);
    const description = normalizeClassDescription(body.description);
    const icon = normalizeClassIcon(body.icon);
    const classId = id();
    const membershipId = id();
    const now = Date.now();
    await adminDb.transact([
      adminDb.tx.classes[classId]
        .update({ name, year, description, icon, updatedAt: now })
        .link({ owner: user.id }),
      adminDb.tx.classMemberships[membershipId]
        .update({ role: "owner", suspended: false, createdAt: now })
        .link({ class: classId, user: user.id }),
    ]);
    return c.json({ id: classId });
  } catch (error) {
    return jsonError(error);
  }
});

classesRoutes.post("/update", async (c) => {
  try {
    const user = await requireUser(c.req.raw);
    const body = await readJson<{
      classId: string;
      name?: string;
      year?: number;
      description?: string;
      icon?: string;
    }>(c.req.raw);
    consumeRateLimit("classUpdate", user.id);
    await requirePermission(body.classId, user.id, "class:update");
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (body.name !== undefined) patch.name = normalizeClassName(body.name);
    if (body.year !== undefined) patch.year = normalizeClassYear(body.year);
    if (body.description !== undefined)
      patch.description = normalizeClassDescription(body.description);
    if (body.icon !== undefined) patch.icon = normalizeClassIcon(body.icon);
    await adminDb.transact(adminDb.tx.classes[body.classId].update(patch));
    return c.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
});

classesRoutes.post("/archive", async (c) => {
  try {
    const user = await requireUser(c.req.raw);
    const body = await readJson<{ classId: string; archived: boolean }>(c.req.raw);
    consumeRateLimit("classArchive", user.id);
    await requirePermission(body.classId, user.id, "class:archive");
    await adminDb.transact(
      adminDb.tx.classes[body.classId].update({
        archivedAt: body.archived ? Date.now() : null,
        updatedAt: Date.now(),
      }),
    );
    return c.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
});

classesRoutes.post("/delete", async (c) => {
  try {
    const user = await requireUser(c.req.raw);
    const body = await readJson<{ classId: string; confirmation: string }>(c.req.raw);
    consumeRateLimit("classDelete", user.id);
    await requirePermission(body.classId, user.id, "class:delete");
    const data = await adminDb.query({
      classes: { $: { where: { id: body.classId } } },
    });
    const cls = data.classes[0];
    if (!cls) {
      throw new AppError("NOT_FOUND", "Class not found", 404);
    }
    if (body.confirmation !== deleteClassConfirmationPhrase(cls.name)) {
      throw new AppError("INVALID_CONFIRMATION", "Confirmation phrase does not match");
    }
    const members = await listClassMemberships(body.classId);
    await adminDb.transact([
      ...members.map((member) => adminDb.tx.classMemberships[member.id].delete()),
      adminDb.tx.classes[body.classId].delete(),
    ]);
    return c.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
});

classesRoutes.post("/transfer", async (c) => {
  try {
    const user = await requireUser(c.req.raw);
    const body = await readJson<{ classId: string; newOwnerId: string }>(c.req.raw);
    consumeRateLimit("classTransferOwnership", user.id);
    const actor = await requirePermission(body.classId, user.id, "class:delete");
    if (actor.role !== "owner") {
      throw new AppError("FORBIDDEN", "Only the owner can transfer this class", 403);
    }
    const target = await requireMembership(body.classId, body.newOwnerId);
    if (target.role !== "teacher" && target.role !== "assistant_teacher") {
      throw new AppError("INVALID_TARGET", "New owner must be a teacher");
    }
    await adminDb.transact([
      adminDb.tx.classes[body.classId].link({ owner: body.newOwnerId }),
      adminDb.tx.classMemberships[target.id].update({ role: "owner" }),
      adminDb.tx.classMemberships[actor.id].update({ role: "teacher" }),
      adminDb.tx.classes[body.classId].update({ updatedAt: Date.now() }),
    ]);
    return c.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
});

classesRoutes.post("/set-banner", async (c) => {
  try {
    const user = await requireUser(c.req.raw);
    const body = await readJson<{ classId: string; fileId: string | null }>(c.req.raw);
    await requirePermission(body.classId, user.id, "class:update");
    if (body.fileId) {
      await adminDb.transact(adminDb.tx.classes[body.classId].link({ banner: body.fileId }));
    } else {
      const current = await adminDb.query({
        classes: { $: { where: { id: body.classId } }, banner: {} },
      });
      const bannerId = firstLinkedId(current.classes[0]?.banner);
      if (bannerId) {
        await adminDb.transact(adminDb.tx.classes[body.classId].unlink({ banner: bannerId }));
      }
    }
    return c.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
});
