import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { adminPost } from "@/lib/api/admin";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { toast } from "@/components/ui/toast-manager";
import { codeFromError, messageFromError } from "@/lib/errors/convexError";
import { db } from "@/lib/instant/db";

const ACCOUNT_ERROR_KEYS = {
  OWNS_CLASSES: "errorOwnsClasses",
  ACTIVE_SUBSCRIPTION: "errorActiveSubscription",
  INVALID_CONFIRMATION: "errorConfirmationMismatch",
} as const;

export function useDeleteAccount() {
  const { t } = useTranslation("account");
  const { t: tCommon } = useTranslation("common");
  const navigate = useNavigate();

  return useAsyncAction(
    (args: { confirmation: string }) => adminPost("/api/account/delete", args),
    {
      onError: (error) => {
        const code = codeFromError(error);
        const title =
          code && code in ACCOUNT_ERROR_KEYS
            ? t(ACCOUNT_ERROR_KEYS[code as keyof typeof ACCOUNT_ERROR_KEYS])
            : messageFromError(error, t("deleteFailed"), tCommon("rateLimited"));
        toast.add({ title, type: "error" });
      },
      onSuccess: () => {
        void db.auth.signOut().then(() => navigate({ to: "/login" }));
      },
    },
  );
}
