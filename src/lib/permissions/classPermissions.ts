export type {
  ClassPermission,
  ClassRole,
  JoinCodeRole,
  MemberListRole,
} from "../../../shared/roles";
export {
  CLASS_ROLE_RANK,
  CLASS_ROLES,
  JOIN_CODE_INVITE_PERMISSION_BY_ROLE,
  JOIN_CODE_ROLES,
  MEMBER_LIST_AUTHZ_ROLES,
  MEMBER_LIST_READ_PERMISSION_BY_ROLE,
  REMOVE_PERMISSION_BY_ROLE,
  assignableRolesFor,
  canChangeMemberRole,
  canManageClassRoles,
  isClassRole,
  isJoinCodeRole,
  isStrictlyBelow,
  permissionsForRole,
  pickHighestClassRole,
  roleHasPermission,
  SUSPEND_PERMISSION_BY_ROLE,
} from "../../../shared/roles";

import { permissionsForRole, type ClassPermission, type ClassRole } from "../../../shared/roles";

export function createPermissionChecker(granted: ReadonlyArray<string>) {
  return function can(permission: ClassPermission | string): boolean {
    return granted.includes(permission);
  };
}

export function permissionsFromRole(role: ClassRole | null | undefined): Array<string> {
  if (!role) return [];
  return permissionsForRole(role);
}
