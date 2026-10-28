import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "react-router";
import { activity } from "../lib/activity";
import { ApiError, api, transport } from "../lib/api";
import { chat } from "../lib/chat";
import { phpValue, questionsLeftFor } from "../lib/format";
import { FreighterError, connectFreighter as askFreighter, readFreighterSession, sessionMatches } from "../lib/freighter";
import { loadKit, type Kit } from "../lib/kit";
import type { Signer, SignerKind } from "../lib/signer";
import { KEYS, readJson, removeKey, writeJson } from "../lib/storage";
import { useConfig } from "./ConfigContext";

type Status = "loading" | "none" | "ready" | "error";
export type WalletKind = SignerKind;

/** Something is off with the Freighter connection; signing is paused until it's fixed. */
export type FreighterIssue = "wrong_network" | "unavailable" | null;

export interface Balance {
  usdc: number;
  exists: boolean;
  hasTrustline: boolean;
  updatedAt: number;
}

interface SignInPref {
  kind: "freighter";
  address: string;
  connectedAt: string;
}

interface WalletValue {
  status: Status;
  kind: WalletKind | null;
  address: string | null;
  createdAt: string | null;
  balance: Balance | null;
  balanceError: boolean;
  balancePhp: number;
  questionsLeft: number;
  /** A built-in account exists on this device (even while Freighter is the active sign-in). */
  hasLocal: boolean;
  freighterIssue: FreighterIssue;
  /** Freighter's sign-in signature isn't accepted by this server yet (receipts fall back to this device). */
  sessionUnsupported: boolean;
  refreshBalance: () => Promise<void>;
  /** Optimistic change shown immediately; reconciled once the network reflects it. */
  nudgeBalance: (deltaUsdc: number) => void;
  /** Creates (or unlocks) the built-in account and makes it the active sign-in. */
  create: () => Promise<string>;
  restore: (backupJson: string, passphrase: string, replace: boolean) => Promise<string>;
  exportBackup: (passphrase: string) => Promise<string>;
  /** Removes the built-in account from this device. */
  forget: () => Promise<void>;
  /** Connects Freighter and makes it the active sign-in. Throws FreighterError. */
  connectFreighter: () => Promise<string>;
  disconnectFreighter: () => Promise<void>;
  /** Re-reads Freighter (network, account) without a pop-up. */
  recheckFreighter: () => Promise<void>;
  /** Runs `fn` with the active signer. Keys never enter React state. */
  withSigner: <T>(fn: (signer: Signer) => Promise<T> | T) => Promise<T>;
  /** Short-lived sign-in token for private reads (receipts), obtained silently when possible. */
  session: () => Promise<string>;
}

const WalletContext = createContext<WalletValue | null>(null);

const POLL_MS = 30_000;
const FREIGHTER_CHECK_MS = 15_000;
const PENDING_WINDOW_MS = 25_000;
const PUBLIC_PATHS = new Set(["/", "/proof", "/developers"]);

const readPref = () => {
  const p = readJson<SignInPref | null>(KEYS.signin, null);
  return p && p.kind === "freighter" && typeof p.address === "string" ? p : null;
};

