import { useTranslation } from "react-i18next";

import { adminPost } from "@/lib/api/admin";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { toast } from "@/components/ui/toast-manager";
import { billingMessageFromError } from "@/lib/billing/errors";
import { assertSafePolarCheckoutUrl } from "@/lib/billing/polarUrl";

export function useCustomerPortal() {
  const { t } = useTranslation("billing");
  const { t: tCommon } = useTranslation("common");
  return useAsyncAction(
    async () => {
      const { url } = await adminPost<{ url: string }>("/api/billing/portal");
      const safeUrl = assertSafePolarCheckoutUrl(url);
      window.open(safeUrl, "_blank", "noopener,noreferrer");
      return safeUrl;
    },
    {
      onError: (error) => {
        toast.add({
          type: "error",
          title: billingMessageFromError(error, t, t("portalFailed"), tCommon("rateLimited")),
        });
      },
    },
  );
}
