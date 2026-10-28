# Tanong402 — AI integration and pricing plan

Status: **built** (October 29, 2026): providers, router, fallbacks and cost logging are in `packages/tutor`. Not yet run against a live key.

If approved, this changes locked decision #9 in `docs/BUILD_PLAN.md` ("Gemini Flash Lite default, Flash for hard questions") to the multi-provider setup below.

---

## 1. TL;DR

- **Use your GPT credits first.** Make OpenAI the main tutor: `gpt-5-mini` for normal questions and `gpt-5-nano` for very short ones.
- **Keep Gemini and add Claude as backups.** If the main provider fails, the next one answers. The student is never charged twice, and never charged if every provider fails.
- **The price stays ₱0.30 a question** (0.005 USDC). With `gpt-5-mini`, a typical question costs us about **₱0.07** in AI, so roughly **75% stays as margin** before hosting.
- **Don't use big models by default.** `claude-sonnet-5-5`, `claude-opus-5-5` and full `gpt-5` cost more per question than we charge. They only make sense as a paid "Deep" tier (section 7).

---

## 2. What we can plug in

All prices are USD per 1M tokens (input / output), standard tier. They were collected October 2026 from provider pages and price trackers. **Re-check the official pages before mainnet** (links in section 12), because prices move often.

### OpenAI (you have credits)
| Model | Input | Output | Notes |
|---|---|---|---|
| `gpt-5-nano` | $0.05 | $0.40 | Cheapest. Fine for definitions, short explanations, translation |
| `gpt-5-mini` | $0.25 | $2.00 | **Recommended default.** Good at step-by-step math and code |
| `gpt-5.4-nano` | $0.20 | $1.25 | Newer nano. Test against `gpt-5-mini` |
| `gpt-5.4-mini` | $0.75 | $4.50 | "Hard question" option |
| `gpt-5` | $1.25 | $10.00 | Too expensive per question at ₱0.30 |

The GPT-5 models are reasoning models. Their hidden "thinking" tokens are **billed as output**, so we set `reasoning.effort` to `minimal` or `low` and cap output tokens. Cached input is about 10× cheaper, and the Batch API is 50% off, but Batch is useless here because students want answers now.

> **Check which credits you have.** A ChatGPT Plus or Pro subscription does **not** include API credits. You need credits on **platform.openai.com** (Billing → Credits) and an API key from there.

### Google Gemini (already wired in)
| Model | Input | Output | Notes |
|---|---|---|---|
| `gemini-2.5-flash-lite` | $0.10 | $0.40 | Very cheap. Older generation |
| `gemini-3.1-flash-lite` | $0.25 | $1.50 | Current cheap tier |
| Gemini 3.6–3.8 Flash | $0.75 | $3.75 | Introductory price until Dec 31, 2026. Reported to double on Jan 1, 2027 |
| `gemini-3.5-flash` | $1.50 | $9.00 | Too expensive for the default |

Gemini has a **free tier** with rate limits, which is useful for development and the demo.

### Anthropic Claude
| Model | ID | Input | Output | Notes |
|---|---|---|---|---|
| Claude Haiku 5.5 | `claude-haiku-5-5` | $0.10 | $0.50 | Cheap and strong. Good backup. Thinking is on by default, so set effort to `low` |
| Claude Sonnet 5.5 | `claude-sonnet-5-5` | $2.00 | $10.00 | Costs more than ₱0.30 per question |
| Claude Opus 5.5 | `claude-opus-5-5` | $4.00 | $20.00 | Only for a premium "Deep" tier |

### Other options (not recommended now)
- **OpenRouter:** one API key for every provider. Handy, but it adds a middleman fee and another place that sees student questions.
- **Self-hosted open models** (Llama, Qwen via Groq or Together): cheap, but weaker at Taglish and math explanations. Revisit only if volume gets big.

---

## 3. How much one question costs us

**A typical question:**
- **Input, about 1,000 tokens:** the system prompt (~600 tokens), the question, and the last few turns of history.
- **Output, about 500 tokens:** a ~250-word answer plus a little reasoning.
- **Hard question** (code, multi-step math): about 1,500 tokens in and 1,200 out.

