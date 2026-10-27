# Tanong402 — Product Requirements Document

**Pay-per-question AI tutor for Filipino students, built on x402 + Stellar.**
Stellar Instawards · 30-day sprint · Owner: Paul Henry Dacalan (FEU Institute of Technology)
Source brief: [`Tanong402_Build_Guide.md`](../Tanong402_Build_Guide.md). This PRD turns that brief into product requirements.

---

## 1. Problem

- AI tutors (ChatGPT Plus, Gemini Advanced, Claude Pro) cost ₱1,000–₱1,300/month and need a credit card.
- Most Filipino students study in bursts: a few questions before a quiz or exam. A monthly plan is wasted money most weeks.
- Free tiers are rate-limited, ad-heavy, or give the final answer with no explanation, which doesn't help anyone learn.
- There is no way to pay ₱0.30 for **one** good answer. Card and e-wallet fees make micro-charges impossible.

## 2. Solution

A tutor where **each question is its own micropayment** (~$0.005 USDC ≈ ₱0.30), settled on Stellar through the **x402** HTTP payment protocol.

- Students never see "crypto", a seed phrase, or a gas fee. They see a **₱ balance** and **receipts**.
- Credit comes from a **Scholarship Pool** Soroban contract. Sponsors (schools, alumni, orgs, the Stellar community) fund it, and enrolled students claim a capped allowance each period.
- The same `POST /ask` endpoint is **open to AI agents**: any program with a Stellar wallet can pay per question, with no API key and no signup.

## 3. Goals and success metrics (30-day sprint)

| Metric | Target | Source of truth |
| --- | --- | --- |
| Students onboarded (wallet created + enrolled in pool) | **100** | `wallets` table + pool `enrolled` count |
| Paid questions settled on **mainnet** | **2,000** | `questions` table where `network = stellar:pubnet` and `tx_hash` is set, cross-checked on Stellar Expert |
| Autonomous agent payment | **1** working example | `examples/agent-cli` + its mainnet tx hashes |
| Public evidence | Repo + live demo + Stellar Expert links + demo video | [EVIDENCE.md](EVIDENCE.md) |
| Answer latency (p50, payment + model) | < 8 s | API logs |
| Model cost per question | < 30% of price | token logs × model rates |

**Non-goals for the sprint:** GCash/bank top-up (needs an anchor/onramp partner), native mobile apps, passkey wallets, image/handwriting input, teacher dashboards, subscriptions.

## 4. Users

| Persona | Description | What they need |
| --- | --- | --- |
| **Student (primary)** | FEU (pilot) college student, phone-first, prepaid data, studies in bursts, writes English/Taglish | Fast step-by-step help, clear cost per question, no setup, works on a cheap Android phone |
| **Sponsor** | School org, alumni, Stellar community member, or the team itself (pilot) | Fund students transparently and see where the money went |
| **Pilot operator (us)** | Runs onboarding at FEU, issues invite codes, watches costs | Enroll students fast, cap spending, export evidence |
| **AI agent / developer** | Script or agent with a Stellar wallet | Machine-readable price + discovery, standard x402, no API key |

## 5. User stories and requirements

Priority: **P0** = must ship for success criteria · **P1** = should ship · **P2** = stretch.

### 5.1 Onboarding
| ID | Story | Pri | Acceptance |
| --- | --- | --- | --- |
| ON-1 | As a student, I enter an invite code and start asking within 30 s | P0 | Invite code → wallet created in browser → account + USDC trustline sponsored by treasury → enrolled in pool → first allowance claimed → lands on Ask screen with a ₱ balance |
| ON-2 | I never see a seed phrase or the word "crypto" | P0 | UI copy review; wallet terms only in "Advanced" settings |
| ON-3 | My wallet survives a reload/browser restart | P0 | Secret is encrypted with a non-extractable WebCrypto key in IndexedDB |
| ON-4 | I can back up and restore my wallet on a new phone | P1 | Passphrase-encrypted backup export (file/QR); server never sees plaintext |
| ON-5 | Install to home screen | P1 | PWA manifest + service worker; Lighthouse PWA pass |

