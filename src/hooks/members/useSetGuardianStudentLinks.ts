import { adminPost } from "@/lib/api/admin";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { toast } from "@/components/ui/toast-manager";
import { messageFromError } from "@/lib/errors/convexError";
import type { Id } from "@/lib/ids";
import type { LinkedStudentPublic } from "@/lib/members/members";
import { useTranslation } from "react-i18next";

type SetGuardianStudentLinksArgs = {
  classId: Id<"classes">;
  guardianUserId: Id<"users">;
  studentUserIds: Id<"users">[];
  linkedStudents: LinkedStudentPublic[];
};

export function useSetGuardianStudentLinks() {
  const { t } = useTranslation("classes");
  const { t: tCommon } = useTranslation("common");
  return useAsyncAction(
    (args: SetGuardianStudentLinksArgs) =>
      adminPost("/api/members/set-guardian-links", {
        classId: args.classId,
        guardianUserId: args.guardianUserId,
        studentUserIds: args.studentUserIds,
      }),
    {
      onError: (error) => {
        toast.add({
          title: messageFromError(error, t("linkStudentsFailed"), tCommon("rateLimited")),
          type: "error",
        });
      },
    },
  );
}
