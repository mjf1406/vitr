import { useMemo } from "react";

import { db } from "@/lib/instant/db";
import { first } from "@/lib/instant/first";
import { sanitizeAvatarUrl } from "../../../shared/avatarUrl";
import { normalizeOnlineUserIds } from "@/lib/presence/presence";
import type { PresenceDisplaySummary } from "@/lib/presence/presence";
import type { Id } from "@/lib/ids";

export function usePresenceDisplaySummaries(
  classId: Id<"classes">,
  onlineUserIds: ReadonlySet<string> | undefined,
) {
  const ids = useMemo(() => normalizeOnlineUserIds(onlineUserIds), [onlineUserIds]);
  const { user, isLoading: isAuthLoading } = db.useAuth();
  const query = db.useQuery(
    user && ids.length > 0
      ? {
          classMemberships: {
            $: { where: { "class.id": classId } },
            user: { profile: { avatar: {} } },
          },
        }
      : null,
  );

  const data = useMemo<Array<PresenceDisplaySummary>>(() => {
    if (!query.data) return [];
    const wanted = new Set(ids);
    return query.data.classMemberships.flatMap((membership) => {
      const member = first(membership.user);
      if (!member || !wanted.has(member.id)) return [];
      const profile = first(member.profile);
      const avatar = profile ? first(profile.avatar) : null;
      return [
        {
          userId: member.id,
          name: profile?.name ?? undefined,
          image: sanitizeAvatarUrl(avatar?.url) ?? undefined,
        },
      ];
    });
  }, [ids, query.data]);

  const isPending = isAuthLoading || query.isLoading;
  return {
    data,
    isPending,
    isLoading: isPending,
    isError: Boolean(query.error),
    error: query.error,
  };
}
