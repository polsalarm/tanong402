import type { HistoryTurn, Subject } from "@tanong/shared";
import { mockAnswer } from "./mock.js";
import { costUsd } from "./pricing.js";
import { SYSTEM_PROMPT, buildContents, pickRoute, type Route } from "./prompt.js";
import type { Effort, ProviderId, TutorProvider } from "./providers/types.js";

/** One provider in the fallback chain, with the model it uses for each route. */
export interface ProviderSlot {
  provider: TutorProvider;
  models: Record<Route, string>;
}

export interface TutorConfig {
  /** Tried in order; the next one runs only if the previous produced no answer. Empty = canned demo answers. */
  providers: ProviderSlot[];
  /** Whole-question budget across every attempt. */
  timeoutMs?: number;
  /** Cap per attempt, so a hung primary still leaves time for a fallback. */
  attemptTimeoutMs?: number;
  /** Overrides the per-route answer limits (Pro uses one tight cap so its price covers the worst case). */
  limits?: Partial<Record<Route, RouteLimit>>;
}

export interface RouteLimit {
  maxOutputTokens: number;
  effort: Effort;
}

export interface TutorInput {
  question: string;
  subject?: Subject;
  history?: HistoryTurn[];
  /** Student's pick from the model menu. Tried first; the rest of the chain stays as backup. */
  preferred?: ProviderId;
}

/** Puts the preferred provider first, keeping the configured order for the backups. */
export function orderProviders(slots: ProviderSlot[], preferred?: ProviderId): ProviderSlot[] {
  if (!preferred) return slots;
  const first = slots.filter((s) => s.provider.id === preferred);
  return first.length ? [...first, ...slots.filter((s) => s.provider.id !== preferred)] : slots;
}

export interface TutorResult {
  answer: string;
  provider: ProviderId | "demo";
  model: string;
  route: Route;
  hard: boolean;
  tokens: { input: number; output: number };
  /** Null when the model has no entry in the price table. */
  costUsd: number | null;
  latencyMs: number;
  mock: boolean;
}

export class TutorError extends Error {
  constructor(
    message: string,
    override readonly cause?: unknown,
  ) {
    super(message);
    this.name = "TutorError";
  }
}

export const ROUTE_LIMITS: Record<Route, RouteLimit> = {
  quick: { maxOutputTokens: 700, effort: "minimal" },
  default: { maxOutputTokens: 900, effort: "low" },
  hard: { maxOutputTokens: 1400, effort: "medium" },
};

export async function askTutor(cfg: TutorConfig, input: TutorInput): Promise<TutorResult> {
  const started = Date.now();
  const route = pickRoute(input.question, input.subject, input.history);

  if (cfg.providers.length === 0) {
    const answer = mockAnswer(input.question, input.subject);
    return {
      answer,
      provider: "demo",
      model: "demo",
      route,
      hard: route === "hard",
      tokens: { input: Math.ceil(input.question.length / 4), output: Math.ceil(answer.length / 4) },
      costUsd: 0,
      latencyMs: Date.now() - started,
      mock: true,
    };
  }

  const turns = buildContents(input.question, input.subject, input.history).map((t) => ({
    role: t.role === "model" ? ("assistant" as const) : ("user" as const),
    text: t.text,
  }));
  const deadline = started + (cfg.timeoutMs ?? 35_000);
  const failures: { provider: ProviderId; error: unknown }[] = [];

  for (const slot of orderProviders(cfg.providers, input.preferred)) {
    const remaining = deadline - Date.now();
    if (remaining < 1_000) break;
    const model = slot.models[route];
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.min(remaining, cfg.attemptTimeoutMs ?? 20_000));
    try {
      const limit = cfg.limits?.[route] ?? ROUTE_LIMITS[route];
      const res = await slot.provider.answer({ system: SYSTEM_PROMPT, turns, model, ...limit, signal: controller.signal });
      const answer = res.text.trim();
      if (!answer) throw new Error("empty answer");
      return {
        answer,
        provider: slot.provider.id,
        model,
        route,
        hard: route === "hard",
        tokens: { input: res.tokensIn, output: res.tokensOut },
        costUsd: costUsd(model, res.tokensIn, res.tokensOut),
        latencyMs: Date.now() - started,
        mock: false,
      };
    } catch (error) {
      failures.push({ provider: slot.provider.id, error });
    } finally {
      clearTimeout(timer);
    }
  }
  throw new TutorError("Every provider failed", failures);
}

/** Largest prompt we send: system prompt + capped history + a max-length question. */
export const WORST_CASE_INPUT_TOKENS = 3_000;
/** Generous allowance for hidden reasoning tokens on top of the visible answer. */
export const WORST_CASE_THINKING_TOKENS = 1_500;

/** Upper bound on one answer's cost for a model under a limit; null if the model isn't priced. */
export function worstCaseCostUsd(model: string, limit: RouteLimit): number | null {
  return costUsd(model, WORST_CASE_INPUT_TOKENS, limit.maxOutputTokens + WORST_CASE_THINKING_TOKENS);
}
