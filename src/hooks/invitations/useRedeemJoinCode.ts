import { adminPost } from "@/lib/api/admin";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import type { Id } from "@/lib/ids";

type RedeemJoinCodeArgs = {
  code: string;
};

export type RedeemJoinCodeResult = {
  classId: Id<"classes">;
  alreadyMember?: boolean;
  role?: string;
};

export function useRedeemJoinCode() {
  return useAsyncAction((args: RedeemJoinCodeArgs) =>
    adminPost<RedeemJoinCodeResult>("/api/join-codes/redeem", args),
  );
}
