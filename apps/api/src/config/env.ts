import {
  DEFAULT_HORIZON_URL,
  DEFAULT_PHP_PER_USD,
  DEFAULT_PRICE_USDC,
  DEFAULT_RPC_URL,
  USDC_ADDRESS,
  type StellarNetwork,
} from "@tanong/shared";
import { StrKey } from "@stellar/stellar-sdk";
import { z } from "zod";

const optional = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() !== "" ? v.trim() : undefined));

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3001),
  WEB_ORIGIN: z.string().default("http://localhost:5180"),
  PUBLIC_API_URL: optional,
  TRUST_PROXY: z.string().default("loopback"),

  NETWORK: z.enum(["stellar:testnet", "stellar:pubnet"]).default("stellar:testnet"),
  STELLAR_RPC_URL: optional,
  HORIZON_URL: optional,
  FACILITATOR_URL: z.string().default("https://x402.org/facilitator"),
  FACILITATOR_API_KEY: optional,
  /** "auto" = on when SERVER_STELLAR_ADDRESS is set. */
  PAYMENTS: z.enum(["auto", "on", "off"]).default("auto"),
  SERVER_STELLAR_ADDRESS: optional,
  PRICE_USDC: z.string().default(DEFAULT_PRICE_USDC),
  MAX_PRICE_USDC: z.string().default("0.02"),
  PHP_PER_USD: z.coerce.number().default(DEFAULT_PHP_PER_USD),

  TREASURY_SECRET: optional,
  POOL_ADMIN_SECRET: optional,
  POOL_CONTRACT_ID: optional,

  /** First provider tried; the others in AI_FALLBACKS answer only if it fails. Providers without a key are skipped. */
  AI_PRIMARY: z.enum(["openai", "anthropic", "gemini", "groq"]).default("openai"),
  AI_FALLBACKS: z.string().default("gemini,groq,anthropic"),
  OPENAI_API_KEY: optional,
  OPENAI_MODEL: z.string().default("gpt-5-mini"),
  OPENAI_MODEL_QUICK: z.string().default("gpt-5-nano"),
  OPENAI_MODEL_HARD: z.string().default("gpt-5-mini"),
  ANTHROPIC_API_KEY: optional,
  ANTHROPIC_MODEL: z.string().default("claude-haiku-5-5"),
  ANTHROPIC_MODEL_HARD: z.string().default("claude-haiku-5-5"),
  GEMINI_API_KEY: optional,
  GEMINI_MODEL: z.string().default("gemini-flash-lite-latest"),
  GEMINI_MODEL_HARD: z.string().default("gemini-flash-latest"),
  /** Pro tier: pricier models, paid via POST /ask?tier=pro. On when any provider has a Pro model and key. */
  PRO_PRICE_USDC: z.string().default("0.02"),
  PRO_MAX_OUTPUT_TOKENS: z.coerce.number().default(900),
  OPENAI_MODEL_PRO: z.string().default("gpt-5.4"),
  ANTHROPIC_MODEL_PRO: z.string().default("claude-sonnet-5-5"),
  /** Off by default: Gemini Pro's minimum thinking costs ~$0.019–0.021 on hard questions, at or above a $0.02 Pro price. */
  GEMINI_MODEL_PRO: optional,
  GROQ_API_KEY: optional,
  GROQ_MODEL_QUICK: z.string().default("llama-3.1-8b-instant"),
  GROQ_MODEL: z.string().default("openai/gpt-oss-20b"),
  GROQ_MODEL_HARD: z.string().default("openai/gpt-oss-120b"),

  DATABASE_URL: optional,
  JWT_SECRET: optional,

  RATE_LIMIT_ASK_PER_10MIN: z.coerce.number().default(30),
  MAX_DAILY_QUESTIONS: z.coerce.number().default(5000),
  /** Comma-separated invite codes accepted when no DB-backed invites exist (dev/pilot). */
  INVITE_CODES: optional,
  LOG_LEVEL: z.string().default("info"),
});

export type Env = z.infer<typeof schema> & {
  network: StellarNetwork;
  rpcUrl: string;
  horizonUrl: string;
  usdcAddress: string;
  paymentsEnabled: boolean;
  poolEnabled: boolean;
  onboardingEnabled: boolean;
};

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n  ");
    throw new Error(`Invalid environment:\n  ${issues}`);
  }
  const e = parsed.data;

  if (e.SERVER_STELLAR_ADDRESS && !StrKey.isValidEd25519PublicKey(e.SERVER_STELLAR_ADDRESS)) {
    throw new Error("SERVER_STELLAR_ADDRESS must be a G… public key");
  }
  for (const k of ["TREASURY_SECRET", "POOL_ADMIN_SECRET"] as const) {
    const v = e[k];
    if (v && !StrKey.isValidEd25519SecretSeed(v)) throw new Error(`${k} must be an S… secret seed`);
  }
  if (e.POOL_CONTRACT_ID && !StrKey.isValidContract(e.POOL_CONTRACT_ID)) {
    throw new Error("POOL_CONTRACT_ID must be a C… contract id");
  }
  if (e.PAYMENTS === "on" && !e.SERVER_STELLAR_ADDRESS) {
    throw new Error("PAYMENTS=on requires SERVER_STELLAR_ADDRESS");
  }
  if (e.NODE_ENV === "production" && !e.JWT_SECRET) {
    throw new Error("JWT_SECRET is required in production");
  }

  const network = e.NETWORK;
  const paymentsEnabled = e.PAYMENTS === "on" || (e.PAYMENTS === "auto" && Boolean(e.SERVER_STELLAR_ADDRESS));
  return {
    ...e,
    network,
    rpcUrl: e.STELLAR_RPC_URL ?? DEFAULT_RPC_URL[network],
    horizonUrl: e.HORIZON_URL ?? DEFAULT_HORIZON_URL[network],
    usdcAddress: USDC_ADDRESS[network],
    paymentsEnabled,
    poolEnabled: Boolean(e.POOL_CONTRACT_ID && e.TREASURY_SECRET),
    onboardingEnabled: Boolean(e.TREASURY_SECRET),
  };
}
