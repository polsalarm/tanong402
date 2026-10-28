/**
 * One interface for whatever signs on the student's behalf:
 *  - "local": the built-in key, encrypted on this device (packages/wallet)
 *  - "freighter": the Freighter browser extension; the key never leaves it
 *
 * Callers never use these methods directly for server-prepared payloads: they go through
 * lib/signing.ts, which inspects first. Lives in the lazily loaded kit chunk.
 */
import { authorizeEntry, Address, xdr } from "@stellar/stellar-sdk";
import { NETWORK_PASSPHRASE, toUnits, type StellarNetwork } from "@tanong/shared";
import {
  createPaidFetch,
  fromBase64,
  readSettlement,
  signAuthEntries,
  signMessage,
  signTransactionXdr,
  SpendGuardError,
  toBase64,
  type Settlement,
} from "@tanong/wallet";
import { wrapFetchWithPayment, x402Client } from "@x402/fetch";
import type { ClientStellarSigner } from "@x402/stellar";
import { ExactStellarScheme } from "@x402/stellar/exact/client";
import { assertFreighterNetwork, freighterApi, freighterFailure } from "./freighter";
import { addressCredentials, inspectPaymentPreimage } from "./signing";

export type SignerKind = "local" | "freighter";

export interface PaidFetchOptions {
  network: StellarNetwork;
  payTo: string;
  maxPriceUsdc: string;
  /** USDC contract (SAC) address the payment must use. */
  usdcAddress: string;
  rpcUrl: string;
  fetchImpl: typeof fetch;
}

export type PaidFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<{ response: Response; settlement: Settlement | null }>;

export interface Signer {
  readonly kind: SignerKind;
  readonly address: string;
  /** Returns the signed envelope (base64 XDR). */
  signTransaction(xdrB64: string, network: StellarNetwork): Promise<string>;
  /** Signs the Soroban auth entries that belong to this address; others pass through untouched. */
  signAuthEntries(entries: string[], validUntilLedger: number, network: StellarNetwork): Promise<string[]>;
  /** Base64 ed25519 signature for the sign-in challenge. */
  signMessage(message: string, network: StellarNetwork): Promise<string>;
  /** fetch() that answers x402 402s by paying, behind the spend guard. */
  createPaidFetch(opts: PaidFetchOptions): PaidFetch;
}

/** The person said no in the signing pop-up. Nothing was signed. */
export class SignatureDeclinedError extends Error {
  constructor(message = "You cancelled the request.") {
    super(message);
    this.name = "SignatureDeclinedError";
  }
}

// ─── local key ────────────────────────────────────────────────────────────────

/** The secret lives only inside this closure; it never enters React state. */
export function createLocalSigner(secret: string, address: string): Signer {
  return {
    kind: "local",
    address,
    signTransaction: async (xdrB64, network) => signTransactionXdr(secret, xdrB64, network),
    signAuthEntries: (entries, validUntilLedger, network) => signAuthEntries(secret, entries, validUntilLedger, network),
    signMessage: async (message) => signMessage(secret, message),
    createPaidFetch: (o) =>
      createPaidFetch({
        secret,
        network: o.network,
        payTo: o.payTo,
        maxPriceUsdc: o.maxPriceUsdc,
        rpcUrl: o.rpcUrl,
        fetchImpl: o.fetchImpl,
      }),
  };
}

// ─── Freighter ────────────────────────────────────────────────────────────────

function declinedOr(err: { code?: number; message?: string } | undefined, fallback: string): Error {
  const e = freighterFailure(err, fallback);
  return e.code === "declined" ? new SignatureDeclinedError() : e;
}

async function ensureFreighterReady(address: string, network: StellarNetwork) {
  const f = await freighterApi();
  const net = await f.getNetwork();
  if (net.error) throw declinedOr(net.error, "Freighter isn't responding.");
  assertFreighterNetwork(net.networkPassphrase, network);
  const current = await f.getAddress();
  if (current.address && current.address !== address) {
    throw new Error("Freighter switched to a different account. Reconnect in Settings.");
  }
  return f;
}

