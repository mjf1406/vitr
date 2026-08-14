import { useTranslation } from "react-i18next";

import { adminPost } from "@/lib/api/admin";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { toast } from "@/components/ui/toast-manager";
import { messageFromError } from "@/lib/errors/convexError";
import type { DesktopOs } from "../../../shared/usageTracking";

export function useTrackDesktopDownload() {
  const { t } = useTranslation("billing");
  const { t: tCommon } = useTranslation("common");
  return useAsyncAction(
    (args: { os: DesktopOs }) =>
      adminPost("/api/usage/track", { kind: "desktop_download", os: args.os }),
    {
      onError: (error) => {
        toast.add({
          type: "error",
          title: messageFromError(error, t("usageTrackFailed"), tCommon("rateLimited")),
        });
      },
    },
  );
}
