import { askResponse, tierOf, toUnits, type AiChoice, type AskRequest, type AskResponse, type ClientConfig } from "@tanong/shared";
import { ApiError, apiUrl, isApiError, readJson, toApiError, transport } from "./api";
import { PIN_MAX_PRICE_USDC, PIN_NETWORK, PIN_RECEIVER } from "./env";
import { loadKit } from "./kit";
import type { Signer } from "./signer";

export type AskPhase = "paying" | "thinking";

export interface PaidReceipt {
  txHash: string | null;
  network: string;
  priceUsdc: string;
  /** Client-measured time from sending the payment to holding the answer. */
  settledMs: number;
}

export interface AskOutcome {
  answer: AskResponse;
  receipt: PaidReceipt | null;
  elapsedMs: number;
}

interface AskOptions {
  config: ClientConfig;
  /** Whoever pays: the built-in key or Freighter. Not needed while payments are off. */
  signer: Signer | null;
  onPhase: (phase: AskPhase) => void;
  signal?: AbortSignal;
}

const ASK_TIMEOUT_MS = 90_000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function minUsdc(...values: (string | null | undefined)[]): string {
  let best: { s: string; u: bigint } | null = null;
  for (const v of values) {
    if (!v) continue;
    let u: bigint;
    try {
      u = toUnits(v);
    } catch {
      continue;
    }
    if (!best || u < best.u) best = { s: v, u };
  }
  if (!best) throw new ApiError("NOT_CONFIGURED", "Price isn't set up yet.");
  return best.s;
}

/** Price of one question for the chosen model: Standard, or the Pro price for "pro-*" models. */
export function priceFor(config: ClientConfig, model?: AiChoice): string {
  if (tierOf(model) === "pro") {
    if (!config.proPriceUsdc) throw new ApiError("NOT_CONFIGURED", "Pro models aren't available right now. You were not charged.");
    return config.proPriceUsdc;
  }
  return config.priceUsdc;
}

/** Pro questions go to /ask?tier=pro so the server prices them before reading the body. */
export function askPath(model?: AiChoice): string {
  return tierOf(model) === "pro" ? "/ask?tier=pro" : "/ask";
}

/**
 * The most the wallet may pay for one question: never more than the price shown on the button,
 * and never more than the server cap or an optional build-time pin. Also checks the payee.
 */
export function spendLimits(config: ClientConfig, model?: AiChoice): { payTo: string; maxPriceUsdc: string } {
  if (!config.payTo) throw new ApiError("NOT_CONFIGURED", "Payments aren't set up yet. You were not charged.");
  if (PIN_RECEIVER && config.payTo !== PIN_RECEIVER) {
    throw new ApiError("UNSAFE_REQUEST", "This app is pointed at the wrong payee, so we stopped. You were not charged.");
  }
  if (PIN_NETWORK && config.network !== PIN_NETWORK) {
    throw new ApiError("UNSAFE_REQUEST", "This app is pointed at the wrong network, so we stopped. You were not charged.");
  }
  return { payTo: config.payTo, maxPriceUsdc: minUsdc(priceFor(config, model), config.maxPriceUsdc, PIN_MAX_PRICE_USDC) };
}

function jsonInit(body: AskRequest, signal: AbortSignal, extra: Record<string, string> = {}): RequestInit {
  return {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json", ...extra },
    body: JSON.stringify(body),
    signal,
  };
}

/**
 * One question. Free when payments are off (demo). Otherwise x402: the wallet answers the 402
 * with a signed payment, the API verifies it, runs the tutor and settles only on success.
 */
