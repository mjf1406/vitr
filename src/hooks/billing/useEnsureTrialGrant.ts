import { adminPost } from "@/lib/api/admin";
import { useAsyncAction } from "@/hooks/useAsyncAction";

export function useEnsureTrialGrant() {
  return useAsyncAction(() => adminPost("/api/account/bootstrap"));
}
