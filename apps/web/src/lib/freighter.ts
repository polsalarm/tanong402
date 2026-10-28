import { NETWORK_PASSPHRASE, type StellarNetwork } from "@tanong/shared";

/**
 * Thin, lazily loaded wrapper around the Freighter browser extension (@stellar/freighter-api).
 * Nothing here holds or sees a key: Freighter signs inside the extension after the person approves.
 */

type FreighterModule = typeof import("@stellar/freighter-api");
let modPromise: Promise<FreighterModule> | null = null;

export function freighterApi(): Promise<FreighterModule> {
  if (!modPromise) {
    modPromise = import("@stellar/freighter-api").catch((err: unknown) => {
      modPromise = null;
      throw err;
    });
  }
  return modPromise;
}

export type FreighterErrorCode = "not_installed" | "declined" | "locked" | "wrong_network" | "failed";

export class FreighterError extends Error {
  constructor(
    readonly code: FreighterErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "FreighterError";
  }
}

export const FREIGHTER_INSTALL_URL = "https://www.freighter.app/";

/** Freighter's own error object → our error, with copy fit for the connect screen. */
export function freighterFailure(err: { code?: number; message?: string } | undefined, fallback: string): FreighterError {
  const msg = err?.message ?? "";
  if (err?.code === -4 || /reject|declin|denied|cancel/i.test(msg)) {
    return new FreighterError("declined", "You cancelled the request in Freighter.");
  }
  if (/lock/i.test(msg)) return new FreighterError("locked", "Unlock Freighter, then try again.");
  return new FreighterError("failed", msg || fallback);
}

export function networkLabel(network: StellarNetwork): string {
  return network === "stellar:pubnet" ? "Mainnet" : "Testnet";
}

/** Is the extension installed and answering? Resolves false instead of throwing. */
export async function detectFreighter(timeoutMs = 2500): Promise<boolean> {
  try {
    const f = await freighterApi();
    const res = await Promise.race([
      f.isConnected(),
      new Promise<{ isConnected: false }>((r) => setTimeout(() => r({ isConnected: false }), timeoutMs)),
    ]);
    return Boolean(res.isConnected);
  } catch {
    return false;
  }
}

export interface FreighterSession {
  address: string;
  networkPassphrase: string;
  /** Freighter's own label, e.g. "TESTNET". */
  networkName: string;
}

async function readNetwork(f: FreighterModule) {
  const net = await f.getNetwork();
  if (net.error) throw freighterFailure(net.error, "Couldn't read Freighter's network.");
  return net;
}

function checkNetwork(passphrase: string, expected: StellarNetwork): void {
  if (passphrase !== NETWORK_PASSPHRASE[expected]) {
    throw new FreighterError("wrong_network", `Switch Freighter to ${networkLabel(expected)}`);
  }
}

/** Asks Freighter for access (shows its pop-up the first time) and checks the network. */
export async function connectFreighter(expected: StellarNetwork): Promise<FreighterSession> {
  if (!(await detectFreighter())) {
    throw new FreighterError("not_installed", "Freighter isn't installed in this browser.");
  }
  const f = await freighterApi();
  const access = await f.requestAccess();
  if (access.error || !access.address) throw freighterFailure(access.error, "Freighter didn't share an account.");
  const net = await readNetwork(f);
  checkNetwork(net.networkPassphrase, expected);
  return { address: access.address, networkPassphrase: net.networkPassphrase, networkName: net.network };
}

/**
 * Silent re-check (no pop-up): is this site still allowed, which account is selected, which
 * network is Freighter on? Returns null when Freighter is gone or access was revoked.
 */
export async function readFreighterSession(): Promise<FreighterSession | null> {
  try {
    if (!(await detectFreighter(1500))) return null;
    const f = await freighterApi();
    const allowed = await f.isAllowed();
    if (!allowed.isAllowed) return null;
    const addr = await f.getAddress();
    if (addr.error || !addr.address) return null;
    const net = await f.getNetwork();
    if (net.error) return null;
    return { address: addr.address, networkPassphrase: net.networkPassphrase, networkName: net.network };
  } catch {
    return null;
  }
}

export function sessionMatches(session: FreighterSession, expected: StellarNetwork): boolean {
  return session.networkPassphrase === NETWORK_PASSPHRASE[expected];
}

export { checkNetwork as assertFreighterNetwork };