At 58 PHP per USD, ₱0.30 = **$0.005** (what we charge).

| Model | Cost, typical Q | Cost, hard Q | % of ₱0.30 (typical) |
|---|---|---|---|
| `gpt-5-nano` | $0.00025 (₱0.015) | $0.00056 | 5% |
| `gemini-2.5-flash-lite` | $0.00030 (₱0.017) | $0.00063 | 6% |
| `claude-haiku-5-5` | $0.00035 (₱0.020) | $0.00075 | 7% |
| `gemini-3.1-flash-lite` | $0.00100 (₱0.058) | $0.00218 | 20% |
| **`gpt-5-mini`** | **$0.00125 (₱0.073)** | **$0.00278** | **25%** |
| Gemini 3.x Flash (intro) | $0.00263 (₱0.15) | $0.00563 | 53% |
| `gpt-5.4-mini` | $0.00300 (₱0.17) | $0.00653 | 60% |
| `claude-sonnet-5-5` | $0.00700 (₱0.41) | $0.0150 | **140% (loses money)** |
| `claude-opus-5-5` | $0.0140 (₱0.81) | $0.0300 | **280% (loses money)** |

**Takeaway:** anything up to `gpt-5-mini` leaves plenty of margin. A "hard question" model that costs half the price is fine for 10–20% of traffic.

---

## 4. How pricing works end to end

```
Sponsor ──fund──▶ Scholarship Pool (contract) ──₱15/week──▶ Student balance
Student ──₱0.30 per question (x402)──▶ Tanong402 receiver ──▶ pays AI + hosting
AI agent / Freighter user ──₱0.30 per question (x402, own money)──▶ same receiver
```

1. **Price per question:** ₱0.30 = 0.005 USDC, set by `PRICE_USDC` in `apps/api/.env`. Students only ever see ₱ and "questions left".
2. **How it's paid:** standard x402 `exact` payment in USDC on Stellar. The facilitator pays the network fee, so the student pays exactly ₱0.30.
3. **Only charged on success:** the payment settles **after** the tutor answers. If the AI fails, the student sees "You were not charged". This is already built and tested.
4. **Where students' money comes from:** the Scholarship Pool gives each enrolled student **₱15 a week** (0.25 USDC), about 50 questions. Sponsors (schools, alumni, orgs) fund the pool.
5. **Spend guard:** the wallet refuses to pay more than `MAX_PRICE_USDC` (0.02) or to pay anyone except our receiver.

**Our costs per student per week** (about 50 questions, all from the allowance):

| Item | Cost |
|---|---|
| AI with `gpt-5-mini` (80% typical, 20% hard) | ~$0.078 (₱4.50) |
| Network fees | $0 to us (facilitator pays) |
| Account setup (one time, not weekly) | ~1.5 XLM reserve locked per student. Returnable if the account is closed |
| Hosting (Render + Vercel + Neon) | Fixed monthly cost, small per student at pilot scale |

**What comes in:** $0.25 a week per active student (₱15), funded by sponsors.
**Gross margin on AI:** about **69%** in the worst case where students use the whole allowance.

**Pilot example:** 200 students × 50 questions = 10,000 questions a week.
- AI cost: ~$16 a week on `gpt-5-mini`, ~$3 on `gpt-5-nano`.
- Sponsor money needed: $50 a week (₱2,900).

---

## 5. Recommended setup (the "router")

| Route | When | Model | Max output | Effort |
|---|---|---|---|---|
| **Quick** | Short or simple questions (definitions, translation, "what is…") | `gpt-5-nano` | 600 | minimal |
| **Default** | Everything else | `gpt-5-mini` | 800 | low |
| **Hard** | Code, multi-step math or physics, long problem sets (existing `isHardQuestion()`) | `gpt-5-mini` at medium effort, or `gpt-5.4-mini` | 1,200 | medium |
| **Fallback 1** | Primary errors, times out or is rate-limited | `claude-haiku-5-5` | same | low |
| **Fallback 2** | Fallback 1 fails too | `gemini-3.1-flash-lite` | same | — |
| **Demo** | No API keys set | Canned answers (existing) | — | — |

