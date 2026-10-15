import { useCallback, useEffect, useState } from 'react';
import { getErrorMessage, isSessionExpired } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Runs `loader` whenever `deps` change. Ignores out-of-date responses, keeps
 * the previous data while reloading, and signs the user out if the session
 * has expired.
 */
export function useAsyncData<T>(loader: () => Promise<T>, deps: readonly unknown[]) {
  const [state, setState] = useState<AsyncState<T>>({ data: null, loading: true, error: null });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    loader()
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (isSessionExpired(error)) void supabase.auth.signOut();
        setState((s) => ({ data: s.data, loading: false, error: getErrorMessage(error) }));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}
