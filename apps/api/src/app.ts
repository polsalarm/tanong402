import {
  anthropicProvider,
  geminiProvider,
  groqProvider,
  openaiProvider,
  worstCaseCostUsd,
  type ProviderSlot,
  type RouteLimit,
  type TutorConfig,
} from "@tanong/tutor";
import cors from "cors";
import express, { type Express, type RequestHandler } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import type { Env } from "./config/env.js";
import { errorHandler, sendError } from "./lib/errors.js";
import { logger } from "./lib/logger.js";
import { WalletAuth } from "./middleware/auth.js";
import { createPaymentMiddleware } from "./middleware/payment.js";
import { accountRouter } from "./routes/account.js";
import { askRouter } from "./routes/ask.js";
import { publicRouter } from "./routes/public.js";
import { StellarService } from "./services/stellar.js";
import { MemoryStore } from "./store/memory.js";
import { NeonStore } from "./store/neon.js";
import type { Store } from "./store/types.js";

export interface AppDeps {
  store?: Store;
  tutor?: TutorConfig;
  /** Pro tier chain; omit to build from env (empty = Pro not offered). */
  tutorPro?: TutorConfig;
  stellar?: StellarService;
  /** Override for tests (e.g. a fake paywall). */
  paymentMiddleware?: RequestHandler;
}

export function createApp(env: Env, deps: AppDeps = {}): Express {
  const store =
    deps.store ??
    (env.DATABASE_URL
      ? new NeonStore(env.DATABASE_URL)
      : new MemoryStore(env.INVITE_CODES?.split(",").map((s) => s.trim()).filter(Boolean) ?? []));
  const tutor: TutorConfig = deps.tutor ?? { providers: providerChain(env) };
  const tutorPro: TutorConfig = deps.tutorPro ?? proConfig(env);
  checkProMargin(env, tutorPro);
  const stellar = deps.stellar ?? new StellarService(env);
  const auth = new WalletAuth(env.JWT_SECRET);

  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", env.TRUST_PROXY);

  const webOrigins = env.WEB_ORIGIN.split(",").map((s) => s.trim());
  // Agents call /ask, /price and discovery from anywhere; everything else is web-only.
  const openCors = cors({ origin: "*", exposedHeaders: ["PAYMENT-RESPONSE", "X-PAYMENT-RESPONSE", "PAYMENT-REQUIRED"] });
  const webCors = cors({ origin: webOrigins, credentials: false, exposedHeaders: ["PAYMENT-RESPONSE", "X-PAYMENT-RESPONSE", "PAYMENT-REQUIRED"] });
  app.use(["/ask", "/price", "/.well-known", "/openapi.json", "/stats", "/config", "/health"], openCors);
  app.use(webCors);

  app.use(helmet());
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === "/health" } }));
  app.use(express.json({ limit: "64kb" }));

  // Rate limits run BEFORE the paywall so a limited request is never charged.
  const askLimiter = rateLimit({
    windowMs: 10 * 60_000,
    limit: env.RATE_LIMIT_ASK_PER_10MIN,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (_req, res) => sendError(res, "RATE_LIMITED", "Slow down a bit. Try again in a few minutes. You were not charged."),
  });
  const accountLimiter = rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: "draft-8", legacyHeaders: false });
  app.use("/ask", askLimiter);
  app.use(["/onboard", "/pool", "/auth"], accountLimiter);

  const tutorLive = tutor.providers.length > 0;
  const proIds = tutorPro.providers.map((p) => p.provider.id);
  app.use(publicRouter(env, store, stellar, tutorLive, tutor.providers.map((p) => p.provider.id), proIds));

  if (env.paymentsEnabled) app.use(deps.paymentMiddleware ?? createPaymentMiddleware(env, proIds.length > 0));
  app.use(askRouter(env, store, tutor, tutorPro));
  app.use(accountRouter(env, store, stellar, auth));

  app.use((_req, res) => sendError(res, "NOT_FOUND", "Not found"));
  app.use(errorHandler);

  logger.info(
    { network: env.network, payments: env.paymentsEnabled, tutorLive, ai: tutor.providers.map((p) => p.provider.id), pro: proIds, store: store.kind, pool: env.poolEnabled, onboarding: env.onboardingEnabled },
    "tanong402 api configured",
  );
  return app;
}