**Rules:**
- The student pays one price no matter which route answers. Routing is our cost problem, not theirs.
- A fallback only runs if the earlier attempt produced **no answer**, so we never pay twice for one shown answer.
- If every provider fails → `MODEL_ERROR` → the payment doesn't settle → "You were not charged".
- Log `provider`, `model`, `route`, `tokens_in`, `tokens_out`, `cost_usd` and `latency_ms` on every question in the `questions` table. This is what tells us the real margin.

---

## 6. Code changes needed

### `packages/tutor` (provider-neutral)
```ts
interface TutorProvider {
  id: "openai" | "anthropic" | "gemini";
  answer(req: {
    system: string;
    turns: { role: "user" | "assistant"; text: string }[];
    model: string;
    maxOutputTokens: number;
    effort: "minimal" | "low" | "medium";
    signal: AbortSignal;
  }): Promise<{ text: string; tokensIn: number; tokensOut: number }>;
}
```
- `providers/openai.ts`: official `openai` SDK, Responses API, `reasoning.effort`, `max_output_tokens`.
- `providers/anthropic.ts`: official `@anthropic-ai/sdk`, `messages.create`, `output_config.effort: "low"`, `max_tokens`. Check `stop_reason` (`refusal`, `max_tokens`) before reading the text.
- `providers/gemini.ts`: move the existing `@google/genai` code here.
- `router.ts`: picks the route (quick, default or hard), then tries providers in fallback order with one shared timeout (25 s total).
- `pricing.ts`: a per-model price table, so we compute `cost_usd` from the token counts.
- Keep `SYSTEM_PROMPT` identical across providers, and bump `TUTOR_PROMPT_VERSION` when it changes.

### `apps/api` env (new keys, never committed)
```
AI_PRIMARY=openai               # openai | anthropic | gemini
AI_FALLBACKS=anthropic,gemini
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5-mini
OPENAI_MODEL_QUICK=gpt-5-nano
OPENAI_MODEL_HARD=gpt-5-mini     # or gpt-5.4-mini
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-haiku-5-5
GEMINI_API_KEY=                  # existing
GEMINI_MODEL=gemini-3.1-flash-lite
AI_DAILY_BUDGET_USD=5            # hard stop, see section 8
```
`tutorLive` in `/config` becomes true when **any** provider key is set.

### Database (Drizzle migration)
Add `provider`, `route` and `cost_usd` to `questions`. `model`, `tokens_in`, `tokens_out` and `latency_ms` already exist or get extended.

### Proof page
Show "AI cost per question" (average `cost_usd`) next to the price. This fits the honest-numbers idea.

---

## 7. Features to add later (ordered by value)

1. **Photo of homework (vision).** Students photograph a worksheet. All three providers take images.
   - An image adds roughly 1–2k input tokens, which is still under ₱0.10 on `gpt-5-mini`.
   - Price it at **₱0.50** ("Ask with photo · ₱0.50") or keep it at ₱0.30 if the margin holds.
2. **Streaming answers.** Text appears while it's written.
   - **Problem:** x402 settles after the handler returns success, and streaming starts sending output before we know it succeeded.
   - **Option A:** stream into the server buffer and settle when the stream completes. The UI shows "Thinking…" until then (what we do now).
   - **Option B:** use the x402 `upto` scheme or a session-based payment later. That would be a payments change and would need a BUILD_PLAN update.
   - **Recommendation:** stick with A for the pilot.
