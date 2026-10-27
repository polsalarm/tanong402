# Tanong402 — Instawards Evidence

Everything a reviewer needs, in one place. Fill it in as the pilot runs. Rules: https://stellar.gitbook.io/scf-handbook/scf-awards/instawards/official-rules

## Checklist

- [ ] Public GitHub repo with README (setup, live URL, contract IDs)
- [ ] Live demo URL: —
- [ ] Public proof page: —/proof
- [ ] `tanong-pool` mainnet contract on Stellar Expert: —
- [ ] Mainnet paid-question tx hashes (CSV in `docs/evidence/`, with Stellar Expert links)
- [ ] Agent-paid mainnet tx hashes (from `examples/agent-cli`)
- [ ] Usage numbers + screenshot of `/proof` and the receipts page
- [ ] 2–3 min demo video
- [ ] Chapter Lead confirmed Tanong402 can run alongside Bequest

## Success criteria

| Criterion | Target | Actual | Proof |
| --- | --- | --- | --- |
| Students onboarded | 100 | — | `/proof`, `wallets` count, pool `stats().students` |
| Paid questions on mainnet | 2,000 | — | `docs/evidence/questions-mainnet.csv` |
| Agent paying `/ask` by itself | 1 | — | tx links below |
| Public repo + demo + explorer links | yes | — | above |

## Sample transactions

| What | Network | Tx | Link |
| --- | --- | --- | --- |
| First paid question | testnet | — | — |
| First paid question | mainnet | — | — |
| Agent-paid question | mainnet | — | — |
| Pool funded | mainnet | — | — |
| Student allowance claim | mainnet | — | — |

## What is *not* real yet

Stated plainly, as in Bequest:

- **No peso top-up.** Students can't turn GCash or bank money into credit yet. All pilot credit comes from the Scholarship Pool, funded by the team and sponsors.
- **Revenue is partly circular in the pilot.** Students spend pool-funded USDC, and payments land at the Tanong402 receiving address. Every payment is a real mainnet settlement, but it isn't outside revenue yet.
- **Browser wallets.** Keys live encrypted on the student's device. If they clear browser data without a backup, that small balance is lost. Passkey wallets are future work.
- **Enrollment is centralized.** The pool admin enrolls students after in-person invite checks. This limits abuse but isn't permissionless.
- **XLM payments** are only offered if the facilitator supports them (see TECH_STACK.md).