/** AI_PRIMARY first, then AI_FALLBACKS, skipping any provider whose key isn't set. */
function providerChain(env: Env): ProviderSlot[] {
  const slots: Record<string, () => ProviderSlot | null> = {
    openai: () =>
      env.OPENAI_API_KEY
        ? {
            provider: openaiProvider(env.OPENAI_API_KEY),
            models: { quick: env.OPENAI_MODEL_QUICK, default: env.OPENAI_MODEL, hard: env.OPENAI_MODEL_HARD },
          }
        : null,
    anthropic: () =>
      env.ANTHROPIC_API_KEY
        ? {
            provider: anthropicProvider(env.ANTHROPIC_API_KEY),
            models: { quick: env.ANTHROPIC_MODEL, default: env.ANTHROPIC_MODEL, hard: env.ANTHROPIC_MODEL_HARD },
          }
        : null,
    gemini: () =>
      env.GEMINI_API_KEY
        ? {
            provider: geminiProvider(env.GEMINI_API_KEY),
            models: { quick: env.GEMINI_MODEL, default: env.GEMINI_MODEL, hard: env.GEMINI_MODEL_HARD },
          }
        : null,
    groq: () =>
      env.GROQ_API_KEY
        ? {
            provider: groqProvider(env.GROQ_API_KEY),
            models: { quick: env.GROQ_MODEL_QUICK, default: env.GROQ_MODEL, hard: env.GROQ_MODEL_HARD },
          }
        : null,
  };
  const order = [env.AI_PRIMARY, ...env.AI_FALLBACKS.split(",").map((s) => s.trim())];
  return [...new Set(order)].flatMap((id) => slots[id]?.() ?? []);
}

/** Pro uses one capped limit for every route, so the per-question price bounds the cost. */
export function proLimit(env: Env): RouteLimit {
  return { maxOutputTokens: env.PRO_MAX_OUTPUT_TOKENS, effort: "low" };
}

/** Pro chain: same provider order as Standard, using each provider's Pro model. */
function proConfig(env: Env): TutorConfig {
  const pro: Record<string, () => ProviderSlot | null> = {
    openai: () => (env.OPENAI_API_KEY ? { provider: openaiProvider(env.OPENAI_API_KEY), models: one(env.OPENAI_MODEL_PRO) } : null),
    anthropic: () =>
      env.ANTHROPIC_API_KEY ? { provider: anthropicProvider(env.ANTHROPIC_API_KEY), models: one(env.ANTHROPIC_MODEL_PRO) } : null,
    gemini: () =>
      env.GEMINI_API_KEY && env.GEMINI_MODEL_PRO
        ? { provider: geminiProvider(env.GEMINI_API_KEY), models: one(env.GEMINI_MODEL_PRO) }
        : null,
  };
  const order = [env.AI_PRIMARY, ...env.AI_FALLBACKS.split(",").map((s) => s.trim())];
  const providers = [...new Set(order)].flatMap((id) => pro[id]?.() ?? []);
  const limit = proLimit(env);
  return { providers, limits: { quick: limit, default: limit, hard: limit } };
}

function one(model: string): ProviderSlot["models"] {
  return { quick: model, default: model, hard: model };
}

/** Warns at startup when a Pro model's worst-case answer could cost more than the Pro price. */
function checkProMargin(env: Env, pro: TutorConfig) {
  const price = Number(env.PRO_PRICE_USDC);
  const limit = proLimit(env);
  for (const slot of pro.providers) {
    const model = slot.models.default;
    const worst = worstCaseCostUsd(model, limit);
    if (worst === null) logger.warn({ model }, "pro model has no price entry; cost is not tracked");
    else if (worst > price)
      logger.warn(
        { model, worstCaseUsd: Number(worst.toFixed(4)), priceUsd: price },
        "pro worst-case answer can exceed the Pro price; typical answers cost far less (see README)",
      );
  }
}
