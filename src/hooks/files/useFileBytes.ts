import { db } from "@/lib/instant/db";
import { first } from "@/lib/instant/first";
import type { Id } from "@/lib/ids";

type FileBytesResult = {
  blob: Blob | null;
  contentType: string;
  name: string;
};

export function useFileBytes(fileId: Id<"files"> | undefined) {
  const { user, isLoading: isAuthLoading } = db.useAuth();
  const query = db.useQuery(
    user && fileId
      ? {
          $files: { $: { where: { id: fileId } } },
          fileRecords: { $: { where: { id: fileId } }, file: {} },
        }
      : null,
  );

  const file = query.data?.$files[0] ?? first(query.data?.fileRecords[0]?.file);
  const url = file?.url ?? null;
  const isPending = isAuthLoading || query.isLoading;

  return {
    data: file
      ? ({
          blob: null,
          contentType: "application/octet-stream",
          name: file.path ?? "file",
        } satisfies FileBytesResult)
      : undefined,
    url,
    isPending,
    isAuthLoading,
    isError: Boolean(query.error),
    error: query.error,
    isSuccess: Boolean(url),
    refetch: () => undefined,
    status: isPending ? "pending" : url ? "success" : "error",
  };
}

export const useFileUrl = useFileBytes;

export function removeAllFileBytesQueries(_queryClient?: unknown) {
  return;
}

export function useRemoveFileBytesOnAccessLoss(_lost: boolean) {
  return;
}
