import { adminPost } from "@/lib/api/admin";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { toast } from "@/components/ui/toast-manager";
import { messageFromError } from "@/lib/errors/convexError";
import type { Id } from "@/lib/ids";
import { useTranslation } from "react-i18next";

type RevokeJoinCodeArgs = {
  classId: Id<"classes">;
  joinCodeId: Id<"joinCodes">;
};

export function useRevokeJoinCode(_listNow: number) {
  const { t } = useTranslation("classes");
  const { t: tCommon } = useTranslation("common");
  return useAsyncAction((args: RevokeJoinCodeArgs) => adminPost("/api/join-codes/revoke", args), {
    onError: (error) => {
      toast.add({
        title: messageFromError(error, t("revokeInviteFailed"), tCommon("rateLimited")),
        type: "error",
      });
    },
  });
}
