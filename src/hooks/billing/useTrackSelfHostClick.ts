import { useTranslation } from "react-i18next";

import { adminPost } from "@/lib/api/admin";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { toast } from "@/components/ui/toast-manager";
import { messageFromError } from "@/lib/errors/convexError";

export function useTrackSelfHostClick() {
  const { t } = useTranslation("billing");
  const { t: tCommon } = useTranslation("common");
  return useAsyncAction(
    (_args: Record<string, never>) => adminPost("/api/usage/track", { kind: "self_host_click" }),
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
