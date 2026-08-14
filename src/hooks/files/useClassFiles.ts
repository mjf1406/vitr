import { useMemo } from "react";

import { db } from "@/lib/instant/db";
import { first } from "@/lib/instant/first";
import type { Id } from "@/lib/ids";

export type ClassFilePublic = {
  _id: Id<"files">;
  name: string;
  contentType: string;
  size: number;
  createdAt: number;
  url?: string;
  fileId?: string;
};

export function useClassFiles(classId: Id<"classes">) {
  const { user, isLoading: isAuthLoading } = db.useAuth();
  const query = db.useQuery(
    user
      ? {
          fileRecords: {
            $: { where: { "class.id": classId } },
            file: {},
          },
        }
      : null,
  );

  const data = useMemo<Array<ClassFilePublic>>(() => {
    if (!query.data) return [];
    return query.data.fileRecords.map((record) => {
      const file = first(record.file);
      return {
        _id: record.id,
        name: record.name,
        contentType: record.contentType,
        size: record.size,
        createdAt: record.createdAt as number,
        url: file?.url,
        fileId: file?.id,
      };
    });
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
