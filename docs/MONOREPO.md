# Tanong402 — Monorepo Structure

pnpm workspaces + Turborepo (same tooling as `stellar/x402-stellar`). Repo conventions copied from Bequest: `contracts/` Rust workspace, `docs/` for plans and logs, `UI/WEB` + `UI/MOBILE` for design exports, `.claude/skills/` for agent skills, `scripts/` for Stellar ops.

Directories marked ✅ already exist as `.gitkeep` skeletons. Files are created during the phases in [BUILD_PLAN.md](BUILD_PLAN.md).

```
tanong402/
├── apps/
│   ├── web/                          ✅ Student PWA — React 19 + Vite + Tailwind v4
│   │   ├── public/                   ✅ icons, manifest assets, og-image
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   │   ├── landing/          ✅ Landing.tsx — pitch, price, "Ask your first question"
│   │   │   │   ├── onboard/          ✅ Invite.tsx, Creating.tsx (wallet + sponsor + enroll + first claim)
│   │   │   │   ├── ask/              ✅ Ask.tsx — chat, composer with price, answer + receipt chip
│   │   │   │   ├── receipts/         ✅ Receipts.tsx, ReceiptDetail.tsx
│   │   │   │   ├── wallet/           ✅ Wallet.tsx — ₱ balance, questions left, claim allowance
│   │   │   │   ├── settings/         ✅ Settings.tsx — backup/restore, language, advanced (address)
│   │   │   │   ├── proof/            ✅ Proof.tsx — public live stats + latest tx links
│   │   │   │   └── developers/       ✅ Developers.tsx — x402 docs for agents, curl + TS snippets
│   │   │   ├── components/           ✅ ReceiptChip, PriceTag, BalancePill, MessageBubble, Composer, Modal, Toast, BottomNav
│   │   │   ├── contexts/             ✅ WalletContext, BalanceContext, ThemeContext
│   │   │   ├── lib/
│   │   │   │   ├── api.ts            typed client over packages/shared schemas
│   │   │   │   ├── x402.ts           paid fetch (wraps packages/wallet)
│   │   │   │   ├── format.ts         ₱ / USDC / "questions left" helpers
│   │   │   │   └── hooks/            ✅ useAsk, useBalance, useReceipts, useClaim
│   │   │   ├── App.tsx · main.tsx · index.css
│   │   ├── index.html · vite.config.ts · vercel.json · .env.example
│   │   └── package.json              name: @tanong/web
│   │
│   └── api/                          ✅ Express + x402 — deploy to Render
│       ├── src/
│       │   ├── config/               ✅ env.ts (zod-validated env), networks.ts
│       │   ├── middleware/           ✅ payment.ts (x402), rateLimit.ts, auth.ts (JWT), errors.ts, paymentLogger.ts
│       │   ├── routes/               ✅ ask.ts, price.ts, discovery.ts, onboard.ts, pool.ts, auth.ts, receipts.ts, stats.ts, health.ts
│       │   ├── services/             ✅ tutor.ts (Gemini), stellar.ts (treasury, sponsorship), pool.ts (contract client), receipts.ts
│       │   ├── db/                   ✅ schema.ts, client.ts (Neon), migrations/ ✅
│       │   ├── app.ts · index.ts
│       ├── test/                     ✅ Vitest: ask flow with mocked facilitator, rate limits, onboarding XDR checks
│       ├── drizzle.config.ts · .env.example
│       └── package.json              name: @tanong/api
│
├── packages/
│   ├── shared/                       ✅ @tanong/shared — zod schemas (AskRequest/Response, Receipt, Stats), constants
│   │                                    (PRICE_USDC, networks, USDC addresses, explorer URL builder), error codes
│   ├── wallet/                       ✅ @tanong/wallet — browser keypair, WebCrypto encryption, IndexedDB store,
│   │                                    backup export/import, x402 paid fetch, spend guard, auth-entry signing
│   └── tutor/                        ✅ @tanong/tutor — system prompt, router, request builder, qa/*.json + qa runner
│
├── contracts/                        ✅ Rust workspace (Soroban)
│   ├── Cargo.toml                    workspace root, release profile tuned for small wasm
│   └── tanong-pool/                  ✅ Scholarship Pool
│       ├── Cargo.toml
│       └── src/                      ✅ lib.rs, types.rs, events.rs, test.rs
│
├── examples/
│   └── agent-cli/                    ✅ An AI agent paying /ask by itself (createEd25519Signer + x402HTTPClient)
│       └── src/                      ✅ index.ts — asks N questions from a list, logs tx hashes
│
├── scripts/
│   ├── stellar/                      ✅ setup-keys.sh, create-usdc-trustline.ts, fund-testnet-usdc.md,
│   │                                    make-invites.ts, export-evidence.ts
│   └── contracts/                    ✅ build.sh, deploy.sh <network>, init-pool.sh, fund-pool.sh
│
├── docs/
│   ├── README.md                     index
│   ├── PRD.md · ARCHITECTURE.md · TECH_STACK.md · MONOREPO.md · BUILD_PLAN.md
│   ├── CLAUDE_DESIGN_PROMPT.md       prompts to generate the UI in Claude Design
│   ├── PHASE_LOG.md                  as-built log (contract IDs, tx hashes, versions) — updated each phase
│   ├── EVIDENCE.md                   Instawards evidence checklist + "what is not real yet"
│   ├── RUNBOOK.md                    (Phase 6) pause pool, rotate keys, facilitator outage, refill
│   ├── screenshots/                  ✅ 00-landing.png, 01-ask.png, …
│   └── evidence/                     ✅ CSV exports, stats snapshots
│
├── UI/                               design exports (HTML/PNG from Claude Design), per role + form factor
│   ├── WEB/{landing,onboard,ask,receipts,wallet,proof}/   ✅
│   └── MOBILE/{landing,onboard,ask,receipts,wallet}/      ✅
│
├── assets/                           logo, icon.svg, brand
├── .claude/skills/stellar-dev/       ✅ project-scoped agent skill (installed in Phase 0)
├── CLAUDE.md                         instructions for coding agents working in this repo
├── Tanong402_Build_Guide.md          original brief
├── README.md
├── package.json                      root scripts → turbo
├── pnpm-workspace.yaml               apps/*, packages/*, examples/*
├── turbo.json                        build / dev / lint / typecheck / test pipelines
├── tsconfig.base.json                strict, ES2022, moduleResolution bundler
├── .prettierrc.json · eslint.config.js · .gitignore · .nvmrc (22)
```

