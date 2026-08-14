import { useCurrentUser } from "@/hooks/user/useCurrentUser";
import { isSelfHosted } from "@/lib/selfHosted";

export function useIsAppAdmin() {
  const selfHosted = isSelfHosted();
  const { data, isPending, isAuthLoading, isError } = useCurrentUser();
  const isAdmin = selfHosted && (data?.isAppAdmin ?? false);
  return {
    data: { isAdmin },
    isPending,
    isAuthLoading,
    isError,
    refetch: () => undefined,
    isAdmin,
  };
}
