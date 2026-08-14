import { adminPost } from "@/lib/api/admin";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { toast } from "@/components/ui/toast-manager";
import { messageFromError } from "@/lib/errors/convexError";
import type { Id } from "@/lib/ids";
import type { ClassMemberPublic, JoinCodeRole } from "@/lib/members/members";
import { useTranslation } from "react-i18next";

type SetMemberRoleArgs = {
  classId: Id<"classes">;
  userId: Id<"users">;
  role: JoinCodeRole;
  fromRole: ClassMemberPublic["role"];
};

export function useSetMemberRole() {
  const { t } = useTranslation("classes");
  const { t: tCommon } = useTranslation("common");
  return useAsyncAction(
    (args: SetMemberRoleArgs) =>
      adminPost("/api/members/set-role", {
        classId: args.classId,
        userId: args.userId,
        role: args.role,
      }),
    {
      onError: (error) => {
        toast.add({
          title: messageFromError(error, t("changeRoleFailed"), tCommon("rateLimited")),
          type: "error",
        });
      },
    },
  );
}
