# Tanong402 — Build Plan

**Pay-per-question AI tutor on x402 + Stellar.** Stellar Instawards · 30-day sprint.
Source of truth: [`Tanong402_Build_Guide.md`](../Tanong402_Build_Guide.md) → [PRD.md](PRD.md). This plan turns the PRD into phases. As-built results go in [PHASE_LOG.md](PHASE_LOG.md).

---

## Locked decisions

| # | Decision | Choice |
| --- | --- | --- |
| 1 | Platform | **Website first**: mobile-first installable PWA. Native app (Expo) only after passkeys + peso onramp + pilot traction (PRD §8) |
| 2 | Repo | **Monorepo**: pnpm workspaces + Turborepo; `apps/web`, `apps/api`, `packages/*`, `contracts/`, `examples/` |
| 3 | Payment asset | **USDC** via standard x402 `exact`. XLM as a second `accepts` option is P2 (Week 4), after checking the facilitator |
| 4 | Payment path | **No custom contract in the payment path**, so any x402 client or agent can pay |
| 5 | Contract | **`tanong-pool` Scholarship Pool** (Soroban): sponsors fund, admin enrolls, students claim capped allowance per period |
| 6 | Database | **Neon Postgres** + Drizzle. No Supabase/Firebase |
| 7 | Identity | **Wallet address = user.** Wallet-signature JWT only for private history reads |
| 8 | Student wallet | Browser ed25519 keypair, WebCrypto-encrypted in IndexedDB; reserves sponsored by treasury; no XLM held by the student |
| 9 | Model | Gemini Flash Lite default, Flash for hard questions; capped output |
| 10 | Hosting | Vercel (web) + Render (api) |
| 11 | Design | **Midnight Silver**: premium dark (midnight `#07090F`) + brushed-silver accents, serif display type. Replaces the yellow-pad draft in `UI/drafts/` |

**Cut line (must have on demo day):** mainnet paid question with Stellar Expert link · pool contract live on mainnet with claims · 100 students / 2,000 paid questions · agent example on mainnet · `/proof` page. Everything else is extra.

---

## Phases

Week 1 = Phases 0–2 · Week 2 = Phases 3–4 · Week 3 = Phase 5 · Week 4 = Phases 6–7.

### Phase 0 — Tooling + scaffold (Day 1–2)
- **Tasks:** install pnpm, Rust + `wasm32v1-none`, Stellar CLI. Create root `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`, ESLint/Prettier, `.nvmrc`. Scaffold `apps/web` (Vite React TS + Tailwind v4), `apps/api` (Express 5 TS + tsx), `packages/{shared,wallet,tutor}`, `contracts/` workspace with `tanong-pool` skeleton (`version() -> 0`). Install Stellar Dev skill, OpenZeppelin Stellar skill, Raven MCP, Neon skill. Create Neon project with `dev` + `main` branches. Generate testnet keys (treasury, admin, receiver) and fund with Friendbot. Get testnet USDC (Circle faucet). Get a Gemini key.
- **Done when:** `pnpm dev` serves web + api; `pnpm contracts:test` passes; `GET /health` is green against the Neon `dev` branch; versions recorded in PHASE_LOG.

### Phase 1 — x402 spike + paid `/ask` on testnet (Day 2–5)
- **Tasks:** run the official x402 quickstart + `stellar/x402-stellar` `simple-paywall` locally. Build `/ask` behind `@x402/express` with `ExactStellarScheme`, price `$0.005`, payTo = receiver. `services/tutor.ts` with `@google/genai`, tutor prompt v1, output cap. `/price`, `/.well-known/x402`, `/health` (facilitator `/supported` check). Drizzle schema + first migration; `paymentLogger` hook writes `questions` with `tx_hash`. Build `examples/agent-cli` early as the test client. **Confirm**: settle-after-success (no charge on model error) and where the tx hash comes back.
- **Done when:** `pnpm --filter agent-cli start` pays testnet USDC, gets an answer, and prints a Stellar Expert link; the row is in Neon; a forced model error does not settle.

