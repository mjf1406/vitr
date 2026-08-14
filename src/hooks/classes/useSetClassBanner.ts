import { adminPost } from "@/lib/api/admin";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { toast } from "@/components/ui/toast-manager";
import { messageFromError } from "@/lib/errors/convexError";
import type { Id } from "@/lib/ids";
import { useTranslation } from "react-i18next";

type SetClassBannerArgs = {
  classId: Id<"classes">;
  fileId: Id<"files">;
};

export function useSetClassBanner() {
  const { t } = useTranslation("classes");
  const { t: tCommon } = useTranslation("common");
  return useAsyncAction((args: SetClassBannerArgs) => adminPost("/api/classes/set-banner", args), {
    onError: (error) => {
      toast.add({
        title: messageFromError(error, t("bannerSaveFailed"), tCommon("rateLimited")),
        type: "error",
      });
    },
  });
}