### 5.2 Asking
| ID | Story | Pri | Acceptance |
| --- | --- | --- | --- |
| AS-1 | I type a question and get a step-by-step answer | P0 | `POST /ask` → 402 → auto-pay → answer rendered (Markdown + LaTeX math) |
| AS-2 | I see the price **before** I ask | P0 | "₱0.30 per question" shown on the composer; price loaded from `GET /price` |
| AS-3 | Every answer has a receipt | P0 | Receipt chip shows ₱ amount + tx link to Stellar Expert |
| AS-4 | Tutor matches my language (English/Taglish) | P0 | Tutor prompt rule; spot-checked in QA set |
| AS-5 | Tutor teaches and won't do my graded assignment | P0 | Refusal + hints for "write my essay" style prompts; QA set |
| AS-6 | I'm not charged if the answer fails | P0 | Settle only after a successful handler response; failed model call = no settlement |
| AS-7 | Follow-up questions keep context | P1 | Last N turns sent as context, capped by token budget; each follow-up is a new paid question |
| AS-8 | Hard questions get a stronger model | P1 | Router sends flagged/hard questions to Gemini Flash, same price in sprint |
| AS-9 | Subject chips (Math, Physics, Chem, Programming, Filipino, Essay help) | P2 | Subject is sent as a prompt hint |

### 5.3 Balance, allowance, receipts
| ID | Story | Pri | Acceptance |
| --- | --- | --- | --- |
| BA-1 | I see my balance in ₱ and as "questions left" | P0 | USDC balance × fixed display rate; "≈ 33 questions left" |
| BA-2 | I claim my weekly allowance with one tap | P0 | Pool `claim` via relayer; student signs the auth entry only, pays no fee |
| BA-3 | I see all my past questions with receipts | P0 | Receipts page: question preview, ₱, time, Stellar Expert link |
| BA-4 | My history is private | P0 | History API needs a wallet-signature session (JWT) |
| BA-5 | Low-balance nudge | P1 | Banner when < 5 questions left, with next claim time |

### 5.4 Scholarship Pool (contract)
| ID | Story | Pri | Acceptance |
| --- | --- | --- | --- |
| PO-1 | As a sponsor, I fund the pool and it's publicly visible | P0 | `fund()` emits event; Proof page shows total funded + sponsors |
| PO-2 | As operator, I enroll/unenroll students | P0 | Admin-only `enroll` / `enroll_batch` / `unenroll` |
| PO-3 | Students can only claim their allowance once per period | P0 | Contract enforces `period_secs` and `allowance`; tests cover double-claim |
| PO-4 | Operator can pause and change allowance | P0 | `pause`, `set_allowance`; admin auth tested |
| PO-5 | Sponsor-facing page | P1 | Web page to fund the pool with any Stellar wallet (Stellar Wallets Kit) |

