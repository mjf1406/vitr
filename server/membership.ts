import {
  isClassRole,
  pickHighestClassRole,
  roleHasPermission,
  type ClassPermission,
  type ClassRole,
} from "../shared/roles.ts";
import { AppError } from "./errors.ts";
import { adminDb } from "./db.ts";

export type MembershipRow = {
  id: string;
  role: ClassRole;
  suspended: boolean;
  userId: string;
  classId: string;
};

export async function getMembership(
  classId: string,
  userId: string,
): Promise<MembershipRow | null> {
  const data = await adminDb.query({
    classMemberships: {
      $: { where: { "class.id": classId, "user.id": userId } },
      class: {},
      user: {},
    },
  });
  const row = data.classMemberships[0];
  if (!row || !isClassRole(row.role)) {
    return null;
  }
  const classLink = Array.isArray(row.class) ? row.class[0] : row.class;
  const userLink = Array.isArray(row.user) ? row.user[0] : row.user;
  if (!classLink || !userLink) {
    return null;
  }
  return {
    id: row.id,
    role: row.role,
    suspended: row.suspended,
    userId: userLink.id,
    classId: classLink.id,
  };
}

export async function requireMembership(classId: string, userId: string): Promise<MembershipRow> {
  const membership = await getMembership(classId, userId);
  if (!membership || membership.suspended) {
    throw new AppError("CLASS_UNAVAILABLE", "Class not found", 404);
  }
  return membership;
}

export async function requirePermission(
  classId: string,
  userId: string,
  permission: ClassPermission,
): Promise<MembershipRow> {
  const membership = await requireMembership(classId, userId);
  if (!roleHasPermission(membership.role, permission)) {
    throw new AppError("FORBIDDEN", "You do not have permission to do that", 403);
  }
  return membership;
}

export async function listClassMemberships(classId: string): Promise<
  Array<{
    id: string;
    role: ClassRole;
    suspended: boolean;
    user: {
      id: string;
      email?: string;
      profile?: { name?: string | null; avatar?: { url?: string } | null };
    };
  }>
> {
  const data = await adminDb.query({
    classMemberships: {
      $: { where: { "class.id": classId } },
      user: { profile: { avatar: {} } },
    },
  });
  return data.classMemberships.flatMap((row) => {
    if (!isClassRole(row.role)) return [];
    const user = Array.isArray(row.user) ? row.user[0] : row.user;
    if (!user) return [];
    const profile = Array.isArray(user.profile) ? user.profile[0] : user.profile;
    const avatar = profile
      ? Array.isArray(profile.avatar)
        ? profile.avatar[0]
        : profile.avatar
      : null;
    return [
      {
        id: row.id,
        role: row.role,
        suspended: row.suspended,
        user: {
          id: user.id,
          email: user.email,
          profile: profile
            ? { name: profile.name, avatar: avatar ? { url: avatar.url } : null }
            : undefined,
        },
      },
    ];
  });
}

export function highestRole(roles: Array<string>): ClassRole | null {
  return pickHighestClassRole(roles);
}
