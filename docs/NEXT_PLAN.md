# Tanong402 — what's left, in order

Written October 28, 2026. Everything up to the web app is built (see `PHASE_LOG.md`):
- **Contract:** on testnet.
- **API:** x402 payments, sponsored setup and pool claims, all checked against live testnet.
- **Agent CLI:** pays per question with its own key.
- **Web app:** Midnight Silver, tested only on mock data so far.

This file is the plan for everything else. The AI details are in `AI_INTEGRATION.md`.

Each step lists what gets done and how we know it's finished.

---

## Step 1 — Font swap (small, ~15 min)

The current headings use **Instrument Serif**, which is narrow and fancy. Replace it with one clean sans-serif everywhere.

- **What:** change the three font variables in `apps/web/src/index.css` (`--font-display`, `--font-sans`, and money that uses `--font-mono`) to the chosen font. Install it from `@fontsource`.
  - Remove the italic "emphasis" style, which only suits the serif.
  - Keep the silver gradient on key words.
- **Money numbers:** switch from the mono font to the main font with tabular digits, so `₱9.60` looks normal and still lines up.
- **Done when:** the landing, Ask, Wallet and Start screenshots are retaken and look right on mobile and desktop.
- **Your pick:** A Inter Tight (recommended) · B Geist only · C Plus Jakarta Sans · D Manrope · E Sora.

## Step 2 — Real AI (OpenAI first, ~half a day)

Full details in `AI_INTEGRATION.md` sections 5–6.

- **What:**
  - Provider layer in `packages/tutor` (OpenAI, Claude, Gemini).
  - A router (quick → `gpt-5-nano`, default → `gpt-5-mini`, hard → `gpt-5-mini` at medium effort), with backups if a provider fails.
  - Cost logging per question (`provider`, `route`, `cost_usd`).
- **Needs from you:** an OpenAI **API** key from platform.openai.com, entered through a private box (never in chat). Optional: Anthropic and Gemini keys for backups.
- **Done when:**
  - Tests pass.
  - A real question gets a real answer.
  - A forced provider failure falls back to the next one.
  - If every provider fails, the student sees "You were not charged".

## Step 3 — Freighter fixes (~1–2 hours)

The web agent found two gaps:

1. **Receipt history fails for Freighter users.** Freighter signs messages in a newer format (SEP-53) that `/auth/verify` doesn't accept yet. Fix in `apps/api/src/middleware/auth.ts` to accept both formats.
2. **Freighter users can't get the weekly allowance.** Enrollment only happens during invite setup. Fix: let a Freighter user enter an invite code on the Wallet screen to join the pool, through the same treasury-checked path.

Also:
- **Mainnet fix:** pass `rpcUrl` into `createPaidFetch` in `packages/wallet`, which the payment library requires on mainnet.
- **Local dev:** set `WEB_ORIGIN` in `apps/api/.env` to the web app's local address, so setup, sign-in and claims aren't blocked.

**Done when:** a Freighter testnet account can connect, pay for a question, see its receipts, and claim an allowance with an invite code.

## Step 4 — Run everything together on testnet (~1 hour)

- **What:**
  1. Start the API (live testnet, real AI) and the web app together.
  2. You try it in your browser with Freighter on **Testnet**, and with the built-in account plus an invite code.
  3. Run 10 real paid questions.
- **Done when:**
  - All 10 questions are settled on Stellar Expert.
  - `cost_usd` is logged for each one.
  - BUILD_PLAN Phase 4 is checked off in `PHASE_LOG.md`.

## Step 5 — Guardrails before anyone else uses it (~2 hours)

- Daily AI budget: when hit, `/ask` returns "Tutor is resting" **before** payment.
- Per-account rate limit: 30 questions an hour.
- Spend caps set in the OpenAI, Anthropic and Google dashboards (you do this; takes 2 minutes).
- Free moderation pre-check (OpenAI). Harmful requests are refused without charging.
- Lighthouse pass on the web app (performance, accessibility, PWA).

## Step 6 — Evidence and docs (~1 hour)

- New screenshots with the new font and real AI answers. Add them to the README.
- Update `BUILD_PLAN.md` decision #9 (AI model) and add the AI plan to `ARCHITECTURE.md`.
- `PHASE_LOG.md` entry with the new testnet tx hashes.

## Step 7 — Later (after the pilot works)

- **Photo-of-homework questions** (₱0.50).
- **"Deep" tier** (₱2.00, a bigger model).
- **Open sign-up without invite:** starts at ₱0 until topped up or given a code, or a shared demo code with a small cap.
- **Mainnet**, per BUILD_PLAN Phase 5:
  - Real USDC, the Built on Stellar facilitator, the contract on mainnet.
  - Hosting on Vercel + Render, Neon `main` branch.
  - Printed invite QR codes for FEU.
- **Mobile app:** only if the PWA isn't enough. The website is the product for now.

---

## What I need from you

| # | Item | When |
|---|---|---|
| 1 | Font pick (A–E) | Now, so Step 1 can start |
| 2 | OpenAI API key (platform.openai.com, not ChatGPT) | Before Step 2 |
| 3 | Decisions in `AI_INTEGRATION.md` section 11 (or "use your recommendations") | Before Step 2 |
| 4 | Freighter installed and set to Testnet | Before Step 4 |

Steps 1 and 3 don't need any keys, so I can start them as soon as you pick a font.
