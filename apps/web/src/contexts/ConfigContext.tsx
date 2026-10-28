import { DEFAULT_PHP_PER_USD, DEFAULT_PRICE_USDC, type ClientConfig } from "@tanong/shared";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api, toApiError, type ApiError } from "../lib/api";
import { php } from "../lib/format";

type Status = "loading" | "ready" | "error";

interface ConfigValue {
  status: Status;
  config: ClientConfig | null;
  error: ApiError | null;
  /** Seconds until the next automatic retry while the API is unreachable. */
  retryIn: number | null;
  retry: () => void;
  /** Re-fetch quietly (e.g. after a price mismatch). */
  refresh: () => Promise<void>;
  priceUsdc: string;
  phpPerUsd: number;
  /** Price per question as shown to students, e.g. "₱0.30". */
  pricePhp: string;
  /** Payments are off: questions are free and marked as demo. */
  demo: boolean;
  online: boolean;
}

const ConfigContext = createContext<ConfigValue | null>(null);

const BACKOFF_S = [2, 4, 8, 15, 30];
const REFRESH_MS = 5 * 60_000;

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<ClientConfig | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<ApiError | null>(null);
  const [retryIn, setRetryIn] = useState<number | null>(null);
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  const attempt = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const load = useCallback(async (quiet = false) => {
    clearInterval(timer.current);
    setRetryIn(null);
    if (!quiet) setStatus((s) => (s === "ready" ? s : "loading"));
    try {
      const cfg = await api.config();
      attempt.current = 0;
      setConfig(cfg);
      setError(null);
      setStatus("ready");
    } catch (err) {
      const e = toApiError(err);
      setError(e);
      setStatus((s) => (s === "ready" ? s : "error"));
      // Keep trying in the background with a gentle backoff.
      let left = BACKOFF_S[Math.min(attempt.current, BACKOFF_S.length - 1)] ?? 30;
      attempt.current += 1;
      setRetryIn(left);
      timer.current = setInterval(() => {
        left -= 1;
        if (left <= 0) {
          clearInterval(timer.current);
          void load(true);
        } else {
          setRetryIn(left);
        }
      }, 1000);
    }
  }, []);

  useEffect(() => {
    void load();
    return () => clearInterval(timer.current);
  }, [load]);

  useEffect(() => {
    const id = setInterval(() => {
      if (!document.hidden) void load(true);
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    const up = () => {
      setOnline(true);
      void load(true);
    };
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, [load]);

  const value = useMemo<ConfigValue>(() => {
    const priceUsdc = config?.priceUsdc ?? DEFAULT_PRICE_USDC;
    const phpPerUsd = config?.phpPerUsd ?? DEFAULT_PHP_PER_USD;
    return {
      status,
      config,
      error,
      retryIn,
      retry: () => {
        attempt.current = 0;
        void load();
      },
      refresh: () => load(true),
      priceUsdc,
      phpPerUsd,
      pricePhp: php(priceUsdc, phpPerUsd),
      demo: config ? !config.paymentsEnabled : false,
      online,
    };
  }, [config, status, error, retryIn, load, online]);

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}

export function useConfig(): ConfigValue {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error("useConfig must be used inside ConfigProvider");
  return ctx;
}
