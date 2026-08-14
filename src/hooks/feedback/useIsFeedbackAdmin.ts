import { useCurrentUser } from "@/hooks/user/useCurrentUser";
import { isSelfHosted } from "@/lib/selfHosted";

export function useIsFeedbackAdmin() {
  const cloud = !isSelfHosted();
  const { data, isPending, isAuthLoading, isError } = useCurrentUser();
  const isAdmin = cloud && (data?.isAppAdmin ?? false);
  return {
    data: { isAdmin },
    isPending,
    isAuthLoading,
    isError,
    refetch: () => undefined,
    isAdmin,
  };
}
