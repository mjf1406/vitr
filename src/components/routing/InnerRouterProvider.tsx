import { useEffect } from "react";
import { RouterProvider, type AnyRouter } from "@tanstack/react-router";

import { db } from "@/lib/instant/db";

export function InnerRouterProvider({ router }: { router: AnyRouter }) {
  const { isLoading, user } = db.useAuth();
  const auth = {
    isAuthenticated: Boolean(user),
    isLoading,
  };

  useEffect(() => {
    void router.invalidate();
  }, [auth.isAuthenticated, auth.isLoading, router]);

  return <RouterProvider router={router} context={{ auth }} />;
}
