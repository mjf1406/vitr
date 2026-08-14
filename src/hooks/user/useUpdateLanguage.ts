import { adminPost } from "@/lib/api/admin";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import type { AppLanguage } from "@/lib/languages";

export function useUpdateLanguage() {
  return useAsyncAction((args: { language: AppLanguage }) =>
    adminPost("/api/account/update-profile", args),
  );
}