### Phase 2 — `tanong-pool` contract (Day 4–7, in parallel with Phase 1)
- **Tasks:** implement the interface in [ARCHITECTURE.md §5](ARCHITECTURE.md#5-contract-tanong-pool-soroban-rust); events; TTL bumps; full test suite. `scripts/contracts/deploy.sh testnet`, `init-pool.sh`, `fund-pool.sh`. Generate TS bindings (`stellar contract bindings typescript`) into `apps/api/src/services/pool-bindings` (or `packages/shared`).
- **Done when:** all contract tests pass; pool deployed on testnet, funded with testnet USDC; CLI `enroll` + `claim` works; contract ID in PHASE_LOG.

### Phase 3 — Wallet + onboarding + claim (Day 8–11)
- **Tasks:** `packages/wallet` (keygen, WebCrypto store, x402 paid fetch, spend guard, auth-entry signing). API `/onboard` (sponsored createAccount + trustline, invite check, enroll) and `/pool/claim/prepare|submit` (relayed claim with strict XDR checks). `scripts/stellar/make-invites.ts`.
- **Done when:** a fresh browser with an invite code ends up with a sponsored account, USDC trustline, enrollment and a first allowance, with no XLM held by the student and no crypto words on screen.

### Phase 4 — Student UI (Day 10–14)
- **Tasks:** generate designs with Claude Design → save to `UI/`. Build Landing, Invite/Onboard, Ask (composer with price, Markdown + KaTeX, receipt chip), Wallet (₱ balance, questions left, claim), Receipts (JWT history), Settings (backup/restore), Proof, Developers. PWA manifest + service worker. Light/dark.
- **Done when (Week 2 gate from guide):** a new user asks **10 paid questions** on testnet without touching crypto; Lighthouse mobile ≥ 90 performance/accessibility; screenshots in `docs/screenshots/`.

### Phase 5 — Mainnet + first 30 students (Day 15–21)
- **Tasks:** switch to the Built on Stellar facilitator (API key if needed). Mainnet keys (receiver watch-only, treasury, admin) + USDC. Deploy `tanong-pool` to mainnet; fund with pilot budget. Neon `main` branch + migrations. Vercel + Render prod; custom domain. Rate limits + daily spend alarm. Tutor QA set passes. Onboarding session at FEU with printed invite QR codes.
- **Done when:** **30 students** with mainnet paid questions; mainnet tx links in EVIDENCE.md.

### Phase 6 — Scale to 100 + agent on mainnet (Day 22–27)
- **Tasks:** second and third onboarding sessions; fix issues from the pilot feedback form. `examples/agent-cli` on mainnet (study-buddy agent that quizzes itself). `/developers` page + OpenAPI. Backup/restore polish. `docs/RUNBOOK.md`. Stretch: XLM as `accepts[1]` (after the `/supported` check), sponsor funding page with Stellar Wallets Kit.
- **Done when:** **100 students**, **2,000 mainnet paid questions**, agent mainnet tx hashes recorded.

### Phase 7 — Evidence + submission (Day 27–30)
- **Tasks:** `scripts/stellar/export-evidence.ts` → CSV; `/proof` screenshot; README final (setup, live URL, contract IDs, evidence links); 2–3 min demo video; confirm with the Chapter Lead that Tanong402 can run alongside Bequest; submit.
- **Done when:** every box in [EVIDENCE.md](EVIDENCE.md) is checked.

---

## Daily cadence
- End of each phase: update PHASE_LOG (what changed, contract IDs, tx hashes, versions, decisions).
- Never commit secrets; only public keys / contract IDs in docs.
- Each PR: `pnpm lint && pnpm typecheck && pnpm test && pnpm contracts:test`.

## After the sprint (next month)
1. GCash/peso onramp through an anchor partner (SEP-24) → students top up without a sponsor.
2. Passkey smart-account wallets (if the x402 Stellar scheme supports smart-account signers).
3. Native app (Expo) reusing `packages/*`.
4. Revenue splitter contract (school/tutor revenue share) if a `C…` payTo works with x402.
5. Image/handwriting questions (photo of the problem).
