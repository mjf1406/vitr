import { useEffect } from "react";

import { adminPost } from "@/lib/api/admin";
import { db } from "@/lib/instant/db";

export function BootstrapOnAuth() {
  const { user } = db.useAuth();
  useEffect(() => {
    if (!user) return;
    void adminPost("/api/account/bootstrap").catch(() => undefined);
  }, [user]);
  return null;
}
