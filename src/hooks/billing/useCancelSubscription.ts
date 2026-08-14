import { useTranslation } from "react-i18next";

import { adminPost } from "@/lib/api/admin";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { toast } from "@/components/ui/toast-manager";
import { billingMessageFromError } from "@/lib/billing/errors";

export function useCancelSubscription() {
  const { t } = useTranslation("billing");
  const { t: tCommon } = useTranslation("common");
  return useAsyncAction(
    (args: { revokeImmediately?: boolean } = {}) => adminPost("/api/billing/cancel", args),
    {
      onError: (error) => {
        toast.add({
          type: "error",
          title: billingMessageFromError(error, t, t("cancelFailed"), tCommon("rateLimited")),
        });
      },
    },
  );
}
