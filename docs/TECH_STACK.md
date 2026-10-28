# Tanong402 — Tech Stack

Versions checked on npm / crates.io on **2026-10-28**. Pin exact versions in Phase 0 and record them in [PHASE_LOG.md](PHASE_LOG.md).

---

## Summary

| Layer | Choice | Version | Why |
| --- | --- | --- | --- |
| Monorepo | **pnpm workspaces + Turborepo** | pnpm 10, turbo 2.11 | Same setup as `stellar/x402-stellar`; shared packages across web, api, agent |
| Language | TypeScript (strict) | 5.9 | One language end to end except the contract |
| Runtime | Node | **≥ 22** | `x402-stellar` requires Node ≥ 22; `@x402/stellar` warns on 18 |
| Web | React + Vite | React 19.3, Vite 8 | Same stack as Bequest; SPA fits a chat app, no SSR needed |
| Styling | Tailwind CSS | 4.3 | Bequest pattern (`@tailwindcss/vite`) |
| PWA | `vite-plugin-pwa` | 2.0 | Installable, offline shell |
| Routing | `react-router` | 7 | Bequest pattern |
| Markdown + math | `react-markdown` + `remark-math` + `rehype-katex` | latest | Tutor answers use LaTeX |
| API | Express | 5.3 | Official `@x402/express` middleware and `simple-paywall` example are Express |
| x402 | `@x402/core`, `@x402/express`, `@x402/fetch`, `@x402/stellar` | **2.28.0** | Official SDK; `ExactStellarScheme` |
| Stellar | `@stellar/stellar-sdk` | 17.4 | Keys, sponsored reserves, trustlines, Soroban invoke |
| Contract | Rust + `soroban-sdk` | **28.0.0** | `tanong-pool`; 29.x needs Stellar CLI ≥ 29 (CLI 28.1.0 is current) |
| Stellar CLI | `stellar` | latest | Keys, deploy, contract bindings |
| AI | `@google/genai` | 2.31 | Gemini Flash Lite (default) + Flash (hard) |
| DB | **Neon Postgres** + `@neondatabase/serverless` | 1.2 | Serverless Postgres, branch per environment (`dev`/`main`) |
| ORM | Drizzle ORM + drizzle-kit | 0.45 / 0.31 | Typed schema, SQL migrations |
| Validation | zod | 4 | Shared request/response schemas in `packages/shared` |
| Logging | pino + pino-http | latest | `redact` for secrets; same as x402 example |
| Security | helmet, cors, express-rate-limit | latest | |
| Tests | Vitest (TS), `cargo test` (contract), Playwright (smoke) | latest | |
| Lint/format | ESLint 9 flat + typescript-eslint, Prettier | latest | Same as x402-stellar |
| Hosting | **Vercel** (web) · **Render** (api) | — | Render keeps a long-lived Express process (simpler rate limits, no cold start on the paid path) |
| Sponsor wallet (P1) | Stellar Wallets Kit | 2.x | Sponsors fund the pool with Freighter/LOBSTR, same as Bequest |

**Not using:** Supabase / Firebase (Neon covers the data layer; identity is the wallet address, so no auth service), Next.js (no SSR or SEO need; Vite matches Bequest), Hono (Express has the official example; `@x402/hono` exists if we move to edge later).

---

## Models

| Env | Default | Use |
| --- | --- | --- |
| `GEMINI_MODEL` | current **Gemini Flash Lite** | All normal questions |
| `GEMINI_MODEL_HARD` | current **Gemini Flash** | Router-flagged hard questions |
| Optional | `claude-haiku-5-5` | A/B on step-by-step explanation quality |

Check exact model IDs and prices at https://ai.google.dev/gemini-api/docs/pricing in Phase 1 and write them into PHASE_LOG.

---

## USDC vs XLM

**Decision: USDC is the price asset. XLM is an optional second payment option (P2, Week 4).**

What we found in `@x402/stellar@2.28.0`:
- `DEFAULT_ASSETS` has **only USDC** per network. A plain `"$0.005"` price converts to USDC automatically.
- XLM is technically possible: the scheme takes any SEP-41 token contract, and XLM has one (its native SAC). You pass `{ asset: <XLM SAC>, amount }` or register a money parser.
- The official x402 client's default spend controls only pay **default assets**, so outside agents would refuse XLM unless their owner configured it. That would hurt the "any agent can pay" goal.
- Each facilitator lists accepted assets on `GET /supported`; check before enabling.
- XLM's price moves, so ₱0.30 per question wouldn't stay ₱0.30, and the pool's value would swing.
- Students still need an XLM minimum balance (~1.5 XLM with a trustline), which the treasury covers with **sponsored reserves**.

So `/ask` returns USDC as `accepts[0]` and, once checked, XLM as `accepts[1]`, priced from a cached XLM/USD rate.

---

## Facilitators

| Network | Facilitator | Notes |
| --- | --- | --- |
| Testnet | `https://x402.org/facilitator` (Coinbase) | No setup, sponsored fees |
| Mainnet | Built on Stellar facilitator (OpenZeppelin Relayer) | Free, sponsors fees, ~5 s settle. Find the URL and check whether it needs `FACILITATOR_API_KEY` at https://docs.x402.org/dev-tools/facilitators |
| Fallback | Self-hosted (`stellar/x402-stellar/examples/facilitator`) | Only if both are unavailable |

The API calls `GET <facilitator>/supported` on boot and fails fast if `stellar:<network>` + `exact` is missing.

---

## AI coding setup

| Tool | Install | Notes |
| --- | --- | --- |
| Stellar Dev Skill | `/plugin marketplace add stellar/stellar-dev-skill` → `/plugin install stellar-dev@stellar-dev` | Includes x402 / agentic payments |
| Stellar CLI skill | ask the agent: "Run `stellar skill` and follow its conventions" | |
| OpenZeppelin Stellar skills | `npx -y skills add openzeppelin/openzeppelin-skills --skill setup-stellar-contracts --agent claude-code` | Needed now: we have a Soroban contract |
| Stellar Raven MCP | `claude mcp add --transport http stellar-raven "https://raven.stellar.buzz/mcp"` | Docs + chain data |
| Neon MCP / skill | Neon skill + MCP (authenticate via `/mcp`) | Branches, migrations, SQL |
| Vercel MCP | connect in Claude | Deploys + logs |

## Local toolchain (not yet installed on this machine)

```bash
# Node 22+ already present (v24). Then:
corepack enable && corepack prepare pnpm@10 --activate
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add wasm32v1-none
brew install stellar-cli
stellar keys generate --network testnet tanong-treasury --fund
stellar keys generate --network testnet tanong-admin --fund
stellar keys generate --network testnet tanong-receiver --fund
```
