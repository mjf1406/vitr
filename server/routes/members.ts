import { Hono } from "hono";
import { id } from "@instantdb/admin";

import {
  MEMBER_LIST_AUTHZ_ROLES,
  MEMBER_LIST_READ_PERMISSION_BY_ROLE,
  REMOVE_PERMISSION_BY_ROLE,
  SUSPEND_PERMISSION_BY_ROLE,
  canChangeMemberRole,
  isJoinCodeRole,
  isStrictlyBelow,
  type ClassRole,
  type JoinCodeRole,
} from "../../shared/roles.ts";
import { requireUser } from "../auth.ts";
import { adminDb } from "../db.ts";
import { AppError, jsonError, readJson } from "../errors.ts";
import { listClassMemberships, requireMembership, requirePermission } from "../membership.ts";
import { consumeRateLimit } from "../rateLimit.ts";

export const membersRoutes = new Hono();

membersRoutes.post("/set-suspended", async (c) => {
  try {
    const user = await requireUser(c.req.raw);
    const body = await readJson<{ classId: string; userId: string; suspended: boolean }>(c.req.raw);
    consumeRateLimit("memberSuspend", user.id);
    if (body.userId === user.id) {
      throw new AppError("FORBIDDEN", "You cannot suspend yourself");
    }
    const target = await requireMembership(body.classId, body.userId);
    const permission = SUSPEND_PERMISSION_BY_ROLE[target.role];
    if (!permission) {
      throw new AppError("FORBIDDEN", "This person cannot be suspended");
    }
    await requirePermission(body.classId, user.id, permission);
    await adminDb.transact(
      adminDb.tx.classMemberships[target.id].update({ suspended: body.suspended }),
    );
    return c.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
});

membersRoutes.post("/remove", async (c) => {
  try {
    const user = await requireUser(c.req.raw);
    const body = await readJson<{ classId: string; userId: string }>(c.req.raw);
    consumeRateLimit("memberRemove", user.id);
    if (body.userId === user.id) {
      throw new AppError("FORBIDDEN", "You cannot remove yourself");
    }
    const target = await requireMembership(body.classId, body.userId);
    const permission = REMOVE_PERMISSION_BY_ROLE[target.role];
    if (!permission) {
      throw new AppError("FORBIDDEN", "This person cannot be removed");
    }
    await requirePermission(body.classId, user.id, permission);
    await adminDb.transact(adminDb.tx.classMemberships[target.id].delete());
    return c.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
});

membersRoutes.post("/set-role", async (c) => {
  try {
    const user = await requireUser(c.req.raw);
    const body = await readJson<{ classId: string; userId: string; role: JoinCodeRole }>(c.req.raw);
    consumeRateLimit("memberSetRole", user.id);
    if (!isJoinCodeRole(body.role)) {
      throw new AppError("INVALID_ROLE", "Invalid role");
    }
    const actor = await requireMembership(body.classId, user.id);
    const target = await requireMembership(body.classId, body.userId);
    if (
      !canChangeMemberRole(actor.role, target.role) ||
      !isStrictlyBelow(actor.role, body.role as ClassRole)
    ) {
      throw new AppError("FORBIDDEN", "You cannot change this person's role", 403);
    }
    await adminDb.transact(adminDb.tx.classMemberships[target.id].update({ role: body.role }));
    return c.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
});

membersRoutes.post("/set-guardian-links", async (c) => {
  try {
    const user = await requireUser(c.req.raw);
    const body = await readJson<{
      classId: string;
      guardianUserId: string;
      studentUserIds: Array<string>;
    }>(c.req.raw);
    consumeRateLimit("memberSetGuardianLinks", user.id);
    await requirePermission(body.classId, user.id, "guardians:invite");
    const existing = await adminDb.query({
      guardianStudentLinks: {
        $: { where: { "class.id": body.classId, "guardian.id": body.guardianUserId } },
      },
    });
    const txs = [
      ...existing.guardianStudentLinks.map((link) =>
        adminDb.tx.guardianStudentLinks[link.id].delete(),
      ),
      ...body.studentUserIds.map((studentUserId) =>
        adminDb.tx.guardianStudentLinks[id()].update({ createdAt: Date.now() }).link({
          class: body.classId,
          guardian: body.guardianUserId,
          student: studentUserId,
          createdBy: user.id,
        }),
      ),
    ];
    if (txs.length > 0) {
      await adminDb.transact(txs);
    }
    return c.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
});

void MEMBER_LIST_AUTHZ_ROLES;
void MEMBER_LIST_READ_PERMISSION_BY_ROLE;
void listClassMemberships;