### 5.5 Agents and developers
| ID | Story | Pri | Acceptance |
| --- | --- | --- | --- |
| AG-1 | An agent pays `/ask` with no API key | P0 | `examples/agent-cli` pays on mainnet; tx hash in EVIDENCE.md |
| AG-2 | Agents can discover the endpoint and price | P1 | `GET /.well-known/x402` and an OpenAPI doc |
| AG-3 | Developers page explains the flow with copy-paste code | P1 | `/developers` page in the web app |
| AG-4 | Agents holding only XLM can pay | P2 | Second `accepts` entry in XLM, after checking facilitator `/supported` (see [TECH_STACK.md §XLM](TECH_STACK.md#usdc-vs-xlm)) |

### 5.6 Proof / transparency
| ID | Story | Pri | Acceptance |
| --- | --- | --- | --- |
| PR-1 | Public `/proof` page with live counts | P0 | Students, paid questions, mainnet volume, pool balance, latest 20 tx links |
| PR-2 | Evidence export | P1 | `scripts/export-evidence.ts` → CSV of tx hashes + Stellar Expert URLs |

## 6. Pricing and economics

| Item | Value | Notes |
| --- | --- | --- |
| Price per question | **$0.005 USDC** (≈ ₱0.30) | `PRICE_USDC` env; display rate `PHP_PER_USD` env (no live FX in sprint) |
| Model cost (Flash Lite, ~500 in / 500 out) | well under $0.001 | Re-check at https://ai.google.dev/gemini-api/docs/pricing before launch |
| Network fee | $0 to student | Facilitator sponsors x402 fees; relayer pays pool-claim fees |
| Account reserve (~1.5 XLM) | Sponsored by treasury | Stellar sponsored reserves; reclaimable if the account is merged |
| Pilot allowance | **$0.25/week** per student (50 questions ≈ ₱14.50) | Tunable on-chain. Sized for the 2,000-question goal: 30 students in Week 3 + 100 in Week 4 = up to 6,500 questions of capacity; worst case ~$33 claimed |
| Pilot pool budget | **$100 USDC** mainnet | From the build guide; covers allowance + buffer |

> **Honesty note.** In the pilot most of the money students spend comes from the pool we or our sponsors fund, and x402 payments go back to the Tanong402 receiving address. The on-chain payments are real, but the "revenue" is partly circular until a peso onramp exists. EVIDENCE.md says this plainly.

## 7. Tutor behavior

Full prompt: [`packages/tutor`](MONOREPO.md#packagestutor), spec in [ARCHITECTURE.md §6](ARCHITECTURE.md#6-tutor-and-model-routing).
- Answer in the student's language (English, Filipino, or Taglish).
- Step by step. Explain *why*, then give the result. For problem sets, solve one example and guide the rest.
- Refuse to write full graded work (essays, take-home exams). Offer an outline, hints, or feedback instead.
- Short by default (≤ ~350 output tokens); the student can tap "Explain more" (a new paid question).
- No medical, legal, or self-harm advice beyond pointing to proper help.

## 8. Platform decision: website first

**Build the web app (installable PWA) first. No native app in the sprint.**

| Reason | Detail |
| --- | --- |
| Evidence needs a URL | Instawards wants a live demo link judges can open in one click |
| x402 libraries are JavaScript | `@x402/fetch`, `@x402/stellar` and `stellar-sdk` run in the browser; React Native needs polyfills and extra checking |
| No app-store review | Store review and payment-policy questions could eat a week of a 30-day sprint |
| Students are on phones anyway | Mobile-first PWA + "Add to Home Screen" feels like an app on Android |
| One codebase for agents + humans | The same `/ask` API serves the PWA and agents |

**When to build a native app (Month 2–3):** after (a) passkey smart-account wallets work with x402, (b) a GCash/peso onramp partner is signed, and (c) the pilot shows people come back week after week. Then: Expo (React Native) reusing `packages/shared`, `packages/wallet` and `packages/tutor`.

## 9. Risks

| Risk | Mitigation |
| --- | --- |
| Lost browser wallet (cleared data) | Encrypted backup (ON-4); balances are tiny; pool allowance continues on the new wallet after re-enrollment |
| Sybil / abuse of pool | Invite codes given out in person at FEU; admin-only enrollment; per-period cap on-chain |
| Model cost blow-up | Output token cap, per-wallet + per-IP rate limit, hard daily spend alarm |
| Academic honesty | Tutor rules + QA test set |
| Facilitator outage | Health check on startup (`GET /supported`); testnet/mainnet facilitator URLs configurable |
| Mainnet USDC budget | $100 pool cap; pause switch in contract |
| Chapter Lead conflict with Bequest | Confirm Tanong402 can run alongside Bequest **before** submitting |

## 10. Open questions

1. Mainnet facilitator: does the Built on Stellar facilitator need an API key (`FACILITATOR_API_KEY`)? Request one in Week 1.
2. Does the x402 Stellar `exact` scheme accept a **contract** (`C…`) `payTo`? Only matters if we add a revenue splitter later.
3. Is the native XLM token on each facilitator's `/supported` list? Decides whether AG-4 can ship.
4. Sponsor sources beyond the team: FEU org? SCF community? Who funds pool round 2?
5. Data retention: how long do we keep question text? (Default: 90 days, deletable by the student.)
