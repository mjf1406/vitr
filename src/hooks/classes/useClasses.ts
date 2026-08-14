import { useMemo } from "react";

import { db } from "@/lib/instant/db";
import { first } from "@/lib/instant/first";
import type { ClassPublic } from "@/lib/classes/classes";
import { isClassRole } from "@/lib/permissions/classPermissions";
import { queryMeta } from "@/lib/instant/queryMeta";

export function useClasses() {
  const { user, isLoading: isAuthLoading } = db.useAuth();
  const query = db.useQuery(
    user
      ? {
          classMemberships: {
            $: { where: { "user.id": user.id } },
            class: { owner: {}, banner: {} },
          },
        }
      : null,
  );

  const data = useMemo<Array<ClassPublic>>(() => {
    if (!query.data) return [];
    return query.data.classMemberships.flatMap((membership) => {
      const cls = first(membership.class);
      if (!cls || membership.suspended) return [];
      const owner = first(cls.owner);
      const banner = first(cls.banner);
      const role = isClassRole(membership.role) ? membership.role : "class_member";
      return [
        {
          _id: cls.id,
          _creationTime: membership.createdAt as number,
          ownerId: owner?.id ?? "",
          name: cls.name,
          year: cls.year,
          description: cls.description ?? undefined,
          icon: cls.icon ?? undefined,
          bannerFileId: banner?.id,
          updatedAt: cls.updatedAt as number,
          archivedAt: (cls.archivedAt as number | null | undefined) ?? undefined,
          role,
        },
      ];
    });
  }, [query.data]);

  return { data, ...queryMeta(query, isAuthLoading) };
}

export function useActiveClasses() {
  const { data, ...rest } = useClasses();
  const active = useMemo(
    () => (data ?? []).filter((classDoc) => classDoc.archivedAt === undefined),
    [data],
  );
  return { ...rest, data: active };
}
