import { adminPost } from "@/lib/api/admin";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { toast } from "@/components/ui/toast-manager";
import { messageFromError } from "@/lib/errors/convexError";
import type { Id } from "@/lib/ids";
import { useTranslation } from "react-i18next";

type SetSuspendedArgs = {
  classId: Id<"classes">;
  userId: Id<"users">;
  suspended: boolean;
};

export function useSetMemberSuspended() {
  const { t } = useTranslation("classes");
  const { t: tCommon } = useTranslation("common");
  return useAsyncAction((args: SetSuspendedArgs) => adminPost("/api/members/set-suspended", args), {
    onError: (error) => {
      toast.add({
        title: messageFromError(error, t("suspendFailed"), tCommon("rateLimited")),
        type: "error",
      });
    },
  });
}
