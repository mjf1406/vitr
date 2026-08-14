import { adminPost } from "@/lib/api/admin";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { toast } from "@/components/ui/toast-manager";
import { messageFromError } from "@/lib/errors/convexError";
import type { Id } from "@/lib/ids";
import { useTranslation } from "react-i18next";

type DeleteClassArgs = {
  classId: Id<"classes">;
  confirmation: string;
};

export function useDeleteClass() {
  const { t } = useTranslation("classes");
  const { t: tCommon } = useTranslation("common");
  return useAsyncAction((args: DeleteClassArgs) => adminPost("/api/classes/delete", args), {
    onError: (error) => {
      toast.add({
        title: messageFromError(error, t("saveFailed"), tCommon("rateLimited")),
        type: "error",
      });
    },
  });
}
