import {
  fromUnits,
  type ClientConfig,
  type PriceResponse,
  type StatsResponse,
} from "@tanong/shared";
import { Router } from "express";
import type { Env } from "../config/env.js";
import { ah } from "../lib/errors.js";
import type { StellarService } from "../services/stellar.js";
import type { Store } from "../store/types.js";
import { checkFacilitator } from "../middleware/payment.js";

const MODEL_LABELS: Record<string, { label: string; hint: string }> = {
  openai: { label: "GPT-5 mini", hint: "Careful step-by-step reasoning" },
  gemini: { label: "Gemini Flash", hint: "Fast, great with math and Taglish" },
  groq: { label: "Groq · Llama / GPT-OSS", hint: "Fastest replies" },
  anthropic: { label: "Claude Haiku", hint: "Clear, friendly explanations" },
};

const PRO_LABELS: Record<string, { label: string; hint: string }> = {
  openai: { label: "GPT-5.4", hint: "Strongest reasoning for proofs and code" },
  gemini: { label: "Gemini Pro", hint: "Deep thinking for hard problems" },
  anthropic: { label: "Claude Sonnet", hint: "Detailed, careful explanations" },
};

type Choice = ClientConfig["models"][number];

export function publicRouter(
  env: Env,
  store: Store,
  stellar: StellarService,
  tutorLive: boolean,
  providerIds: string[] = [],
  proIds: string[] = [],
) {
  const standard: Choice[] = providerIds.length
    ? [
        { id: "auto", label: "Auto", hint: "Picks the best model for each question", tier: "standard", priceUsdc: env.PRICE_USDC },
        ...providerIds.flatMap((id): Choice[] => {
          const m = MODEL_LABELS[id];
          return m ? [{ id: id as Choice["id"], ...m, tier: "standard", priceUsdc: env.PRICE_USDC }] : [];
        }),
      ]
    : [];
  const pro: Choice[] = proIds.flatMap((id): Choice[] => {
    const m = PRO_LABELS[id];
    return m ? [{ id: `pro-${id}` as Choice["id"], ...m, tier: "pro", priceUsdc: env.PRO_PRICE_USDC }] : [];
  });
  const models = [...standard, ...pro];
  const proPriceUsdc = pro.length ? env.PRO_PRICE_USDC : null;
  const r = Router();

  // The API has no UI; point people who open it in a browser to the web app.
  r.get("/", (_req, res) => {
    res.json({
      name: "Tanong402 API",
      app: env.WEB_ORIGIN.split(",")[0]?.trim(),
      docs: { health: "/health", price: "/price", discovery: "/.well-known/x402", openapi: "/openapi.json" },
    });
  });

  r.get("/config", (_req, res) => {
    const body: ClientConfig = {
      network: env.network,
      horizonUrl: env.horizonUrl,
      rpcUrl: env.rpcUrl,
      payTo: env.SERVER_STELLAR_ADDRESS ?? null,
      priceUsdc: env.PRICE_USDC,
      phpPerUsd: env.PHP_PER_USD,
      maxPriceUsdc: env.MAX_PRICE_USDC,
      paymentsEnabled: env.paymentsEnabled,
      tutorLive,
      poolContractId: env.POOL_CONTRACT_ID ?? null,
      poolEnabled: env.poolEnabled,
      usdcAddress: env.usdcAddress,
      models,
      proPriceUsdc,
    };
    res.set("Cache-Control", "public, max-age=60").json(body);
  });

  r.get("/price", (_req, res) => {
    const body: PriceResponse = {
      priceUsdc: env.PRICE_USDC,
      pricePhp: Number((Number(env.PRICE_USDC) * env.PHP_PER_USD).toFixed(2)),
      phpPerUsd: env.PHP_PER_USD,
      asset: env.usdcAddress,
      network: env.network,
      payTo: env.SERVER_STELLAR_ADDRESS ?? "",
      proPriceUsdc,
      proPricePhp: proPriceUsdc ? Number((Number(proPriceUsdc) * env.PHP_PER_USD).toFixed(2)) : null,
    };
    res.set("Cache-Control", "public, max-age=60").json(body);
  });

  r.get(
    "/stats",
    ah(async (_req, res) => {
      const s = await store.stats(env.network);
      const poolBalance = env.poolEnabled && env.POOL_CONTRACT_ID ? await stellar.usdcBalanceOf(env.POOL_CONTRACT_ID) : null;
      const body: StatsResponse = {
        network: env.network,
        students: s.students,
        paidQuestions: s.paidQuestions,
        totalPaidUsdc: fromUnits(s.totalPaidUnits),
        poolBalanceUsdc: poolBalance,
        poolContractId: env.POOL_CONTRACT_ID ?? null,
        sponsors: 0,
        daily: s.daily,
        latest: s.latest.map((l) => ({
          txHash: l.txHash,
          priceUsdc: fromUnits(l.priceUnits),
          subject: l.subject,
          createdAt: l.createdAt.toISOString(),
        })),
      };
      res.set("Cache-Control", "public, max-age=15").json(body);
    }),
  );

  r.get(
    "/health",
    ah(async (_req, res) => {
      const [db, facilitator] = await Promise.all([
        store.ping().then(
          () => ({ ok: true, detail: store.kind }),
          (e: unknown) => ({ ok: false, detail: e instanceof Error ? e.message : "db error" }),
        ),
        env.paymentsEnabled ? checkFacilitator(env) : Promise.resolve({ ok: true, detail: "payments off" }),
      ]);
      const ok = db.ok && facilitator.ok;
      res.status(ok ? 200 : 503).json({
        ok,
        network: env.network,
        payments: env.paymentsEnabled,
        tutorLive,
        pool: env.poolEnabled,
        db,
        facilitator,
      });
    }),
  );

  // x402 discovery (https://www.x402scan.com/discovery)
  r.get("/.well-known/x402", (_req, res) => {
    res.json({
      version: 1,
      resources: env.paymentsEnabled ? ["POST /ask"] : [],
      description:
        `Tanong402: pay-per-question AI tutor for Filipino students. POST /ask with JSON {"question": "..."}; ` +
        `costs ${env.PRICE_USDC} USDC on ${env.network} via x402 exact. No API key.`,
    });
  });

  r.get("/openapi.json", (req, res) => {
    const base = env.PUBLIC_API_URL ?? `${req.protocol}://${req.get("host")}`;
    res.json(openapi(env, base));
  });

  return r;
}

function openapi(env: Env, base: string) {
  return {
    openapi: "3.1.0",
    info: {
      title: "Tanong402 API",
      version: "0.1.0",
      description: `Pay-per-question AI tutor. POST /ask is paid with x402 (${env.PRICE_USDC} USDC, ${env.network}).`,
    },
    servers: [{ url: base }],
    paths: {
      "/ask": {
        post: {
          summary: "Ask the tutor one question (x402-paid)",
          "x-x402": { scheme: "exact", network: env.network, price: env.PRICE_USDC, asset: env.usdcAddress },
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["question"],
                  properties: {
                    question: { type: "string", maxLength: 2000 },
                    subject: { type: "string", enum: ["math", "physics", "chemistry", "programming", "filipino", "writing", "general"] },
                    history: {
                      type: "array",
                      items: { type: "object", properties: { role: { enum: ["student", "tutor"] }, text: { type: "string" } } },
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Answer. Settlement details in the PAYMENT-RESPONSE header." },
            "402": { description: "Payment required (x402)" },
          },
        },
      },
      "/price": { get: { summary: "Current price" } },
      "/stats": { get: { summary: "Public usage stats" } },
    },
  };
}
