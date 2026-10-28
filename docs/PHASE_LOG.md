# Tanong402 — Phase Log

Running record of what each phase actually produced: contract IDs, deploy links, public keys, test results, decisions. **Update at the end of every phase.** The plan lives in [BUILD_PLAN.md](BUILD_PLAN.md); this file records what got built.

> 🔐 **Secrets rule:** only **public** keys, addresses, and contract IDs go here. Secret keys live in `~/.config/stellar/` and env files, never in this doc or the repo.

---

## Quick reference (latest)

| Item | Value |
| --- | --- |
| Current phase | Phases 0–3 built on testnet (web UI in progress) |
| Network | Stellar Testnet (`Test SDF Network ; September 2015`) |
| Receiving address (payTo) | `GCWZ2EO3Z2WZXTZGDOUF7ZTKXMMH6FLJY4EPUCPJCLKTMQX7PP3WC4AV` |
| Treasury address | `GADKPG2H5EYAM7OPWNTKWNRSDSWZICXHKSABBGL342IEVWZ3MSIEHMI4` |
| Pool admin address | `GBON7ERIONUEL7ZYNQMETJ6DTDVZZ677LFCZUMNAFO3RAQ3BMHJTC2VP` (rotated from deployer `GCDSY2PZ…GZWQ`) |
| `tanong-pool` contract ID (testnet) | [`CAVZVSTO55EMWLAQGG45B6HFOUPGB4LLIDX3HMW3BCG2QHR3FDMF7SCD`](https://stellar.expert/explorer/testnet/contract/CAVZVSTO55EMWLAQGG45B6HFOUPGB4LLIDX3HMW3BCG2QHR3FDMF7SCD) |
| `tanong-pool` contract ID (mainnet) | — |
| Facilitator (testnet / mainnet) | `https://x402.org/facilitator` / — |
| Gemini models (default / hard) | `gemini-flash-lite-latest` / `gemini-flash-latest` (no key yet → demo answers) |
| Neon project / branches | — / `dev`, `main` |
| Web URL | — |
| API URL | — |

---

## Planning ✅
**Date:** 2026-10-28 · **Status:** Complete

### Changes
- Docs: PRD, Architecture, Tech Stack, Monorepo, Build Plan, Claude Design prompt, Evidence, Phase Log.
- Monorepo skeleton (`.gitkeep`): `apps/{web,api}`, `packages/{shared,wallet,tutor}`, `contracts/tanong-pool`, `examples/agent-cli`, `scripts/{stellar,contracts}`, `UI/{WEB,MOBILE}`, `docs/{screenshots,evidence}`.

### Decisions
- Website-first PWA; native app deferred (PRD §8).
- Neon Postgres instead of Supabase/Firebase; wallet address = identity.
- USDC price asset; XLM as optional second `accepts` (P2).
- `tanong-pool` Scholarship Pool contract; no custom contract in the payment path.
- Pilot allowance $0.25/week (50 questions).

### Versions seen (npm / crates.io, 2026-10-28)
`@x402/*` 2.28.0 · `@stellar/stellar-sdk` 17.4.0 · `@google/genai` 2.31.0 · `soroban-sdk` 29.0.1 · `@neondatabase/serverless` 1.2.0 · `drizzle-orm` 0.45.4 · `express` 5.3.0 · `vite` 8.3.5 · `react` 19.3.1 · `tailwindcss` 4.3.3 · `turbo` 2.11.10

### Machine state
Node v24 present. **Not installed yet:** pnpm, Rust/cargo, Stellar CLI.

---

## Phases 0–3 — Scaffold, paid `/ask`, pool contract, onboarding + claim ✅
**Date:** 2026-10-28 · **Status:** Backend complete on testnet; web UI (Midnight Silver) in progress

### Changes
- Monorepo: pnpm 10.33 + Turborepo 2.11, `tsconfig.base.json`, workspaces `apps/*`, `packages/*`, `examples/*`, `scripts`.
- `packages/shared`: zod API schemas, network constants (USDC SAC + issuer), 7-dp money helpers.
- `packages/wallet`: device-bound WebCrypto keystore (non-extractable AES key in IndexedDB), passphrase backups (PBKDF2 600k), x402 paid fetch with spend guard (payTo + max price policy), tx / Soroban auth-entry / message signing, Horizon balances.
- `packages/tutor`: system prompt v1 (Taglish, step-by-step, academic honesty, crisis line), hard-question router, demo answers when no Gemini key.
- `apps/api`: Express 5 + `@x402/express` on `POST /ask`; `/config`, `/price`, `/stats`, `/health`, `/.well-known/x402`, `/openapi.json`; sponsored onboarding; relayed pool claims with strict auth-entry checks; wallet-signature JWT for receipts; Neon (Drizzle) or in-memory store; rate limits before the paywall.
- `contracts/tanong-pool` (Codex): Soroban Scholarship Pool, 13 tests, 9,371-byte wasm; TS bindings in `packages/pool-client`.
- `examples/agent-cli`: autonomous agent paying `/ask` over x402 with a spend policy.
- `scripts`: `setup:testnet` (keys, Friendbot, trustlines, DEX-bought test USDC), `fund-pool`, `e2e` (full student journey).

### Verified on testnet
| What | Tx |
| --- | --- |
| Agent paid question #1 (x402, fee sponsored by facilitator) | [`819487d4…f04c`](https://stellar.expert/explorer/testnet/tx/819487d4da6c6936a9bacb3404cd84425e95fb017cea14b5bef10cbaf884f04c) |
| Agent paid question #2 | [`786bd61e…aeb1`](https://stellar.expert/explorer/testnet/tx/786bd61ee4eb5d9f1e75cd9fcd77339abb980ea327d906d3b7315dde2979aeb1) |
| Pool admin rotated to API-held key | [`0e76c712…9995`](https://stellar.expert/explorer/testnet/tx/0e76c7129cf0cf90dd68011863c8876c7db2debbdc03ad08d11b40c090bb9995) |
| Pool funded with 2 USDC | [`d13e91f9…5c66`](https://stellar.expert/explorer/testnet/tx/d13e91f98e54bcf7a6360b025e8eb3899180ace0283289584b50c2680e095c66) |
| Student sponsored onboarding (0 XLM held) + auto-enroll | [`e386225b…f8d8`](https://stellar.expert/explorer/testnet/tx/e386225ba96c24096197671dd589a01d1cb053dcebc1613ce686ebbad5abf8d8) |
| Relayed allowance claim, 0.25 USDC (student signed auth entry only) | [`df2757a2…d3d`](https://stellar.expert/explorer/testnet/tx/df2757a29cb8eb754476de0a1646185cdafc37444ee0d2aad70584780bc7dd3d) |
| Same student's paid question (0.25 → 0.245 USDC) | [`f8e47df4…152e`](https://stellar.expert/explorer/testnet/tx/f8e47df45be933fe433312184c490e6a7b404d34e15fa261e01073c32031152e) |

| Evidence run: agent questions ×3 | [`eb65b71a…59b5`](https://stellar.expert/explorer/testnet/tx/eb65b71a5b099313ebbbbc5397b4edf47c3fe3034a79f77c177b0b3a9b3359b5) · [`220e936c…34ff`](https://stellar.expert/explorer/testnet/tx/220e936cf2dd3c5a1431ccff517b82ce99e2c65e23a84dca2d48b573b53f34ff) · [`fdadbb13…9a9f`](https://stellar.expert/explorer/testnet/tx/fdadbb132724fd9928aa0e3bb0aec8ddf0f4c6b538f1ab8eda35039f23599a9f) |
| Evidence run: student onboard → claim → paid question | [`a65818b8…8651`](https://stellar.expert/explorer/testnet/tx/a65818b8d8a0c32c441c83b1144cad784c0123ecff8f2109e6344ac7522f8651) · [`e5140b70…157b`](https://stellar.expert/explorer/testnet/tx/e5140b70135368a707c06632bc499e22a054890ec4daec8d970c911689af157b) · [`2898ffc9…66d0`](https://stellar.expert/explorer/testnet/tx/2898ffc9054e7c4040a505d4ec5605476c4cd485e9b320117599954d967966d0) |
Second claim in the same week was refused by the contract (`ClaimTooEarly` → API `CLAIM_TOO_EARLY`).

### Tests
`shared` 3 · `wallet` 2 · `tutor` 4 · `api` 8 (incl. real `@x402/express` middleware vs a fake facilitator: 402 → pay → settle; **no settlement when the model fails**) · `contracts` 13. `turbo typecheck test`: 10/10 tasks green.

### Toolchain (verified)
| Tool | Version |
| --- | --- |
| Node | 24.22.1 |
| pnpm | 10.33.0 |
| Rust / cargo | 1.99.1 |
| Stellar CLI | 28.1.0 |
| soroban-sdk | 28.0.0 (29.x needs CLI ≥ 29, not yet released) |
| `@x402/*` | 2.28.0 |
| `@stellar/stellar-sdk` | 17.4.0 |

### Decisions / findings
- `@x402/express` settles only when the handler returns < 400 (confirmed in source). Model errors → no charge.
- Settlement tx hash + payer read from the `PAYMENT-RESPONSE` header in a `res.on("finish")` hook.
- Protocol 23+ simulations return `sorobanCredentialsAddressV2` auth entries; API + wallet handle both variants.
- Deployer admin key lives in the macOS secure store (not exportable), so admin was rotated on-chain to an API-held key.
- Design direction changed to **Midnight Silver** (premium dark + brushed silver), replacing the yellow-pad draft.

### Not done yet
Neon project (MCP needs auth: memory store used meanwhile), Gemini key (demo answers), web UI, mainnet.

---

## 2026-10-29 · Fintech fonts, multi-provider AI, Freighter fixes (NEXT_PLAN steps 1–3)

### Fonts
Instrument Serif and Geist were replaced by Inter Tight (headings, semibold, tight tracking) and Inter (UI). Money uses Inter with tabular digits. Geist Mono is kept only for hashes, addresses, code and the invite input.

### AI (`packages/tutor`)
- **Providers:** OpenAI (Responses API), Anthropic and Gemini, all behind a single `TutorProvider` interface.
- **Routing:** `pickRoute()` sends quick questions to `gpt-5-nano`, default ones to `gpt-5-mini`, and hard ones to `gpt-5-mini` at medium effort.
- **Fallback:** if a provider fails, the next one in `AI_PRIMARY` + `AI_FALLBACKS` is tried, but only when the previous one produced no answer.
  - Each attempt is capped at 20 s, and the whole question at 35 s.
  - If every provider fails, `/ask` returns `MODEL_ERROR` and the payment does not settle.
- **Cost:** `cost_usd` is computed from a per-model price table.
- **Logging:** `provider`, `route` and `cost_usd` are logged and stored on `questions`.
  - These are new nullable columns in the Drizzle schema. Generate a migration when Neon is connected.
- **Live switch:** `tutorLive` is true when any provider key is set. With no keys, canned answers are served as before.

### Freighter
- **Sign-in:** `/auth/verify` and `@tanong/wallet` `verifyMessage` accept SEP-53 signatures (Freighter), in base64 or hex, alongside raw ed25519 signatures. Receipts now work for Freighter accounts.
- **Joining the pool:** new `POST /pool/join` endpoint.
  - The caller must be signed in, and the account must already exist and hold USDC.
  - Already-enrolled accounts are refused before an invite is spent.
  - The API builds and signs its own `enroll` call. Nothing from the client is signed.
  - The Wallet screen shows an invite field for Freighter accounts that aren't enrolled.
- **Payments RPC:** `createPaidFetch` and the agent CLI now pass an explicit Soroban RPC URL, which mainnet requires.
- **Local dev:** the web dev server moved to port 5180 (`strictPort`), because 5173/5174 belong to another local project. The `WEB_ORIGIN` default and docs were updated.

### Tests
`shared` 3 · `wallet` 2 · `tutor` 9 · `api` 9.
- The `tutor` tests cover routing, fallback, a hung provider, and every provider failing.
- The `api` tests cover SEP-53 sign-in and the `/pool/join` auth gate.

Typecheck, lint and the web build all pass.

### Not done yet
- A live OpenAI call (waiting on a key).
- A Freighter end-to-end run on testnet (NEXT_PLAN step 4).
- The cost-per-question figure on `/proof`.
