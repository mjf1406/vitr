import { Hono } from "hono";
import { id } from "@instantdb/admin";

import {
  JOIN_CODE_INVITE_PERMISSION_BY_ROLE,
  isJoinCodeRole,
  type JoinCodeRole,
} from "../../shared/roles.ts";
import {
  JOIN_CODE_LENGTH,
  normalizeJoinCode,
  normalizeMaxUses,
  normalizeTtlMs,
  randomJoinCode,
} from "../../shared/joinCodes.ts";
import { requireUser } from "../auth.ts";
import { adminDb } from "../db.ts";
import { AppError, jsonError, readJson } from "../errors.ts";
import { requireMembership, requirePermission } from "../membership.ts";
import { consumeRateLimit } from "../rateLimit.ts";
import { assertEntitled } from "../entitlement.ts";

export const joinCodesRoutes = new Hono();

async function generateUniqueCode(): Promise<string> {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const code = randomJoinCode();
    const existing = await adminDb.query({
      joinCodes: { $: { where: { code } } },
    });
    if (existing.joinCodes.length === 0) {
      return code;
    }
  }
  throw new AppError("CODE_GENERATION_FAILED", "Could not generate a unique invite code");
}

joinCodesRoutes.post("/create", async (c) => {
  try {
    const user = await requireUser(c.req.raw);
    const body = await readJson<{
      classId: string;
      role: JoinCodeRole;
      ttlMs: number;
      maxUses: number;
    }>(c.req.raw);
    consumeRateLimit("joinCodeCreate", user.id);
    if (!isJoinCodeRole(body.role)) {
      throw new AppError("INVALID_ROLE", "Invalid invite role");
    }
    await requirePermission(body.classId, user.id, JOIN_CODE_INVITE_PERMISSION_BY_ROLE[body.role]);
    const ttlMs = normalizeTtlMs(body.ttlMs);
    const maxUses = normalizeMaxUses(body.maxUses);
    const code = await generateUniqueCode();
    const joinCodeId = id();
    await adminDb.transact(
      adminDb.tx.joinCodes[joinCodeId]
        .update({
          code,
          role: body.role,
          expiresAt: Date.now() + ttlMs,
          maxUses,
          useCount: 0,
          createdAt: Date.now(),
        })
        .link({ class: body.classId, createdBy: user.id }),
    );
    return c.json({ id: joinCodeId, code });
  } catch (error) {
    return jsonError(error);
  }
});

joinCodesRoutes.post("/revoke", async (c) => {
  try {
    const user = await requireUser(c.req.raw);
    const body = await readJson<{ joinCodeId: string; classId: string }>(c.req.raw);
    consumeRateLimit("joinCodeRevoke", user.id);
    await requirePermission(body.classId, user.id, "invitations:revoke");
    await adminDb.transact(adminDb.tx.joinCodes[body.joinCodeId].delete());
    return c.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
});

joinCodesRoutes.post("/redeem", async (c) => {
  try {
    const user = await requireUser(c.req.raw);
    consumeRateLimit("joinCodeRedeemShort", user.id);
    consumeRateLimit("joinCodeRedeemHourly", user.id);
    consumeRateLimit("joinCodeRedeemGlobal", "global");
    await assertEntitled(user.id);
    const body = await readJson<{ code: string }>(c.req.raw);
    const code = normalizeJoinCode(body.code);
    const data = await adminDb.query({
      joinCodes: {
        $: { where: { code } },
        class: {},
      },
    });
    const joinCode = data.joinCodes[0];
    if (!joinCode) {
      consumeRateLimit("joinCodeRedeemFailure", user.id);
      throw new AppError("INVALID_CODE", "Invite code is invalid");
    }
    if (joinCode.expiresAt <= Date.now() || joinCode.useCount >= joinCode.maxUses) {
      consumeRateLimit("joinCodeRedeemFailure", user.id);
      throw new AppError("EXPIRED_CODE", "Invite code has expired");
    }
    const cls = Array.isArray(joinCode.class) ? joinCode.class[0] : joinCode.class;
    if (!cls) {
      throw new AppError("INVALID_CODE", "Invite code is invalid");
    }
    const existing = await adminDb.query({
      classMemberships: {
        $: { where: { "class.id": cls.id, "user.id": user.id } },
      },
    });
    if (existing.classMemberships[0]) {
      return c.json({ classId: cls.id, alreadyMember: true });
    }
    if (!isJoinCodeRole(joinCode.role)) {
      throw new AppError("INVALID_ROLE", "Invite code is invalid");
    }
    const membershipId = id();
    await adminDb.transact([
      adminDb.tx.classMemberships[membershipId]
        .update({ role: joinCode.role, suspended: false, createdAt: Date.now() })
        .link({ class: cls.id, user: user.id }),
      adminDb.tx.joinCodes[joinCode.id].update({ useCount: joinCode.useCount + 1 }),
    ]);
    return c.json({ classId: cls.id, alreadyMember: false });
  } catch (error) {
    return jsonError(error);
  }
});

void JOIN_CODE_LENGTH;
void requireMembership;
