import { adminPost } from "@/lib/api/admin";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { toast } from "@/components/ui/toast-manager";
import { isSubscriptionRequiredError } from "@/lib/billing/errors";
import { messageFromError } from "@/lib/errors/convexError";
import { useTranslation } from "react-i18next";

type CreateClassArgs = {
  name: string;
  year: number;
  description?: string;
  icon?: string;
};

export function useCreateClass() {
  const { t } = useTranslation("classes");
  const { t: tCommon } = useTranslation("common");
  const { t: tBilling } = useTranslation("billing");

  return useAsyncAction(
    async (args: CreateClassArgs) => {
      const created = await adminPost<{ id: string }>("/api/classes/create", args);
      return { _id: created.id };
    },
    {
      onError: (error) => {
        toast.add({
          title: isSubscriptionRequiredError(error)
            ? tBilling("errorCreateRequiresSubscription")
            : messageFromError(error, t("saveFailed"), tCommon("rateLimited")),
          type: "error",
        });
      },
    },
  );
}
