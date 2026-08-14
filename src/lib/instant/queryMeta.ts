export function queryMeta(
  query: { isLoading: boolean; error?: { message?: string } | null },
  isAuthLoading: boolean,
) {
  const isPending = isAuthLoading || query.isLoading;
  return {
    isPending,
    isLoading: isPending,
    isError: Boolean(query.error),
    error: query.error ?? null,
    isAuthLoading,
    refetch: () => undefined,
  };
}
