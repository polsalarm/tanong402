# Tanong402 — notes for coding agents

Pay-per-question AI tutor on x402 + Stellar. Read `docs/BUILD_PLAN.md` (locked decisions + current phase) and `docs/ARCHITECTURE.md` before changing code.

## Layout
pnpm + Turborepo monorepo. `apps/web` (React 19 PWA), `apps/api` (Express + `@x402/express`), `packages/{shared,wallet,tutor}`, `contracts/tanong-pool` (Soroban, Rust), `examples/agent-cli`. Details: `docs/MONOREPO.md`.

## Commands
- `pnpm dev` (web + api) · `pnpm lint` · `pnpm typecheck` · `pnpm test`
- `pnpm contracts:test` · `pnpm contracts:build`
- `pnpm db:generate` · `pnpm db:migrate` (Neon, Drizzle)

## Rules
- **Database is Neon Postgres (Drizzle).** Do not add Supabase or Firebase.
- **Payments stay standard x402 `exact` on USDC.** Never put a custom contract or non-default asset in the `/ask` payment path without updating BUILD_PLAN decisions.
- Identity is the Stellar address; no separate auth provider.
- No crypto words in student-facing UI outside Advanced settings, `/proof`, `/developers`. Money shows as ₱ and "questions left".
- Never log or commit secret keys (`S…`), API keys, or `DATABASE_URL`. Only public keys / contract IDs in docs.
- Treasury/relayer code must check exactly what it signs; no blind signing of client-supplied XDR.
- Testnet first. Mainnet changes need a PHASE_LOG entry.
- Use the Stellar Dev skill (`.claude/skills/stellar-dev`) and the OpenZeppelin Stellar skill for contract work.
- End of each phase: update `docs/PHASE_LOG.md`.
