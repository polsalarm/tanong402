import { decodePaymentResponseHeader } from "@x402/core/http";
import { askRequest, tierOf, toUnits, type AskResponse } from "@tanong/shared";
import { TutorError, askTutor, type ProviderId, type TutorConfig } from "@tanong/tutor";
import { isProRequest } from "../middleware/payment.js";
import { Router } from "express";
import { randomUUID } from "node:crypto";
import type { Env } from "../config/env.js";
import { ApiError, ah } from "../lib/errors.js";
import { logger } from "../lib/logger.js";
import type { Store } from "../store/types.js";

/**
 * POST /ask. When payments are on, the x402 middleware runs first: it verifies the payment,
 * lets this handler run, and settles only if we return 2xx. We record the question after the
 * response finishes, once the settlement header (tx hash + payer) is known.
 */
export function askRouter(env: Env, store: Store, tutor: TutorConfig, tutorPro: TutorConfig = { providers: [] }) {
  const r = Router();
  const standardUnits = toUnits(env.PRICE_USDC);
  const proUnits = toUnits(env.PRO_PRICE_USDC);
  const proEnabled = tutorPro.providers.length > 0;

  r.post(
    "/ask",
    ah(async (req, res) => {
      const body = askRequest.parse(req.body);

      // The paywall priced this request from ?tier=…, so the model must match the tier that was paid.
      // Rejecting here (before answering) means a mismatched payment is never settled.
      const paidTier = isProRequest(req.query.tier) ? "pro" : "standard";
      const wantTier = tierOf(body.model);
      if (paidTier === "pro" && !proEnabled) throw new ApiError("INVALID_INPUT", "Pro models aren't available. You were not charged.");
      if (wantTier === "pro" && paidTier !== "pro") {
        throw new ApiError("INVALID_INPUT", "Pro models must be asked via /ask?tier=pro. You were not charged.");
      }
      const tier = paidTier;
      const chain = tier === "pro" ? tutorPro : tutor;
      const pick = body.model?.replace(/^pro-/, "");
      const preferred = pick && pick !== "auto" ? (pick as ProviderId) : undefined;
      const priceUnits = tier === "pro" ? proUnits : standardUnits;

      const since = new Date();
      since.setUTCHours(0, 0, 0, 0);
      if ((await store.countQuestionsSince(since)) >= env.MAX_DAILY_QUESTIONS) {
        throw new ApiError("RATE_LIMITED", "Daily capacity reached. Try again tomorrow. You were not charged.");
      }

      let result;
      try {
        result = await askTutor(chain, { ...body, preferred });
      } catch (err) {
        // Provider errors can echo request details, so log only who failed and why.
        const failures =
          err instanceof TutorError && Array.isArray(err.cause)
            ? (err.cause as { provider: string; error: unknown }[]).map((f) => ({
                provider: f.provider,
                reason: f.error instanceof Error ? f.error.message.slice(0, 200) : String(f.error),
              }))
            : [{ reason: err instanceof Error ? err.message : String(err) }];
        logger.error({ failures }, "tutor failed");
        throw new ApiError("MODEL_ERROR", "The tutor couldn't answer right now. You were not charged.");
      }

      const id = randomUUID();
      res.on("finish", () => {
        const header = res.getHeader("PAYMENT-RESPONSE") ?? res.getHeader("X-PAYMENT-RESPONSE");
        let txHash: string | null = null;
        let payer: string | null = null;
        let settledOk = false;
        if (header) {
          try {
            const s = decodePaymentResponseHeader(String(header)) as { success?: boolean; transaction?: string; payer?: string };
            settledOk = Boolean(s.success && s.transaction);
            txHash = s.transaction || null;
            payer = s.payer ?? null;
          } catch {
            /* ignore malformed header */
          }
        }
        const status = !env.paymentsEnabled ? "answered" : settledOk && res.statusCode < 400 ? "settled" : "settle_failed";
        void (async () => {
          if (payer) await store.upsertWallet({ address: payer, kind: "agent" });
          await store.insertQuestion({
            id,
            payer,
            question: body.question,
            answer: result.answer,
            subject: body.subject ?? null,
            provider: result.provider,
            model: result.model,
            route: result.route,
            costUsd: result.costUsd,
            tokensIn: result.tokens.input,
            tokensOut: result.tokens.output,
            latencyMs: result.latencyMs,
            priceUnits: env.paymentsEnabled ? priceUnits : 0n,
            asset: env.usdcAddress,
            network: env.network,
            status,
            txHash,
          });
          logger.info({ id, status, txHash, provider: result.provider, model: result.model, route: result.route, costUsd: result.costUsd, ms: result.latencyMs }, "question");
        })().catch((err) => logger.error({ err }, "failed to record question"));
      });

      const out: AskResponse = {
        id,
        answer: result.answer,
        model: result.model,
        priceUsdc: env.paymentsEnabled ? (tier === "pro" ? env.PRO_PRICE_USDC : env.PRICE_USDC) : "0",
        tokens: result.tokens,
        ...(result.mock ? { mock: true } : {}),
      };
      res.json(out);
    }),
  );

  return r;
}
