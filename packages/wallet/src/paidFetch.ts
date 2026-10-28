import { decodePaymentResponseHeader, wrapFetchWithPayment, x402Client } from "@x402/fetch";
import { createEd25519Signer } from "@x402/stellar";
import { ExactStellarScheme } from "@x402/stellar/exact/client";
import { DEFAULT_RPC_URL, type StellarNetwork, toUnits } from "@tanong/shared";

export interface PaidFetchOptions {
  secret: string;
  network: StellarNetwork;
  /** Only pay this receiving address. Anything else is refused (spend guard). */
  payTo: string;
  /** Hard cap per request, in USDC. */
  maxPriceUsdc: string;
  /** Soroban RPC for building the payment. Required on mainnet; defaults to the public testnet RPC. */
  rpcUrl?: string;
  fetchImpl?: typeof fetch;
}

export interface Settlement {
  success: boolean;
  transaction: string | null;
  network: string | null;
  payer: string | null;
}

export class SpendGuardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SpendGuardError";
  }
}

/**
 * fetch() that pays x402 402-responses automatically with the student's key,
 * but only to our receiving address and only up to `maxPriceUsdc`.
 */
export function createPaidFetch(opts: PaidFetchOptions) {
  const signer = createEd25519Signer(opts.secret, opts.network);
  const maxUnits = toUnits(opts.maxPriceUsdc);

  const client = new x402Client()
    .register(opts.network, new ExactStellarScheme(signer, { url: opts.rpcUrl ?? DEFAULT_RPC_URL[opts.network] }))
    .registerPolicy((_version, reqs) =>
      reqs.filter(
        (r) =>
          r.network === opts.network &&
          r.payTo === opts.payTo &&
          BigInt(r.amount) <= maxUnits,
      ),
    );

  client.onBeforePaymentCreation(async ({ selectedRequirements }) => {
    if (selectedRequirements.payTo !== opts.payTo) {
      return { abort: true as const, reason: "Unexpected payee" };
    }
  });

  const paid = wrapFetchWithPayment(opts.fetchImpl ?? globalThis.fetch.bind(globalThis), client);

  return async function paidFetch(input: RequestInfo | URL, init?: RequestInit) {
    let res: Response;
    try {
      res = await paid(input, init);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/no.*(payment|requirements)|policy|spend/i.test(msg)) throw new SpendGuardError(msg);
      throw err;
    }
    return { response: res, settlement: readSettlement(res) };
  };
}

export function readSettlement(res: Response): Settlement | null {
  const header = res.headers.get("PAYMENT-RESPONSE") ?? res.headers.get("X-PAYMENT-RESPONSE");
  if (!header) return null;
  try {
    const s = decodePaymentResponseHeader(header) as {
      success?: boolean;
      transaction?: string;
      network?: string;
      payer?: string;
    };
    return {
      success: Boolean(s.success),
      transaction: s.transaction || null,
      network: s.network ?? null,
      payer: s.payer ?? null,
    };
  } catch {
    return null;
  }
}
