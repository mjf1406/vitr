import { useAdminQuery } from "@/hooks/useAdminQuery";
import { isSelfHosted } from "@/lib/selfHosted";

type AdminUsersResponse = {
  users: Array<{
    _id: string;
    email?: string;
    name?: string;
    isAppAdmin: boolean;
    createdAt?: number;
  }>;
};

export function useAdminUsers() {
  const enabled = isSelfHosted();
  const query = useAdminQuery<AdminUsersResponse>(enabled ? "/api/admin/users" : null);
  return {
    ...query,
    data: query.data?.users,
  };
}
