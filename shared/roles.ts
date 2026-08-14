/**
 * Single source of truth for class roles and the permission catalog derived from them.
 * Instant CEL enforces membership; the client uses `permissionsForRole` for UI gating.
 */

export const CLASS_PERMISSION_CATALOG = {
  class: ["read", "update", "archive", "delete"],
  activity: ["read"],
  teachers: ["read", "invite", "remove", "suspend"],
  assistantTeachers: ["read", "invite", "remove", "suspend"],
  students: ["read", "add", "remove", "suspend"],
  guardians: ["read", "invite", "remove", "suspend"],
  invitations: ["read", "create", "revoke"],
  files: ["read", "create"],
  permissions: ["manage"],
  admin: ["syncProducts", "viewHealth", "manageUsers", "viewFeedback"],
} as const;

type Resource = keyof typeof CLASS_PERMISSION_CATALOG;
type ActionOf<R extends Resource> = (typeof CLASS_PERMISSION_CATALOG)[R][number];

export type AppPermission = {
  [R in Resource]: `${R}:${ActionOf<R>}`;
}[Resource];

export type ClassPermission = Exclude<AppPermission, `admin:${string}`>;

export const CLASS_ROLE_NAMES = [
  "owner",
  "teacher",
  "assistant_teacher",
  "student",
  "guardian",
  "class_member",
] as const;

export type ClassRole = (typeof CLASS_ROLE_NAMES)[number];

export const CLASS_ROLES: Array<ClassRole> = [...CLASS_ROLE_NAMES];

export const CLASS_ROLE_RANK: Record<ClassRole, number> = {
  owner: 60,
  teacher: 50,
  assistant_teacher: 40,
  student: 30,
  guardian: 30,
  class_member: 10,
};

type RoleSpec = {
  inherits?: ClassRole;
  grants: ReadonlyArray<string>;
};

const ROLE_SPECS: Record<ClassRole | "app_admin", RoleSpec> = {
  class_member: { grants: ["class:read", "files:read"] },
  student: { inherits: "class_member", grants: [] },
  guardian: { inherits: "class_member", grants: [] },
  assistant_teacher: {
    inherits: "class_member",
    grants: [
      "activity:read",
      "teachers:read",
      "assistantTeachers:read",
      "students:read",
      "guardians:read",
    ],
  },
  teacher: {
    inherits: "assistant_teacher",
    grants: [
      "class:update",
      "class:archive",
      "students:add",
      "students:remove",
      "students:suspend",
      "guardians:invite",
      "guardians:remove",
      "guardians:suspend",
      "assistantTeachers:invite",
      "assistantTeachers:remove",
      "assistantTeachers:suspend",
      "invitations:read",
      "invitations:create",
      "invitations:revoke",
      "files:create",
    ],
  },
  owner: {
    inherits: "teacher",
    grants: [
      "class:delete",
      "teachers:invite",
      "teachers:remove",
      "teachers:suspend",
      "permissions:manage",
    ],
  },
  app_admin: {
    grants: ["admin:syncProducts", "admin:viewHealth", "admin:manageUsers", "admin:viewFeedback"],
  },
};

const rolePermissionCache = new Map<string, Array<string>>();

export function permissionsForRole(role: ClassRole | "app_admin"): Array<string> {
  const cached = rolePermissionCache.get(role);
  if (cached) {
    return cached;
  }
  const seen = new Set<string>();
  const visit = (name: ClassRole | "app_admin") => {
    const spec = ROLE_SPECS[name];
    if (spec.inherits) {
      visit(spec.inherits);
    }
    for (const permission of spec.grants) {
      seen.add(permission);
    }
  };
  visit(role);
  const list = [...seen];
  rolePermissionCache.set(role, list);
  return list;
}

export type JoinCodeRole = Exclude<ClassRole, "owner" | "class_member">;

export type MemberListRole = JoinCodeRole;

export const MEMBER_LIST_AUTHZ_ROLES = {
  teacher: ["owner", "teacher"],
  assistant_teacher: ["assistant_teacher"],
  student: ["student"],
  guardian: ["guardian"],
} as const satisfies Record<MemberListRole, ReadonlyArray<ClassRole>>;

export const MEMBER_LIST_READ_PERMISSION_BY_ROLE = {
  teacher: "teachers:read",
  assistant_teacher: "assistantTeachers:read",
  student: "students:read",
  guardian: "guardians:read",
} as const satisfies Record<MemberListRole, ClassPermission>;

export const JOIN_CODE_ROLES = [
  "teacher",
  "assistant_teacher",
  "student",
  "guardian",
] as const satisfies ReadonlyArray<JoinCodeRole>;

export const JOIN_CODE_INVITE_PERMISSION_BY_ROLE = {
  teacher: "teachers:invite",
  assistant_teacher: "assistantTeachers:invite",
  student: "students:add",
  guardian: "guardians:invite",
} as const satisfies Record<JoinCodeRole, ClassPermission>;

export const SUSPEND_PERMISSION_BY_ROLE = {
  owner: null,
  teacher: "teachers:suspend",
  assistant_teacher: "assistantTeachers:suspend",
  student: "students:suspend",
  guardian: "guardians:suspend",
  class_member: null,
} as const satisfies Record<ClassRole, ClassPermission | null>;

export const REMOVE_PERMISSION_BY_ROLE = {
  owner: null,
  teacher: "teachers:remove",
  assistant_teacher: "assistantTeachers:remove",
  student: "students:remove",
  guardian: "guardians:remove",
  class_member: null,
} as const satisfies Record<ClassRole, ClassPermission | null>;

export function isJoinCodeRole(value: string): value is JoinCodeRole {
  return (JOIN_CODE_ROLES as ReadonlyArray<string>).includes(value);
}

export function isClassRole(value: string): value is ClassRole {
  return (CLASS_ROLE_NAMES as ReadonlyArray<string>).includes(value);
}

export function pickHighestClassRole(roleNames: Array<string>): ClassRole | null {
  let best: ClassRole | null = null;
  let bestRank = -1;
  for (const name of roleNames) {
    if (!isClassRole(name)) continue;
    const rank = CLASS_ROLE_RANK[name];
    if (rank > bestRank) {
      best = name;
      bestRank = rank;
    }
  }
  return best;
}

export function canManageClassRoles(actorRole: ClassRole | null | undefined): boolean {
  return actorRole === "owner" || actorRole === "teacher";
}

export function isStrictlyBelow(actorRole: ClassRole, otherRole: ClassRole): boolean {
  return CLASS_ROLE_RANK[otherRole] < CLASS_ROLE_RANK[actorRole];
}

export function assignableRolesFor(actorRole: ClassRole): Array<JoinCodeRole> {
  if (!canManageClassRoles(actorRole)) return [];
  return JOIN_CODE_ROLES.filter((role) => isStrictlyBelow(actorRole, role));
}

export function canChangeMemberRole(
  actorRole: ClassRole | null | undefined,
  memberRole: ClassRole,
): boolean {
  if (!actorRole || !canManageClassRoles(actorRole)) return false;
  return isStrictlyBelow(actorRole, memberRole);
}

export function roleHasPermission(
  role: ClassRole | null | undefined,
  permission: ClassPermission | string,
): boolean {
  if (!role) return false;
  return permissionsForRole(role).includes(permission);
}
