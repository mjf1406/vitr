import { useTranslation } from "react-i18next";

import { adminPost } from "@/lib/api/admin";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { toast } from "@/components/ui/toast-manager";
import { billingMessageFromError } from "@/lib/billing/errors";

export function useCreateCheckoutLink() {
  const { t } = useTranslation("billing");
  const { t: tCommon } = useTranslation("common");
  return useAsyncAction(
    (args: { productId: string }) => adminPost<{ url: string }>("/api/billing/checkout", args),
    {
      onError: (error) => {
        toast.add({
          type: "error",
          title: billingMessageFromError(error, t, t("checkoutFailed"), tCommon("rateLimited")),
        });
      },
    },
  );
}
