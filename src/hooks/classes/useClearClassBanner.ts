import { adminPost } from "@/lib/api/admin";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { toast } from "@/components/ui/toast-manager";
import { messageFromError } from "@/lib/errors/convexError";
import type { Id } from "@/lib/ids";
import { useTranslation } from "react-i18next";

type ClearClassBannerArgs = {
  classId: Id<"classes">;
};

export function useClearClassBanner() {
  const { t } = useTranslation("classes");
  const { t: tCommon } = useTranslation("common");
  return useAsyncAction(
    (args: ClearClassBannerArgs) =>
      adminPost("/api/classes/set-banner", { classId: args.classId, fileId: null }),
    {
      onError: (error) => {
        toast.add({
          title: messageFromError(error, t("bannerClearFailed"), tCommon("rateLimited")),
          type: "error",
        });
      },
    },
  );
}
