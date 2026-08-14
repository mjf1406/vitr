import { useMemo } from "react";

import { db } from "@/lib/instant/db";
import { first } from "@/lib/instant/first";
import type { Id } from "@/lib/ids";
import type { JoinCodePublic } from "@/lib/invitations/joinCodes";
import { queryMeta } from "@/lib/instant/queryMeta";

export function useJoinCodes(classId: Id<"classes">, now: number) {
  const { user, isLoading: isAuthLoading } = db.useAuth();
  const query = db.useQuery(
    user
      ? {
          joinCodes: {
            $: { where: { "class.id": classId } },
            class: {},
            createdBy: {},
          },
        }
      : null,
  );

  const data = useMemo<Array<JoinCodePublic>>(() => {
    if (!query.data) return [];
    return query.data.joinCodes
      .filter((code) => code.expiresAt > now && code.useCount < code.maxUses)
      .map((code) => {
        const cls = first(code.class);
        const createdBy = first(code.createdBy);
        return {
          _id: code.id,
          _creationTime: code.createdAt as number,
          code: code.code,
          classId: cls?.id ?? classId,
          createdBy: createdBy?.id ?? "",
          role: code.role,
          expiresAt: code.expiresAt,
          maxUses: code.maxUses,
          useCount: code.useCount,
        };
      });
  }, [classId, now, query.data]);

  return { data, ...queryMeta(query, isAuthLoading) };
}