export function createFreighterSigner(address: string): Signer {
  const signer: Signer = {
    kind: "freighter",
    address,

    async signTransaction(xdrB64, network) {
      const f = await ensureFreighterReady(address, network);
      const res = await f.signTransaction(xdrB64, { networkPassphrase: NETWORK_PASSPHRASE[network], address });
      if (res.error || !res.signedTxXdr) throw declinedOr(res.error, "Freighter didn't sign the transaction.");
      return res.signedTxXdr;
    },

    async signAuthEntries(entries, validUntilLedger, network) {
      const f = await ensureFreighterReady(address, network);
      const passphrase = NETWORK_PASSPHRASE[network];
      const out: string[] = [];
      for (const b64 of entries) {
        const entry = xdr.SorobanAuthorizationEntry.fromXDR(b64, "base64");
        const creds = addressCredentials(entry);
        if (!creds || Address.fromScAddress(creds.address).toString() !== address) {
          out.push(b64);
          continue;
        }
        const signed = await authorizeEntry(
          entry,
          async (preimage) => {
            const res = await f.signAuthEntry(preimage.toXDR("base64"), { networkPassphrase: passphrase, address });
            if (res.error || !res.signedAuthEntry) throw declinedOr(res.error, "Freighter didn't approve the claim.");
            return fromBase64(res.signedAuthEntry);
          },
          validUntilLedger,
          passphrase,
        );
        out.push(signed.toXDR("base64"));
      }
      return out;
    },

    async signMessage(message, network) {
      const f = await ensureFreighterReady(address, network);
      const res = await f.signMessage(message, { networkPassphrase: NETWORK_PASSPHRASE[network], address });
      if (res.error || !res.signedMessage) throw declinedOr(res.error, "Freighter didn't sign in.");
      const sig = res.signedMessage;
      return typeof sig === "string" ? sig : toBase64(new Uint8Array(sig));
    },

    createPaidFetch(o) {
      const maxUnits = toUnits(o.maxPriceUsdc);
      const passphrase = NETWORK_PASSPHRASE[o.network];
      // x402 wraps errors thrown inside signing, so remember why we stopped.
      const outcome: PaidOutcome = { guard: null, declined: false };
      // SEP-43 shape the x402 Stellar client accepts. Each payment preimage is inspected before
      // Freighter sees it: USDC transfer, this payer → our payee, never above the price shown.
      const x402Signer: ClientStellarSigner = {
        address,
        signAuthEntry: (async (preimageB64: string) => {
          try {
            inspectPaymentPreimage(preimageB64, {
              payer: address,
              payTo: o.payTo,
              asset: o.usdcAddress,
              maxUnits,
              network: o.network,
            });
          } catch (err) {
            outcome.guard = err instanceof Error ? err : new Error(String(err));
            throw err;
          }
          const f = await ensureFreighterReady(address, o.network);
          const res = await f.signAuthEntry(preimageB64, { networkPassphrase: passphrase, address });
          if (res.error || !res.signedAuthEntry) {
            const e = declinedOr(res.error, "Freighter didn't approve the payment.");
            if (e instanceof SignatureDeclinedError) outcome.declined = true;
            throw e;
          }
          return { signedAuthEntry: res.signedAuthEntry, signerAddress: res.signerAddress || address };
        }) as ClientStellarSigner["signAuthEntry"],
      };
      return createSignerPaidFetch(x402Signer, o, maxUnits, outcome);
    },
  };
  return signer;
}

/**
 * Same spend guard as packages/wallet's createPaidFetch (only our payee, only this network,
 * never above the cap), for any SEP-43 signer instead of a raw secret.
 */
interface PaidOutcome {
  guard: Error | null;
  declined: boolean;
}

function createSignerPaidFetch(
  signer: ClientStellarSigner,
  o: PaidFetchOptions,
  maxUnits: bigint,
  outcome: PaidOutcome,
): PaidFetch {
  const client = new x402Client()
    .register(o.network, new ExactStellarScheme(signer, { url: o.rpcUrl }))
    .registerPolicy((_version, reqs) =>
      reqs.filter((r) => r.network === o.network && r.payTo === o.payTo && BigInt(r.amount) <= maxUnits),
    );
  client.onBeforePaymentCreation(async ({ selectedRequirements }) => {
    if (selectedRequirements.payTo !== o.payTo) return { abort: true as const, reason: "Unexpected payee" };
  });
  const paid = wrapFetchWithPayment(o.fetchImpl, client);

  return async (input, init) => {
    let res: Response;
    try {
      res = await paid(input, init);
    } catch (err) {
      if (outcome.guard) throw new SpendGuardError(outcome.guard.message);
      if (outcome.declined || err instanceof SignatureDeclinedError) throw new SignatureDeclinedError();
      const msg = err instanceof Error ? err.message : String(err);
      if (/reject|declin|cancel/i.test(msg)) throw new SignatureDeclinedError();
      if (/no.*(payment|requirements)|policy|spend/i.test(msg)) throw new SpendGuardError(msg);
      throw err;
    }
    return { response: res, settlement: readSettlement(res) };
  };
}
