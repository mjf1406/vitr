import { adminPost } from "@/lib/api/admin";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { toast } from "@/components/ui/toast-manager";
import { messageFromError } from "@/lib/errors/convexError";
import type { Id } from "@/lib/ids";
import type { JoinCodeRole } from "@/lib/permissions/classPermissions";
import { useTranslation } from "react-i18next";

type CreateJoinCodeArgs = {
  classId: Id<"classes">;
  role: JoinCodeRole;
  ttlMs: number;
  maxUses: number;
};

export function useCreateJoinCode(_listNow: number) {
  const { t } = useTranslation("classes");
  const { t: tCommon } = useTranslation("common");
  return useAsyncAction((args: CreateJoinCodeArgs) => adminPost("/api/join-codes/create", args), {
    onError: (error) => {
      toast.add({
        title: messageFromError(error, t("createInviteFailed"), tCommon("rateLimited")),
        type: "error",
      });
    },
  });
}
