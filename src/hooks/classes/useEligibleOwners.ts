import { useMemo } from "react";

import { db } from "@/lib/instant/db";
import { first } from "@/lib/instant/first";
import type { Id } from "@/lib/ids";
import { sanitizeAvatarUrl } from "../../../shared/avatarUrl";

export type EligibleOwner = {
  userId: Id<"users">;
  name?: string;
  email?: string;
  image?: string | null;
};

export function useEligibleOwners(classId: Id<"classes">) {
  const { user, isLoading: isAuthLoading } = db.useAuth();
  const query = db.useQuery(
    user
      ? {
          classMemberships: {
            $: { where: { "class.id": classId } },
            user: { profile: { avatar: {} } },
          },
        }
      : null,
  );

  const data = useMemo<Array<EligibleOwner>>(() => {
    if (!query.data) return [];
    return query.data.classMemberships.flatMap((membership) => {
      if (membership.role !== "teacher" && membership.role !== "assistant_teacher") return [];
      if (membership.suspended) return [];
      const member = first(membership.user);
      if (!member || member.id === user?.id) return [];
      const profile = first(member.profile);
      const avatar = profile ? first(profile.avatar) : null;
      return [
        {
          userId: member.id,
          name: profile?.name ?? undefined,
          email: member.email,
          image: sanitizeAvatarUrl(avatar?.url) ?? null,
        },
      ];
    });
  }, [query.data, user?.id]);

  const isPending = isAuthLoading || query.isLoading;
  return {
    data,
    isPending,
    isLoading: isPending,
    isError: Boolean(query.error),
    error: query.error,
  };
}
