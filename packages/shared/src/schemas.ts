import { z } from "zod";
import { MAX_HISTORY_TURNS, MAX_QUESTION_CHARS, SUBJECTS } from "./constants.js";

export const stellarAddress = z.string().regex(/^G[A-Z2-7]{55}$/, "Invalid Stellar address");
export const txHash = z.string().regex(/^[a-f0-9]{64}$/i, "Invalid transaction hash");

export const historyTurn = z.object({
  role: z.enum(["student", "tutor"]),
  text: z.string().max(6000),
});
export type HistoryTurn = z.infer<typeof historyTurn>;

export const AI_CHOICES = [
  "auto",
  "openai",
  "anthropic",
  "gemini",
  "groq",
  "pro-auto",
  "pro-openai",
  "pro-anthropic",
  "pro-gemini",
] as const;
export type AiChoice = (typeof AI_CHOICES)[number];
export type AiTier = "standard" | "pro";
export const tierOf = (choice: AiChoice | undefined): AiTier => (choice?.startsWith("pro-") ? "pro" : "standard");

export const askRequest = z.object({
  /** Model menu choice. "auto" (default) uses the server's routing; others are tried first, with backups. */
  model: z.enum(AI_CHOICES).optional(),
  question: z.string().trim().min(1, "Ask something first").max(MAX_QUESTION_CHARS),
  subject: z.enum(SUBJECTS).optional(),
  history: z.array(historyTurn).max(MAX_HISTORY_TURNS * 2).optional(),
});
export type AskRequest = z.infer<typeof askRequest>;

export const askResponse = z.object({
  id: z.string(),
  answer: z.string(),
  model: z.string(),
  priceUsdc: z.string(),
  tokens: z.object({ input: z.number(), output: z.number() }),
  mock: z.boolean().optional(),
});
export type AskResponse = z.infer<typeof askResponse>;

export const priceResponse = z.object({
  priceUsdc: z.string(),
  pricePhp: z.number(),
  phpPerUsd: z.number(),
  asset: z.string(),
  network: z.enum(["stellar:testnet", "stellar:pubnet"]),
  payTo: z.string(),
  /** Pro tier (POST /ask?tier=pro), null when not offered. */
  proPriceUsdc: z.string().nullable().optional(),
  proPricePhp: z.number().nullable().optional(),
});
export type PriceResponse = z.infer<typeof priceResponse>;

export const receipt = z.object({
  id: z.string(),
  question: z.string().nullable(),
  answerPreview: z.string().nullable(),
  subject: z.string().nullable(),
  model: z.string(),
  priceUsdc: z.string(),
  txHash: z.string().nullable(),
  network: z.string(),
  status: z.enum(["answered", "settled", "settle_failed"]),
  latencyMs: z.number().nullable(),
  createdAt: z.string(),
});
export type Receipt = z.infer<typeof receipt>;

export const receiptsResponse = z.object({
  items: z.array(receipt),
  nextCursor: z.string().nullable(),
});
export type ReceiptsResponse = z.infer<typeof receiptsResponse>;

export const statsResponse = z.object({
  network: z.string(),
  students: z.number(),
  paidQuestions: z.number(),
  totalPaidUsdc: z.string(),
  poolBalanceUsdc: z.string().nullable(),
  poolContractId: z.string().nullable(),
  sponsors: z.number(),
  daily: z.array(z.object({ day: z.string(), count: z.number() })),
  latest: z.array(
    z.object({ txHash: z.string(), priceUsdc: z.string(), subject: z.string().nullable(), createdAt: z.string() }),
  ),
});
export type StatsResponse = z.infer<typeof statsResponse>;

export const onboardRequest = z.object({ address: stellarAddress, inviteCode: z.string().trim().toUpperCase().min(4).max(16) });
export const onboardResponse = z.object({ xdr: z.string(), network: z.string() });
export const signedXdrRequest = z.object({ address: stellarAddress, signedXdr: z.string().min(10) });
export const txResponse = z.object({ txHash: z.string(), amountUsdc: z.string().optional() });

export const claimPrepareRequest = z.object({ address: stellarAddress });
export const claimPrepareResponse = z.object({
  xdr: z.string(),
  allowanceUsdc: z.string(),
  nextClaimAt: z.string().nullable(),
});

export const poolStatusResponse = z.object({
  enrolled: z.boolean(),
  allowanceUsdc: z.string(),
  periodSeconds: z.number(),
  nextClaimAt: z.string().nullable(),
  canClaim: z.boolean(),
  totalClaimedUsdc: z.string(),
  poolBalanceUsdc: z.string().nullable(),
  sponsors: z.array(z.object({ name: z.string(), address: z.string().nullable() })),
});
export type PoolStatus = z.infer<typeof poolStatusResponse>;

export const challengeRequest = z.object({ address: stellarAddress });
export const challengeResponse = z.object({ nonce: z.string(), message: z.string() });
export const verifyRequest = z.object({ address: stellarAddress, nonce: z.string(), signature: z.string() });
export const verifyResponse = z.object({ token: z.string(), expiresAt: z.string() });

export const ERROR_CODES = [
  "RATE_LIMITED",
  "INVALID_INPUT",
  "MODEL_ERROR",
  "NOT_ENROLLED",
  "CLAIM_TOO_EARLY",
  "POOL_EMPTY",
  "INVITE_INVALID",
  "UNAUTHORIZED",
  "NOT_CONFIGURED",
  "NOT_FOUND",
  "INTERNAL",
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];
export const apiError = z.object({ error: z.object({ code: z.enum(ERROR_CODES), message: z.string() }) });
export type ApiError = z.infer<typeof apiError>;

/** GET /config — everything the web app needs to boot. No secrets. */
export const configResponse = z.object({
  network: z.enum(["stellar:testnet", "stellar:pubnet"]),
  horizonUrl: z.string(),
  rpcUrl: z.string(),
  payTo: z.string().nullable(),
  priceUsdc: z.string(),
  phpPerUsd: z.number(),
  maxPriceUsdc: z.string(),
  /** false = demo mode: /ask is free and answers are marked as demo. */
  paymentsEnabled: z.boolean(),
  /** false = tutor returns canned demo answers (no GEMINI_API_KEY). */
  tutorLive: z.boolean(),
  poolContractId: z.string().nullable(),
  poolEnabled: z.boolean(),
  usdcAddress: z.string(),
  /** Models the student can pick in the chat, in fallback order. Empty in demo mode. */
  models: z
    .array(
      z.object({
        id: z.enum(AI_CHOICES),
        label: z.string(),
        hint: z.string(),
        tier: z.enum(["standard", "pro"]).default("standard"),
        /** Price of one question with this model, in USDC. Pro is paid via POST /ask?tier=pro. */
        priceUsdc: z.string().optional(),
      }),
    )
    .default([]),
  /** Pro price per question in USDC, or null when no Pro model is configured. */
  proPriceUsdc: z.string().nullable().default(null),
});
export type ClientConfig = z.infer<typeof configResponse>;
