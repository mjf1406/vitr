import { useTranslation } from "react-i18next";

import { db } from "@/lib/instant/db";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { toast } from "@/components/ui/toast-manager";
import { messageFromError } from "@/lib/errors/convexError";
import type { Id } from "@/lib/ids";

type RenameFileArgs = {
  fileId: Id<"files">;
  name: string;
  classId?: Id<"classes">;
};

export function useRenameFile() {
  const { t } = useTranslation("upload");
  const { t: tCommon } = useTranslation("common");
  return useAsyncAction(
    async (args: RenameFileArgs) => {
      const name = args.name.trim().slice(0, 255) || "file";
      await db.transact(db.tx.fileRecords[args.fileId].update({ name }));
    },
    {
      onError: (error) => {
        toast.add({
          title: messageFromError(error, t("renameFailed"), tCommon("rateLimited")),
          type: "error",
        });
      },
    },
  );
}
