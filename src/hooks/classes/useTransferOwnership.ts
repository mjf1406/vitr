import { adminPost } from "@/lib/api/admin";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { toast } from "@/components/ui/toast-manager";
import { messageFromError } from "@/lib/errors/convexError";
import type { Id } from "@/lib/ids";
import { useTranslation } from "react-i18next";

type TransferOwnershipArgs = {
  classId: Id<"classes">;
  toUserId: Id<"users">;
};

export function useTransferOwnership() {
  const { t } = useTranslation("classes");
  const { t: tCommon } = useTranslation("common");
  return useAsyncAction(
    (args: TransferOwnershipArgs) =>
      adminPost("/api/classes/transfer", { classId: args.classId, newOwnerId: args.toUserId }),
    {
      onError: (error) => {
        toast.add({
          title: messageFromError(error, t("transferFailed"), tCommon("rateLimited")),
          type: "error",
        });
      },
    },
  );
}
