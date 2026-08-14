import { useMemo } from "react";

import { useClasses } from "@/hooks/classes/useClasses";

export function useOwnedClasses() {
  const query = useClasses();
  const data = useMemo(
    () => (query.data ?? []).filter((cls) => cls.role === "owner"),
    [query.data],
  );
  return { ...query, data };
}
