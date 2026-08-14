import { adminPost } from "@/lib/api/admin";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { toast } from "@/components/ui/toast-manager";
import { fullNameFromParts } from "@/lib/user/userName";
import { useTranslation } from "react-i18next";

type UpdateDisplayNameArgs = {
  firstName: string;
  lastName: string;
};

export function useUpdateDisplayName() {
  const { t } = useTranslation("account");
  return useAsyncAction(
    (args: UpdateDisplayNameArgs) =>
      adminPost("/api/account/update-profile", {
        name: fullNameFromParts(args.firstName, args.lastName),
      }),
    {
      onError: (error) => {
        toast.add({
          type: "error",
          title: error instanceof Error ? error.message : t("profileSaveFailed"),
        });
      },
    },
  );
}
