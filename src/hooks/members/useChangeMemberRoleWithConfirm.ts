import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

import { toast } from "@/components/ui/toast-manager";
import { useSetMemberRole } from "@/hooks/members/useSetMemberRole";
import { messageFromError } from "@/lib/errors/convexError";
import type { Id } from "@/lib/ids";
import type { ClassMemberPublic, JoinCodeRole } from "@/lib/members/members";
import { getDisplayName } from "@/lib/user/userDisplay";

type PendingRoleChange = {
  member: ClassMemberPublic;
  role: JoinCodeRole;
};

export function useChangeMemberRoleWithConfirm(classId: Id<"classes">) {
  const { t } = useTranslation("classes");
  const { t: tCommon } = useTranslation("common");
  const setRoleMutation = useSetMemberRole();
  const [pending, setPending] = useState<PendingRoleChange | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const applyRoleChange = useCallback(
    async (member: ClassMemberPublic, role: JoinCodeRole) => {
      await setRoleMutation.mutateAsync({
        classId,
        userId: member.userId,
        role,
        fromRole: member.role,
      });
    },
    [classId, setRoleMutation],
  );

  const requestRoleChange = useCallback(
    async (member: ClassMemberPublic, role: JoinCodeRole) => {
      try {
        await applyRoleChange(member, role);
      } catch (error) {
        toast.add({
          title: messageFromError(error, t("changeRoleFailed"), tCommon("rateLimited")),
          type: "error",
        });
      }
    },
    [applyRoleChange, t, tCommon],
  );

  const confirmPendingRoleChange = useCallback(() => {
    if (!pending) return;
    const { member, role } = pending;
    setConfirmOpen(false);
    setPending(null);
    void applyRoleChange(member, role);
  }, [applyRoleChange, pending]);

  const handleConfirmOpenChange = useCallback((open: boolean) => {
    setConfirmOpen(open);
    if (!open) {
      setPending(null);
    }
  }, []);

  const pendingMemberName = pending
    ? getDisplayName(
        {
          _id: pending.member.userId,
          name: pending.member.name,
          email: pending.member.email,
        },
        t("unnamedMember"),
      )
    : "";

  return {
    requestRoleChange,
    confirmPendingRoleChange,
    confirmOpen,
    handleConfirmOpenChange,
    pendingMemberName,
  };
}