3. **"Deep" tier.** "Explain like a professor · ₱2.00" uses `claude-sonnet-5-5` or `gpt-5.4-mini` at high effort. The price must cover the cost: Sonnet is about ₱0.41 for a typical question and ₱0.87 for a hard one.
4. **Moderation pre-check.** OpenAI's moderation endpoint is free. Run it before answering, and refuse obviously harmful requests **without charging**.
5. **Prompt caching.** Our system prompt is about 600 tokens, below most providers' cache minimum of ~1k. If we grow the prompt (subject guides, FEU course outlines), caching makes the extra length nearly free.
6. **Eval set.** About 50 real Taglish questions (math, physics, code, essays, ng/nang) with expected answers.
   - Run it whenever we change the model or prompt, before switching in production.
   - Start with the existing QA list in BUILD_PLAN Phase 5.
7. **Text-to-speech / speech input.** "Read the answer aloud" for accessibility. Lower priority.

---

## 8. Cost guardrails (do before mainnet)

- **Output caps** on every call (the `max_output_tokens` values in section 5).
- **Daily AI budget** (`AI_DAILY_BUDGET_USD`). When reached, `/ask` returns a friendly "Tutor is resting, try again tomorrow" **before** payment, so nobody is charged.
- **Rate limit** per address, for example 30 questions an hour, to stop scripts draining a sponsored balance fast.
- **Provider spend limits:** set monthly caps in the OpenAI, Anthropic and Google dashboards, so a bug can't run up a big bill.
- **Alert** when `cost_usd / price` goes above 50% over a day. It means routing or prompts drifted.

---

## 9. Privacy and safety

- Questions go to the AI provider. Say so in a one-line notice in Settings and on `/proof`.
- Don't send student addresses or receipts to the AI. Only send the question, the subject and recent history.
- Use API keys from the **organization** account, with training on API data off (the default for OpenAI and Anthropic API traffic).
- Keys live only in `apps/api/.env` and the hosting provider's secret store. Never put them in the web app, git or logs (CLAUDE.md rule).
- The existing crisis-hotline instruction stays in the shared system prompt for every provider.

---

## 10. Rollout steps

1. **You:** confirm you have **API** credits on platform.openai.com and create an API key. I'll ask for it through a private input box.
2. Build the provider layer, the router and the cost logging (section 6). Test with the existing API tests and a fake provider.
3. Run the eval set against `gpt-5-nano`, `gpt-5-mini`, `claude-haiku-5-5` and `gemini-3.1-flash-lite`. Pick the default from **quality per ₱**, not just the price.
4. Turn on testnet with OpenAI as primary. Do 10 real paid questions, check `cost_usd` in the database, and check the answers.
5. Add guardrails (section 8), then update BUILD_PLAN decision #9 and `PHASE_LOG.md`.
6. Optional: add an Anthropic key for the fallback, then vision.

---

## 11. Decisions you need to make

| # | Question | Recommendation |
|---|---|---|
| 1 | Main provider | **OpenAI `gpt-5-mini`** (you have credits) |
| 2 | Backups | Claude Haiku 5.5, then Gemini Flash-Lite |
| 3 | Keep ₱0.30 per question? | **Yes.** Margin is healthy |
| 4 | Photo questions price | ₱0.50 |
| 5 | Deep tier now or later? | Later, after the pilot |
| 6 | Daily AI budget for the pilot | $5 a day (~4,000 `gpt-5-mini` questions) |

---

## 12. Sources (re-check before mainnet)

- OpenAI official pricing: https://openai.com/api/pricing
- Gemini official pricing: https://ai.google.dev/pricing
- Anthropic official pricing: https://www.anthropic.com/pricing#api (Claude figures above are from Anthropic's model table, October 2026)
- Trackers used for the OpenAI and Gemini figures (October 2026): [developer.puter.com OpenAI](https://developer.puter.com/tutorials/openai-api-pricing/), [spendlint.dev](https://spendlint.dev/pricing/openai-api), [calcis.dev](https://www.calcis.dev/pricing/openai), [benchlm.ai](https://benchlm.ai/openai/api-pricing), [developer.puter.com Gemini](https://developer.puter.com/tutorials/gemini-api-pricing/), [Google Cloud pricing](https://cloud.google.com/gemini-enterprise-agent-platform/generative-ai/pricing), [cloudzero.com](https://www.cloudzero.com/blog/gemini-pricing/)
