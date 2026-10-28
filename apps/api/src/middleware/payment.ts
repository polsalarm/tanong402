import { HTTPFacilitatorClient } from "@x402/core/server";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { ExactStellarScheme } from "@x402/stellar/exact/server";
import type { RequestHandler } from "express";
import type { Env } from "../config/env.js";
import { logger } from "../lib/logger.js";

export const ASK_ROUTE = "POST /ask";

/** Pro questions are sent to POST /ask?tier=pro and priced from the query, before the body is read. */
export function isProRequest(tierParam: unknown): boolean {
  return tierParam === "pro";
}

export function askRouteConfig(env: Env, proEnabled = false) {
  return {
    [ASK_ROUTE]: {
      accepts: {
        scheme: "exact",
        price: (ctx: { adapter: { getQueryParam?(name: string): string | string[] | undefined } }) =>
          proEnabled && isProRequest(ctx.adapter.getQueryParam?.("tier")) ? `$${env.PRO_PRICE_USDC}` : `$${env.PRICE_USDC}`,
        network: env.network,
        payTo: env.SERVER_STELLAR_ADDRESS!,
        maxTimeoutSeconds: 120,
      },
      description:
        "Tanong402 tutor: one step-by-step answer to one question. English, Filipino or Taglish. Body: {question, subject?, history?, model?}. Add ?tier=pro for Pro models (higher price).",
      mimeType: "application/json",
      serviceName: "Tanong402",
      tags: ["education", "tutor", "ai", "philippines"],
    },
  };
}

/** x402 paywall on POST /ask. Verifies before the handler, settles only after a 2xx response. */
export function createPaymentMiddleware(env: Env, proEnabled = false): RequestHandler {
  const facilitator = new HTTPFacilitatorClient({
    url: env.FACILITATOR_URL,
    createAuthHeaders: env.FACILITATOR_API_KEY
      ? async () => {
          const h = { Authorization: `Bearer ${env.FACILITATOR_API_KEY}` };
          return { verify: h, settle: h, supported: h };
        }
      : undefined,
  });
  const server = new x402ResourceServer(facilitator).register(env.network, new ExactStellarScheme());
  const mw = paymentMiddleware(askRouteConfig(env, proEnabled), server, undefined, undefined, true);
  logger.info({ facilitator: env.FACILITATOR_URL, network: env.network, price: env.PRICE_USDC }, "x402 paywall enabled on /ask");
  return mw as RequestHandler;
}

/** Facilitator reachability + support for our network/scheme. */
export async function checkFacilitator(env: Env): Promise<{ ok: boolean; detail: string }> {
  try {
    const res = await fetch(`${env.FACILITATOR_URL.replace(/\/$/, "")}/supported`, {
      headers: env.FACILITATOR_API_KEY ? { Authorization: `Bearer ${env.FACILITATOR_API_KEY}` } : {},
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { ok: false, detail: `HTTP ${res.status}` };
    const body = (await res.json()) as { kinds?: { scheme: string; network: string }[] };
    const ok = Boolean(body.kinds?.some((k) => k.scheme === "exact" && k.network === env.network));
    return { ok, detail: ok ? "supported" : `no exact/${env.network}` };
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : String(err) };
  }
}
