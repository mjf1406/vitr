import { useMemo } from "react";

import { db } from "@/lib/instant/db";
import {
  isClassRole,
  permissionsForRole,
  type ClassRole,
} from "@/lib/permissions/classPermissions";
import type { Id } from "@/lib/ids";

export function useClassPermissions(classId: Id<"classes">) {
  const { user, isLoading: isAuthLoading } = db.useAuth();
  const query = db.useQuery(
    user
      ? {
          classMemberships: {
            $: { where: { "class.id": classId, "user.id": user.id } },
          },
        }
      : null,
  );

  const data = useMemo(() => {
    const membership = query.data?.classMemberships[0];
    if (!membership || membership.suspended) {
      return { role: null as ClassRole | null, permissions: [] as Array<string> };
    }
    const role = isClassRole(membership.role) ? membership.role : null;
    return {
      role,
      permissions: role ? permissionsForRole(role) : [],
    };
  }, [query.data]);

  const isPending = isAuthLoading || query.isLoading;
  return {
    data,
    isPending,
    isLoading: isPending,
    isError: Boolean(query.error),
    error: query.error,
  };
}
