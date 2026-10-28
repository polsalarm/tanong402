import { useCallback, useEffect, useRef, useState } from "react";

interface ResourceState<T> {
  data: T | undefined;
  error: unknown;
  loading: boolean;
  /** Re-run the fetcher. Keeps showing the previous data while it loads. */
  reload: () => void;
}

/**
 * Tiny data hook: runs `fetcher` when `key` changes, optional polling while the tab is visible,
 * aborts stale requests. Pass `key = null` to stay idle.
 */
export function useResource<T>(
  key: string | null,
  fetcher: (signal: AbortSignal) => Promise<T>,
  opts: { pollMs?: number } = {},
): ResourceState<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState<boolean>(key !== null);
  const [tick, setTick] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const keyRef = useRef(key);

  useEffect(() => {
    if (keyRef.current !== key) {
      keyRef.current = key;
      setData(undefined);
    }
    if (key === null) {
      setLoading(false);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    fetcherRef
      .current(ctrl.signal)
      .then((d) => {
        if (ctrl.signal.aborted) return;
        setData(d);
        setError(null);
      })
      .catch((e: unknown) => {
        if (!ctrl.signal.aborted) setError(e);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, [key, tick]);

  useEffect(() => {
    if (!opts.pollMs || key === null) return;
    const id = setInterval(() => {
      if (!document.hidden) setTick((t) => t + 1);
    }, opts.pollMs);
    return () => clearInterval(id);
  }, [opts.pollMs, key]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, loading, reload };
}
