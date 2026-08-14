import { adminPost } from "@/lib/api/admin";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { toast } from "@/components/ui/toast-manager";
import { messageFromError } from "@/lib/errors/convexError";
import { useTranslation } from "react-i18next";

export function useClearAvatar() {
  const { t } = useTranslation("account");
  const { t: tCommon } = useTranslation("common");
  return useAsyncAction(
    (_args: Record<string, never>) =>
      adminPost("/api/account/update-profile", { avatarFileId: null }),
    {
      onError: (error) => {
        toast.add({
          type: "error",
          title: messageFromError(error, t("avatarClearFailed"), tCommon("rateLimited")),
        });
      },
    },
  );
}
