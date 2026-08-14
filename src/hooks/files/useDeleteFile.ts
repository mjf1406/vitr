import { useTranslation } from "react-i18next";

import { adminPost } from "@/lib/api/admin";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { toast } from "@/components/ui/toast-manager";
import { messageFromError } from "@/lib/errors/convexError";
import type { Id } from "@/lib/ids";

type DeleteFileArgs = {
  fileId: Id<"files">;
  classId?: Id<"classes">;
};

export function useDeleteFile() {
  const { t } = useTranslation("upload");
  const { t: tCommon } = useTranslation("common");
  return useAsyncAction(
    (args: DeleteFileArgs) => adminPost("/api/files/delete", { fileRecordId: args.fileId }),
    {
      onError: (error) => {
        toast.add({
          title: messageFromError(error, t("deleteFailed"), tCommon("rateLimited")),
          type: "error",
        });
      },
    },
  );
}