export async function performAsk(body: AskRequest, opts: AskOptions): Promise<AskOutcome> {
  const started = performance.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(new DOMException("Request timed out", "TimeoutError")), ASK_TIMEOUT_MS);
  const onAbort = () => ctrl.abort(opts.signal?.reason);
  opts.signal?.addEventListener("abort", onAbort, { once: true });

  let paymentSent = false;
  let paymentSentAt = 0;
  const markPaid = () => {
    if (paymentSent) return;
    paymentSent = true;
    paymentSentAt = performance.now();
    opts.onPhase("thinking");
  };

  try {
    const base = await transport();

    if (!opts.config.paymentsEnabled) {
      opts.onPhase("thinking");
      const res = await base(apiUrl(askPath(body.model)), jsonInit(body, ctrl.signal));
      const answer = await readJson(res, askResponse);
      return { answer, receipt: null, elapsedMs: performance.now() - started };
    }

    const signer = opts.signer;
    if (!signer) throw new ApiError("NO_WALLET", "Set up your account first.");
    const limits = spendLimits(opts.config, body.model);
    opts.onPhase("paying");
    const kit = await loadKit();

    // Check the balance before building a payment, so an empty account gets a clear message
    // instead of a failed payment. Skipped in the mock, and if Horizon can't be reached.
    if (import.meta.env.VITE_MOCK_API !== "true") {
      const bal = await kit
        .getBalances(signer.address, opts.config.horizonUrl, opts.config.network)
        .catch(() => null);
      if (bal && (!bal.hasUsdcTrustline || Number(bal.usdc) < Number(priceFor(opts.config, body.model)))) {
        throw new ApiError(
          "INSUFFICIENT_FUNDS",
          "You're out of questions. Claim your weekly allowance or add credit in Wallet. You were not charged.",
        );
      }
    }

    let res: Response;
    let settlement: ReturnType<typeof kit.readSettlement>;

    if (import.meta.env.VITE_MOCK_API === "true") {
      // The mock has no facilitator, so it skips the 402 round-trip and accepts a stand-in header.
      await sleep(650);
      markPaid();
      const header = btoa(JSON.stringify({ mock: true, payer: signer.address, maxPriceUsdc: limits.maxPriceUsdc }));
      res = await base(apiUrl(askPath(body.model)), jsonInit(body, ctrl.signal, { "PAYMENT-SIGNATURE": header }));
      settlement = kit.readSettlement(res);
    } else {
      const instrumented: typeof fetch = (input, init) => {
        const req = input instanceof Request ? input : new Request(input, init);
        if (req.headers.has("PAYMENT-SIGNATURE") || req.headers.has("X-PAYMENT")) markPaid();
        return base(req);
      };
      const paidFetch = signer.createPaidFetch({
        network: opts.config.network,
        payTo: limits.payTo,
        maxPriceUsdc: limits.maxPriceUsdc,
        usdcAddress: opts.config.usdcAddress,
        rpcUrl: opts.config.rpcUrl,
        fetchImpl: instrumented,
      });
      try {
        const out = await paidFetch(apiUrl(askPath(body.model)), jsonInit(body, ctrl.signal));
        res = out.response;
        settlement = out.settlement;
      } catch (err) {
        if (err instanceof kit.SpendGuardError || err instanceof kit.UnsafeRequestError) {
          throw new ApiError(
            "SPEND_GUARD",
            "The payment request didn't match the price shown, so we stopped before paying. You were not charged.",
          );
        }
        if (err instanceof kit.SignatureDeclinedError) {
          throw new ApiError("DECLINED", "You cancelled the payment. You were not charged.");
        }
        const msg = err instanceof Error ? err.message : String(err);
        if (!paymentSent && /payment payload|payment requirements/i.test(msg)) {
          throw new ApiError("PAYMENT_FAILED", "We couldn't prepare the payment. You were not charged.");
        }
        throw err;
      }
    }

    if (res.status === 402) {
      throw new ApiError("PAYMENT_FAILED", "The payment didn't go through. You were not charged.", 402);
    }
    const answer = await readJson(res, askResponse);
    const now = performance.now();
    return {
      answer,
      receipt: {
        txHash: settlement?.transaction ?? null,
        network: settlement?.network ?? opts.config.network,
        priceUsdc: answer.priceUsdc,
        settledMs: now - (paymentSentAt || started),
      },
      elapsedMs: now - started,
    };
  } catch (err) {
    const reason = ctrl.signal.reason;
    const e = toApiError(reason instanceof DOMException && reason.name === "TimeoutError" ? reason : err);
    if (isApiError(err) && err.code !== "NETWORK" && err.code !== "TIMEOUT") throw err;
    if (paymentSent && (e.code === "NETWORK" || e.code === "TIMEOUT")) {
      throw new ApiError(
        e.code,
        "We lost the connection while your answer was on its way. If it went through, its receipt will be in Receipts.",
        0,
        "unknown",
      );
    }
    if (e.code === "NETWORK") throw new ApiError("NETWORK", "Can't reach Tanong402 right now. You were not charged.");
    if (e.code === "TIMEOUT") throw new ApiError("TIMEOUT", "That took too long. You were not charged.");
    throw e;
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener("abort", onAbort);
  }
}
