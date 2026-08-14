import { useAdminQuery } from "@/hooks/useAdminQuery";

export function useBillingProducts() {
  return useAdminQuery<{
    proMonthly: { id: string; name?: string | null } | null;
    proYearly: { id: string; name?: string | null } | null;
  }>("/api/billing/products");
}
