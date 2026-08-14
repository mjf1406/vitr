import { Hono } from "hono";

import { isSelfHosted } from "../../shared/selfHosted.ts";
import { requireUser } from "../auth.ts";
import { adminDb } from "../db.ts";
import { AppError, jsonError } from "../errors.ts";

export const adminRoutes = new Hono();

async function requireAppAdmin(userId: string) {
  const data = await adminDb.query({
    profiles: { $: { where: { "$user.id": userId } } },
  });
  if (!data.profiles[0]?.isAppAdmin) {
    throw new AppError("FORBIDDEN", "Admin access required", 403);
  }
}

adminRoutes.get("/users", async (c) => {
  try {
    const user = await requireUser(c.req.raw);
    if (!isSelfHosted()) {
      throw new AppError("FORBIDDEN", "Admin users are only available when self-hosted", 403);
    }
    await requireAppAdmin(user.id);
    const data = await adminDb.query({
      profiles: { $user: {} },
    });
    return c.json({
      users: data.profiles.map((profile) => {
        const linked = Array.isArray(profile.$user) ? profile.$user[0] : profile.$user;
        return {
          _id: linked?.id ?? profile.id,
          email: linked?.email,
          name: profile.name,
          isAppAdmin: profile.isAppAdmin === true,
          createdAt: profile.createdAt,
        };
      }),
    });
  } catch (error) {
    return jsonError(error);
  }
});
