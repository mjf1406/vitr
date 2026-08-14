import { useTranslation } from "react-i18next";

import { adminPost } from "@/lib/api/admin";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { toast } from "@/components/ui/toast-manager";
import { messageFromError } from "@/lib/errors/convexError";
import type { Id } from "@/lib/ids";
import type { FeedbackAdminListArgs } from "@/hooks/feedback/useFeedbackAdminList";

type SetArchivedArgs = {
  feedbackId: Id<"feedback">;
  archived: boolean;
};

export function useSetFeedbackArchived(_listArgs: FeedbackAdminListArgs) {
  const { t } = useTranslation("feedback");
  const { t: tCommon } = useTranslation("common");
  return useAsyncAction((args: SetArchivedArgs) => adminPost("/api/feedback/set-archived", args), {
    onError: (error) => {
      toast.add({
        title: messageFromError(error, t("archiveFailed"), tCommon("rateLimited")),
        type: "error",
      });
    },
  });
}
