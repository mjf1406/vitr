import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { BillingSummaryCard } from "@/components/account/BillingSummaryCard";
import { DangerZoneCard } from "@/components/account/DangerZoneCard";
import { ProfileCard } from "@/components/account/ProfileCard";
import { SecurityCard } from "@/components/account/SecurityCard";
import { useCurrentUser } from "@/hooks/user/useCurrentUser";
import { db } from "@/lib/instant/db";

export const Route = createFileRoute("/_authenticated/_app/account")({
  component: function AccountPage() {
    const { t } = useTranslation("account");
    const userQuery = useCurrentUser();
    const navigate = useNavigate();

    const handleSignOut = async () => {
      await db.auth.signOut();
      await navigate({ to: "/login" });
    };

    return (
      <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
        </div>

        <ProfileCard user={userQuery.data} isPending={userQuery.isPending} />
        <SecurityCard
          providers={userQuery.data?.providers}
          isPending={userQuery.isPending}
          onSignOut={handleSignOut}
        />
        <BillingSummaryCard />
        <DangerZoneCard email={userQuery.data?.email} />
      </div>
    );
  },
});
