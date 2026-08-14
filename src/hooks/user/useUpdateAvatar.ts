import { adminPost } from "@/lib/api/admin";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { toast } from "@/components/ui/toast-manager";
import { messageFromError } from "@/lib/errors/convexError";
import type { Id } from "@/lib/ids";
import { useTranslation } from "react-i18next";

type UpdateAvatarArgs = {
  fileId: Id<"files">;
};

export function useUpdateAvatar() {
  const { t } = useTranslation("account");
  const { t: tCommon } = useTranslation("common");
  return useAsyncAction(
    (args: UpdateAvatarArgs) =>
      adminPost("/api/account/update-profile", { avatarFileId: args.fileId }),
    {
      onError: (error) => {
        toast.add({
          type: "error",
          title: messageFromError(error, t("avatarSaveFailed"), tCommon("rateLimited")),
        });
      },
    },
  );
}
