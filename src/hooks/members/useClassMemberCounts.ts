import { useMemo } from "react";

import { db } from "@/lib/instant/db";
import type { Id } from "@/lib/ids";
import type { ClassMemberCounts } from "@/lib/members/members";
import { memberListRoleFor } from "@/lib/members/members";
import type { ClassMemberPublic } from "@/lib/members/members";

export function useClassMemberCounts(classId: Id<"classes">) {
  const { user, isLoading: isAuthLoading } = db.useAuth();
  const query = db.useQuery(
    user
      ? {
          classMemberships: {
            $: { where: { "class.id": classId } },
          },
        }
      : null,
  );

  const data = useMemo<ClassMemberCounts>(() => {
    const counts: ClassMemberCounts = {
      teacher: 0,
      assistant_teacher: 0,
      student: 0,
      guardian: 0,
    };
    if (!query.data) return counts;
    for (const membership of query.data.classMemberships) {
      if (membership.suspended) continue;
      const listRole = memberListRoleFor(membership.role as ClassMemberPublic["role"]);
      if (
        listRole === "teacher" ||
        listRole === "assistant_teacher" ||
        listRole === "student" ||
        listRole === "guardian"
      ) {
        counts[listRole] = (counts[listRole] ?? 0) + 1;
      }
    }
    return counts;
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
