import { useMemo } from "react";

import { db } from "@/lib/instant/db";
import { first } from "@/lib/instant/first";
import type { Id } from "@/lib/ids";
import type { ClassDoc } from "@/lib/classes/classes";
import { queryMeta } from "@/lib/instant/queryMeta";

export function useClass(classId: Id<"classes">) {
  const { user, isLoading: isAuthLoading } = db.useAuth();
  const query = db.useQuery(
    user
      ? {
          classes: {
            $: { where: { id: classId } },
            owner: {},
            banner: {},
            memberships: { $: { where: { "user.id": user.id } } },
          },
        }
      : null,
  );

  const data = useMemo<ClassDoc | null>(() => {
    const cls = query.data?.classes[0];
    if (!cls) return null;
    const membership = first(cls.memberships);
    if (!membership || membership.suspended) return null;
    const owner = first(cls.owner);
    const banner = first(cls.banner);
    return {
      _id: cls.id,
      _creationTime: (cls.updatedAt as number) ?? Date.now(),
      ownerId: owner?.id ?? "",
      name: cls.name,
      year: cls.year,
      description: cls.description ?? undefined,
      icon: cls.icon ?? undefined,
      bannerFileId: banner?.id,
      updatedAt: cls.updatedAt as number,
      archivedAt: (cls.archivedAt as number | null | undefined) ?? undefined,
    };
  }, [query.data]);

  return { data, ...queryMeta(query, isAuthLoading) };
}