export function WalletProvider({ children }: { children: ReactNode }) {
  const { config, priceUsdc, phpPerUsd } = useConfig();
  const location = useLocation();
  const [status, setStatus] = useState<Status>("loading");
  const [kind, setKind] = useState<WalletKind | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [balanceError, setBalanceError] = useState(false);
  const [hasLocal, setHasLocal] = useState(false);
  const [freighterIssue, setFreighterIssue] = useState<FreighterIssue>(null);
  const [sessionUnsupported, setSessionUnsupported] = useState(false);

  const signerRef = useRef<Signer | null>(null);
  const fetchedRef = useRef<number | null>(null);
  const pendingRef = useRef<{ delta: number; at: number }[]>([]);
  const sessionRef = useRef<{ token: string; exp: number } | null>(null);
  const sessionInflight = useRef<Promise<string> | null>(null);
  const booted = useRef(false);

  const adopt = useCallback((signer: Signer, since: string | null) => {
    signerRef.current = signer;
    sessionRef.current = null;
    fetchedRef.current = null;
    pendingRef.current = [];
    setKind(signer.kind);
    setAddress(signer.address);
    setCreatedAt(since);
    setBalance(null);
    setBalanceError(false);
    setSessionUnsupported(false);
    setStatus("ready");
    activity.load(signer.address);
    chat.load(signer.address);
  }, []);

  const clearActive = useCallback(() => {
    signerRef.current = null;
    sessionRef.current = null;
    setKind(null);
    setAddress(null);
    setCreatedAt(null);
    setBalance(null);
    setFreighterIssue(null);
    setStatus("none");
    activity.load(null);
    chat.load(null);
  }, []);

  const adoptLocal = useCallback(
    async (kit: Kit) => {
      const w = await kit.unlockWallet();
      setHasLocal(Boolean(w));
      if (w) adopt(kit.createLocalSigner(w.secret, w.address), w.createdAt);
      return w;
    },
    [adopt],
  );

  // Boot: restore the active sign-in. Public pages defer the (large) wallet module until idle.
  // The provider lives for the whole app, so an in-flight unlock is never cancelled.
  useEffect(() => {
    if (booted.current) return;
    const run = async () => {
      if (booted.current) return;
      booted.current = true;
      try {
        const kit = await loadKit();
        const pref = readPref();
        if (pref) {
          const s = await readFreighterSession();
          if (s) {
            if (s.address !== pref.address) writeJson(KEYS.signin, { ...pref, address: s.address });
            setHasLocal(await kit.hasWallet().catch(() => false));
            adopt(kit.createFreighterSigner(s.address), pref.connectedAt);
            return;
          }
          // Freighter is gone or no longer allows this site: fall back to the built-in account.
          removeKey(KEYS.signin);
        }
        const w = await adoptLocal(kit);
        if (!w) clearActive();
      } catch {
        setStatus("error");
      }
    };
    if (!PUBLIC_PATHS.has(location.pathname)) {
      void run();
      return;
    }
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(() => void run(), { timeout: 3000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(() => void run(), 1500);
    return () => clearTimeout(id);
  }, [location.pathname, adopt, adoptLocal, clearActive]);

  const recheckFreighter = useCallback(async () => {
    if (signerRef.current?.kind !== "freighter" || !config) return;
    const s = await readFreighterSession();
    if (!s) {
      setFreighterIssue("unavailable");
      return;
    }
    if (s.address !== signerRef.current.address) {
      const pref = readPref();
      writeJson(KEYS.signin, { kind: "freighter", address: s.address, connectedAt: pref?.connectedAt ?? new Date().toISOString() });
      const kit = await loadKit();
      adopt(kit.createFreighterSigner(s.address), pref?.connectedAt ?? null);
    }
    setFreighterIssue(sessionMatches(s, config.network) ? null : "wrong_network");
  }, [config, adopt]);

  // Freighter can change account or network at any time; re-check quietly.
  useEffect(() => {
    if (kind !== "freighter" || !config) return;
    void recheckFreighter();
    const id = setInterval(() => {
      if (!document.hidden) void recheckFreighter();
    }, FREIGHTER_CHECK_MS);
    const onVisible = () => {
      if (!document.hidden) void recheckFreighter();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [kind, config, recheckFreighter]);

  const refreshBalance = useCallback(async () => {
    if (!address || !config) return;
    try {
      const kit = await loadKit();
      const b = await kit.getBalances(address, config.horizonUrl, config.network, await transport());
      const usdc = Number(b.usdc);
      const prev = fetchedRef.current;
      fetchedRef.current = usdc;
      const now = Date.now();
      let pending = pendingRef.current.filter((p) => now - p.at < PENDING_WINDOW_MS);
      if (prev !== null) {
        let diff = usdc - prev;
        const remaining: typeof pending = [];
        for (const p of pending) {
          const reflected = Math.sign(diff) === Math.sign(p.delta) && Math.abs(diff) + 1e-9 >= Math.abs(p.delta);
          if (reflected) diff -= p.delta;
          else remaining.push(p);
        }
        pending = remaining;
      }
      pendingRef.current = pending;
      const shown = Math.max(0, usdc + pending.reduce((s, p) => s + p.delta, 0));
      setBalance({ usdc: shown, exists: b.exists, hasTrustline: b.hasUsdcTrustline, updatedAt: now });
      setBalanceError(false);
    } catch {
      setBalanceError(true);
    }
  }, [address, config]);

  const nudgeBalance = useCallback(
    (delta: number) => {
      pendingRef.current = [...pendingRef.current, { delta, at: Date.now() }];
      setBalance((b) => (b ? { ...b, usdc: Math.max(0, b.usdc + delta) } : b));
      setTimeout(() => void refreshBalance(), 2500);
      setTimeout(() => void refreshBalance(), 8000);
    },
    [refreshBalance],
  );

  useEffect(() => {
    if (status !== "ready" || !config) return;
    void refreshBalance();
    const id = setInterval(() => {
      if (!document.hidden) void refreshBalance();
    }, POLL_MS);
    const onVisible = () => {
      if (!document.hidden) void refreshBalance();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [status, config, refreshBalance]);

  const create = useCallback(async () => {
    const kit = await loadKit();
    const existing = await kit.unlockWallet();
    const w = existing ?? (await kit.createWallet());
    removeKey(KEYS.signin);
    booted.current = true;
    setHasLocal(true);
    setFreighterIssue(null);
    adopt(kit.createLocalSigner(w.secret, w.address), w.createdAt);
    return w.address;
  }, [adopt]);

  const restore = useCallback(
    async (backupJson: string, passphrase: string, replace: boolean) => {
      const kit = await loadKit();
      await kit.importBackup(backupJson, passphrase, { replace });
      removeKey(KEYS.signin);
      booted.current = true;
      setFreighterIssue(null);
      const w = await adoptLocal(kit);
      if (!w) throw new Error("Restore didn't finish. Try again.");
      return w.address;
    },
    [adoptLocal],
  );

  const exportBackup = useCallback(async (passphrase: string) => {
    const kit = await loadKit();
    return kit.exportBackup(passphrase);
  }, []);

  const forget = useCallback(async () => {
    const kit = await loadKit();
    await kit.forgetWallet();
    setHasLocal(false);
    if (signerRef.current?.kind !== "freighter") clearActive();
  }, [clearActive]);

  const connectFreighter = useCallback(async () => {
    if (!config) throw new FreighterError("failed", "Still loading. Try again in a moment.");
    const s = await askFreighter(config.network);
    const kit = await loadKit();
    const pref: SignInPref = { kind: "freighter", address: s.address, connectedAt: new Date().toISOString() };
    writeJson(KEYS.signin, pref);
    booted.current = true;
    setHasLocal(await kit.hasWallet().catch(() => false));
    setFreighterIssue(null);
    adopt(kit.createFreighterSigner(s.address), pref.connectedAt);
    return s.address;
  }, [config, adopt]);

  const disconnectFreighter = useCallback(async () => {
    removeKey(KEYS.signin);
    setFreighterIssue(null);
    const kit = await loadKit();
    const w = await adoptLocal(kit).catch(() => null);
    if (!w) clearActive();
  }, [adoptLocal, clearActive]);

  const withSigner = useCallback(async <T,>(fn: (signer: Signer) => Promise<T> | T): Promise<T> => {
    const signer = signerRef.current;
    if (!signer) throw new ApiError("NO_WALLET", "Set up your account first.");
    return fn(signer);
  }, []);

  const session = useCallback(async () => {
    const s = sessionRef.current;
    if (s && s.exp - Date.now() > 30_000) return s.token;
    if (sessionInflight.current) return sessionInflight.current;
    const run = (async () => {
      const signer = signerRef.current;
      if (!signer) throw new ApiError("NO_WALLET", "Set up your account first.");
      if (!config) throw new ApiError("NETWORK", "Can't reach Tanong402 right now.");
      const kit = await loadKit();
      const { nonce, message } = await api.challenge(signer.address);
      let signature: string;
      try {
        signature = await kit.signChallenge(signer, nonce, message, config.network);
      } catch (err) {
        if (err instanceof kit.SignatureDeclinedError) throw new ApiError("DECLINED", "Sign-in was cancelled.");
        if (err instanceof kit.UnsafeRequestError) {
          throw new ApiError("UNSAFE_REQUEST", "The sign-in request looked unusual, so we stopped.");
        }
        throw new ApiError("UNAUTHORIZED", err instanceof Error ? err.message : "Couldn't sign in.");
      }
      // Check locally first (raw or Freighter's SEP-53 style) so an unknown wallet format
      // doesn't burn the nonce on a request that must fail.
      if (!kit.verifyMessage(signer.address, message, signature)) {
        setSessionUnsupported(true);
        throw new ApiError("SESSION_UNSUPPORTED", "Full history isn't available for this sign-in yet.");
      }
      const { token, expiresAt } = await api.verify(signer.address, nonce, signature);
      sessionRef.current = { token, exp: new Date(expiresAt).getTime() };
      return token;
    })();
    sessionInflight.current = run;
    try {
      return await run;
    } finally {
      sessionInflight.current = null;
    }
  }, [config]);

  const value = useMemo<WalletValue>(() => {
    const usdc = balance?.usdc ?? 0;
    return {
      status,
      kind,
      address,
      createdAt,
      balance,
      balanceError,
      balancePhp: phpValue(usdc, phpPerUsd),
      questionsLeft: questionsLeftFor(usdc, priceUsdc),
      hasLocal,
      freighterIssue,
      sessionUnsupported,
      refreshBalance,
      nudgeBalance,
      create,
      restore,
      exportBackup,
      forget,
      connectFreighter,
      disconnectFreighter,
      recheckFreighter,
      withSigner,
      session,
    };
  }, [
    status,
    kind,
    address,
    createdAt,
    balance,
    balanceError,
    phpPerUsd,
    priceUsdc,
    hasLocal,
    freighterIssue,
    sessionUnsupported,
    refreshBalance,
    nudgeBalance,
    create,
    restore,
    exportBackup,
    forget,
    connectFreighter,
    disconnectFreighter,
    recheckFreighter,
    withSigner,
    session,
  ]);

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside WalletProvider");
  return ctx;
}