## Workspace files (create in Phase 0)

`pnpm-workspace.yaml`
```yaml
packages:
  - apps/*
  - packages/*
  - examples/*
```

`package.json` (root)
```json
{
  "name": "tanong402",
  "private": true,
  "packageManager": "pnpm@10",
  "engines": { "node": ">=22" },
  "scripts": {
    "dev": "turbo run dev --parallel --filter=@tanong/web --filter=@tanong/api",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "test": "turbo run test",
    "contracts:test": "cd contracts && cargo test --workspace",
    "contracts:build": "cd contracts && stellar contract build",
    "db:generate": "pnpm --filter @tanong/api drizzle-kit generate",
    "db:migrate": "pnpm --filter @tanong/api drizzle-kit migrate",
    "format": "prettier --write ."
  }
}
```

`turbo.json`
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "dev": { "cache": false, "persistent": true },
    "lint": {},
    "typecheck": { "dependsOn": ["^build"] },
    "test": { "dependsOn": ["^build"] }
  }
}
```

## Dependency rules

```
apps/web     → packages/shared, packages/wallet
apps/api     → packages/shared, packages/tutor
examples/*   → packages/shared (and @x402/* directly)
packages/*   → never import from apps/*
packages/wallet is browser-only; packages/tutor is server-only (holds no secrets, takes the Gemini client as a parameter)
```

## Environment variables

`apps/api/.env.example`
```env
NODE_ENV=development
PORT=3001
WEB_ORIGIN=http://localhost:5180

# Stellar / x402
NETWORK=stellar:testnet                      # stellar:pubnet in prod
STELLAR_RPC_URL=https://soroban-testnet.stellar.org
HORIZON_URL=https://horizon-testnet.stellar.org
FACILITATOR_URL=https://x402.org/facilitator
FACILITATOR_API_KEY=                         # mainnet facilitator, if required
SERVER_STELLAR_ADDRESS=G...                  # receiving address (payTo)
PRICE_USDC=0.005
PHP_PER_USD=58                               # display only
MAX_DAILY_MODEL_SPEND_USD=5

# Keys (server-only, never logged)
TREASURY_SECRET=S...                         # sponsors accounts, relays claims
POOL_ADMIN_SECRET=S...                       # enroll / pause
POOL_CONTRACT_ID=C...

# AI
GEMINI_API_KEY=
GEMINI_MODEL=                                # current Flash Lite id
GEMINI_MODEL_HARD=                           # current Flash id

# Data
DATABASE_URL=postgres://...neon.tech/...?sslmode=require   # pooled
DATABASE_URL_DIRECT=                                       # for migrations
JWT_SECRET=
```

`apps/web/.env.example`
```env
VITE_API_URL=http://localhost:3001
VITE_NETWORK=stellar:testnet
VITE_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
VITE_HORIZON_URL=https://horizon-testnet.stellar.org
VITE_RECEIVER_ADDRESS=G...                   # spend guard: only pay this payTo
VITE_MAX_PRICE_USDC=0.02                     # spend guard
VITE_PHP_PER_USD=58
```

`examples/agent-cli/.env.example`
```env
STELLAR_PRIVATE_KEY=S...
SERVER_URL=http://localhost:3001
NETWORK=testnet
```

## Naming conventions
- Packages: `@tanong/<name>`; contract crates: `tanong-<name>`.
- React pages: `PascalCase.tsx` inside a role folder; hooks `useX.ts`.
- One route file per resource in `apps/api/src/routes`.
- Commits: `feat(api): …`, `feat(web): …`, `feat(pool): …`, `docs: …`, `chore: …`.
