# Tanong402 Build Guide

**Pay per question AI tutor for Filipino students, built on x402 and Stellar.**
Prepared for a 30 day Stellar Instawards sprint. Checked October 2026; verify versions and prices before you start.

---

## 1. What you are building

Students pay a few centavos per question instead of a ₱1,000+ monthly AI subscription. Every question is a real USDC payment on Stellar, settled through x402. Other AI agents can also call the same endpoint and pay per question.

**Flow of one question**

1. Student types a question in the Tanong402 web app.
2. App sends `POST /ask` to your server.
3. Server replies `402 Payment Required` with the price (about $0.005 USDC, roughly ₱0.30).
4. The student's wallet signs the payment and the app resends the request automatically.
5. A facilitator verifies and settles the payment on Stellar.
6. Server calls the AI model and returns the answer plus the transaction hash.

```
Student app ──POST /ask──▶ Tanong402 server ──▶ 402 (price)
     │                                              │
     └── signs USDC payment, resends ──▶ facilitator verifies + settles on Stellar
                                                    │
                          server calls Gemini ◀─────┘
                                                    │
Student app ◀── answer + tx hash ───────────────────┘
```

---

## 2. The AI model

x402 does not care which model you use. It only handles payment; the model is a normal API call your server makes after payment clears.

| Option | Use it for | Notes |
| --- | --- | --- |
| **Gemini Flash Lite (recommended)** | Main tutor model | Cheapest Gemini tier, fast, free tier for development, and you already know the Gemini API |
| Gemini Flash | Harder questions (math proofs, long explanations) | Costs several times more than Flash Lite; route only hard questions here |
| Claude Haiku (`claude-haiku-5-5`) | Alternative tutor | Strong step by step explanations |
| Open models via Groq or OpenRouter | Lowest cost experiments | One OpenAI compatible endpoint for many models |

**Cost check.** A typical question is around 500 input tokens and 500 output tokens. On Gemini Flash Lite pricing, that is a small fraction of a centavo to a few centavos per question depending on the exact version, so charging about ₱0.30 leaves margin. Confirm current rates at https://ai.google.dev/gemini-api/docs/pricing before you set your price.

**Tutor prompt basics**
- Answer in English or Taglish, matching the student.
- Explain step by step; do not just give the final answer.
- Refuse to write full graded assignments; offer hints instead.
- Keep answers short by default to control token cost.

---

## 3. SDKs and packages

| Package | Side | Purpose |
| --- | --- | --- |
| `express` | Server | HTTP server |
| `@x402/express` | Server | x402 middleware that puts a price on `/ask` |
| `@x402/core` | Both | Shared x402 types and logic |
| `@x402/stellar` | Both | Stellar payment scheme (`ExactStellarScheme`) and signer helpers |
| `@x402/fetch` | Client | Wraps `fetch` so a 402 response is paid automatically |
| `@stellar/stellar-sdk` | Both | Keys, trustlines, transactions, network passphrases |
| `@google/genai` | Server | Gemini API client |
| `dotenv` | Server | Environment variables |
| React or Next.js | Client | Chat UI |
| Supabase or Firebase | Server | Users, question history, tx hashes |

Install for the server:

```bash
npm install express dotenv @stellar/stellar-sdk @x402/core @x402/express @x402/fetch @x402/stellar @google/genai
```

Use Node 20 or newer; `@x402/stellar` warns on Node 18.

---

## 4. Facilitator (you do not build one)

| Network | Facilitator | Notes |
| --- | --- | --- |
| Testnet | x402.org facilitator (Coinbase) | No setup, sponsored fees, testnet only |
| Mainnet | Built on Stellar facilitator (OpenZeppelin Relayer) | Free, public, testnet and mainnet, sponsors fees, settles in about 5 seconds |
| Optional | Self hosted OpenZeppelin x402 plugin | Only if you need full control later |

---

## 5. Wallets for students

Students should never see seed phrases or the word "crypto."

**Sprint version (week 2):** create a Stellar keypair in the browser at signup, store it encrypted on the device, add a USDC trustline, and preload a small USDC credit (for example $1). The student signs each payment locally, so you never hold their funds.

**Later version:** passkey smart accounts (Face ID or fingerprint login). Check that the x402 Stellar scheme supports smart account signers before switching.

**Not in the sprint:** GCash or bank top up. Turning pesos into USDC needs an anchor or onramp partner; list it as next month's scope.

---

## 6. AI coding setup (skills and MCP)

These help Claude Code, Kiro, Codex, or Cursor write correct Stellar code for you.

**Skills**

| Skill | Install | What it gives your coding agent |
| --- | --- | --- |
| Stellar Development Skill (official) | Claude Code: `/plugin marketplace add stellar/stellar-dev-skill` then `/plugin install stellar-dev@stellar-dev`. Other tools: `npx skills add https://github.com/stellar/stellar-dev-skill` | Contracts, SDKs, assets and trustlines, RPC, and an **agentic payments** section covering x402 |
| Stellar CLI built in skill | Ask your agent: "Run `stellar skill` and follow its conventions" | How to drive the Stellar CLI (keys, networks, contracts) |
| OpenZeppelin Stellar skills (optional) | `npx -y skills add openzeppelin/openzeppelin-skills --skill setup-stellar-contracts --agent claude-code` | Only if you later add Soroban contracts |

