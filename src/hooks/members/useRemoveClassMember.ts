import { adminPost } from "@/lib/api/admin";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { toast } from "@/components/ui/toast-manager";
import { messageFromError } from "@/lib/errors/convexError";
import type { Id } from "@/lib/ids";
import type { MemberListRole } from "@/lib/members/members";
import { useTranslation } from "react-i18next";

type RemoveClassMemberArgs = {
  classId: Id<"classes">;
  userId: Id<"users">;
};

export function useRemoveClassMember(_listRole: MemberListRole) {
  const { t } = useTranslation("classes");
  const { t: tCommon } = useTranslation("common");
  return useAsyncAction((args: RemoveClassMemberArgs) => adminPost("/api/members/remove", args), {
    onError: (error) => {
      toast.add({
        title: messageFromError(error, t("removeMemberFailed"), tCommon("rateLimited")),
        type: "error",
      });
    },
  });
}
