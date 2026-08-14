import { useCallback, useRef, useState } from "react";

type AsyncAction<TVariables, TResult> = {
  mutate: (variables?: TVariables) => void;
  mutateAsync: (variables?: TVariables) => Promise<TResult>;
  isPending: boolean;
  error: Error | null;
};

export function useAsyncAction<TVariables, TResult>(
  mutationFn: (variables: TVariables) => Promise<TResult>,
  options?: {
    onError?: (error: Error, variables: TVariables) => void;
    onSuccess?: (data: TResult, variables: TVariables) => void;
  },
): AsyncAction<TVariables, TResult> {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const fnRef = useRef(mutationFn);
  fnRef.current = mutationFn;

  const mutateAsync = useCallback(async (variables?: TVariables) => {
    setIsPending(true);
    setError(null);
    try {
      const result = await fnRef.current(variables as TVariables);
      optionsRef.current?.onSuccess?.(result, variables as TVariables);
      return result;
    } catch (caught) {
      const next = caught instanceof Error ? caught : new Error("Request failed");
      setError(next);
      optionsRef.current?.onError?.(next, variables as TVariables);
      throw next;
    } finally {
      setIsPending(false);
    }
  }, []);

  const mutate = useCallback(
    (variables?: TVariables) => {
      void mutateAsync(variables).catch(() => undefined);
    },
    [mutateAsync],
  );

  return { mutate, mutateAsync, isPending, error };
}