**MCP**

| MCP server | Install (Claude Code) | Use |
| --- | --- | --- |
| Stellar Raven | `claude mcp add --transport http stellar-raven "https://raven.stellar.buzz/mcp"` then `/mcp`, Authenticate, sign in | Stellar docs and data inside your coding agent |
| Vercel (optional) | Connect in your AI tool | Deploy and read logs without leaving the agent |

---

## 7. Tools and accounts checklist

- [ ] Google AI Studio account and Gemini API key
- [ ] Stellar CLI installed (`stellar keys generate --network testnet tanong-server`)
- [ ] Server receiving address funded with testnet XLM (Stellar Lab friendbot)
- [ ] Testnet USDC for pilot wallets (Circle testnet faucet)
- [ ] Stellar Lab (https://lab.stellar.org) for testing transactions
- [ ] Stellar Expert for public transaction links
- [ ] GitHub repo (public, for Instaward evidence)
- [ ] Hosting: Vercel for the app, Vercel or Render for the Express server
- [ ] Database: Supabase or Firebase
- [ ] Mainnet USDC budget for pilot credits (100 students × $1 = $100)

---

## 8. Skills your team needs

| Area | Level needed |
| --- | --- |
| TypeScript, Node, Express | Comfortable |
| React or Next.js | Comfortable |
| Stellar basics: keypairs, trustlines, USDC as a SEP-41 token, testnet vs mainnet | Working knowledge |
| x402 flow: 402 response, payment header, facilitator verify and settle | Understand the quickstart end to end |
| Prompt design for tutoring | Basic |
| Security: never log secret keys, rate limit `/ask`, keep balances small | Must have |

---

## 9. Suggested project structure

```
tanong402/
├── server/
│   ├── index.ts          # Express app + x402 middleware on /ask
│   ├── tutor.ts          # Gemini call + tutor prompt
│   ├── receipts.ts       # store question, answer, tx hash
│   └── .env              # GEMINI_API_KEY, SERVER_STELLAR_ADDRESS, FACILITATOR_URL, NETWORK
├── web/
│   ├── app/              # chat UI, receipts page
│   └── lib/wallet.ts     # keypair, trustline, @x402/fetch wrapper
└── README.md             # setup, demo link, evidence links
```

---

## 10. 30 day plan

| Week | Goal | Done when |
| --- | --- | --- |
| 1 | Run the official x402 quickstart and the `simple-paywall` example from `stellar/x402-stellar` on testnet; build `/ask` with Gemini behind the paywall | A paid testnet question returns an answer and a tx hash |
| 2 | Chat UI, signup wallets with trustlines, receipts page linking to Stellar Expert | A new user can ask 10 paid questions without touching crypto |
| 3 | Move to mainnet with the Built on Stellar facilitator; onboard 30 FEU students | 30 students with mainnet payments |
| 4 | Grow to 100 students, add an agent example that calls `/ask` directly, fix issues, collect evidence | Success criteria met |

**Success criteria**
- 100 students onboarded
- 2,000 paid questions settled on mainnet
- 1 working example of an AI agent paying `/ask` by itself
- Public repo, live demo, and Stellar Expert links

---

## 11. Instaward evidence checklist

- [ ] Public GitHub repo with README
- [ ] Live demo URL
- [ ] Mainnet transaction hashes and Stellar Expert links
- [ ] Usage numbers (students, questions) with a screenshot of the receipts page
- [ ] Short demo video

---

## 12. Risks and open questions

- **Onramp:** pilot runs on preloaded credits; GCash top up needs a partner.
- **Key safety:** browser wallets can be lost if a student clears data; add backup or move to passkeys.
- **Cost control:** cap answer length and rate limit per wallet so model costs stay under the price.
- **Academic honesty:** tutor gives hints and explanations, not finished assignments.
- **Chapter Lead:** confirm Tanong402 can run alongside Bequest before submitting.

---

## 13. Links

- Stellar on GitHub (all official repos): https://github.com/stellar
- Stellar developer docs (home): https://developers.stellar.org/docs
- x402 on Stellar: https://developers.stellar.org/docs/build/agentic-payments/x402
- x402 quickstart: https://developers.stellar.org/docs/build/agentic-payments/x402/quickstart-guide
- Stellar x402 examples: https://github.com/stellar/x402-stellar
- Facilitator list: https://docs.x402.org/dev-tools/facilitators
- Stellar Development Skill: https://github.com/stellar/stellar-dev-skill
- Building with AI on Stellar: https://developers.stellar.org/docs/build/building-with-ai
- Gemini API pricing: https://ai.google.dev/gemini-api/docs/pricing
- Instawards rules: https://stellar.gitbook.io/scf-handbook/scf-awards/instawards/official-rules
