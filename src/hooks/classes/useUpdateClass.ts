import { adminPost } from "@/lib/api/admin";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { toast } from "@/components/ui/toast-manager";
import { messageFromError } from "@/lib/errors/convexError";
import type { Id } from "@/lib/ids";
import { useTranslation } from "react-i18next";

type UpdateClassArgs = {
  classId: Id<"classes">;
  name: string;
  year: number;
  description?: string;
  icon?: string;
};

export function useUpdateClass() {
  const { t } = useTranslation("classes");
  const { t: tCommon } = useTranslation("common");
  return useAsyncAction((args: UpdateClassArgs) => adminPost("/api/classes/update", args), {
    onError: (error) => {
      toast.add({
        title: messageFromError(error, t("saveFailed"), tCommon("rateLimited")),
        type: "error",
      });
    },
  });
}
