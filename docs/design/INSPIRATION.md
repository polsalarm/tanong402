# Tanong402 — UI inspiration scan

**Researched 28 October 2026.** These are pattern references, not instructions to copy a product's visual identity. Mapping refers to the screen names in [`CLAUDE_DESIGN_PROMPT.md`](CLAUDE_DESIGN_PROMPT.md). URLs below were opened during this scan.

## Fintech and e-wallet references

| Reference | Pattern observed | Why it fits Tanong402 | Maps to |
|---|---|---|---|
| [GCash transaction history](https://help.gcash.com/hc/en-us/articles/360034155433-How-to-request-transaction-history) | Recent activity is available in-app, loaded in small batches; longer history is a separate export path. | A lightweight recent list suits prepaid-data users, while keeping full exports out of the common task. The receipt is reachable from activity. | Receipts history; Receipt detail |
| [Maya transaction list and receipt](https://developers.maya.ph/docs/cash-in-to-maya-wallet) | Transaction list → tap a row → see a transaction summary/receipt. | Familiar progressive disclosure: show a scannable history first, then expand one payment into a proof view. | Receipts history; Receipt detail bottom sheet |
| [GoTyme transfer status](https://www.gotyme.com.ph/help/send-transfer/transaction-limits-and-confirmation/how-to-know-if-transfer-is-successful/) | A clear success screen followed by a transaction history row; detail status distinguishes completed, in-progress, and failed. | Payment and answer are asynchronous. Explicitly labelling “Paying” and “Thinking” reduces uncertainty, and a durable status belongs in the receipt. | Ask sending state; Receipt detail |
| [Revolut receipt download](https://help.revolut.com/en-MX/help/profile-and-plan/managing-my-account/single-transaction-or-top-up-confirmation/) | Open a transaction from the list to download a single receipt; amount, date, time, type, account and fees are transaction-level facts. | Keep receipt information structured and compact; show the amount and settlement state before any technical identifier. | Receipt detail bottom sheet |
| [Wise statements](https://wise.com/help/articles/2736049/how-do-i-download-a-statement?origin=related-article-an3RZHv876wj3CBnHQTdR) | Statements can be reached from a currency or savings jar, and exports have a separate task-oriented path. | Allowance should have its own context/card and activity, while question receipts remain a distinct activity stream. | Wallet/Allowance; Receipts history |
| [Cash App transaction receipts](https://cash.app/legal/gb/en-us/tos) | Receipts live in the activity section; transaction history and account statements are directly accessible. | Put receipts where students expect history, instead of making every answer open a separate finance area. | Receipt chip; Receipts history |
| [Monzo proof of payment](https://monzo.com/en-es/help/using-monzo/help-statements) | A transaction feed supports tapping an item for proof of payment; account statements handle multi-transaction ranges. | A chip can open the exact answer’s proof; history remains the place to browse or filter many answers. | Receipt chip; Receipt detail; Receipts history |
| [Coins.ph wallet transactions](https://support.coins.ph/hc/en-us/articles/43427828346265-How-to-View-Wallet-Transactions-on-Coins-ph) | Choose a balance, scan a chronological list, then open a readable detail with timestamp, status and amount. | One readable peso balance and chronological entries give a familiar local e-wallet mental model without importing trading visuals. | Wallet/Allowance; Receipts history; Receipt detail |
| [GCash failed transaction guidance](https://help.gcash.com/hc/en-us/articles/40995097563673-My-GCash-payment-or-transaction-was-unsuccessful-but-my-wallet-was-deducted-How-do-I-get-a-refund) | Users are guided to verify history and balance to establish whether a failed payment actually deducted funds. | State the no-charge outcome plainly after a failed model response, rather than making students infer it from the balance. | Ask error state; toast/error component |

## AI assistant and tutor references

| Reference | Pattern observed | Why it fits Tanong402 | Maps to |
|---|---|---|---|
| [ChatGPT release notes: composer thinking control](https://help.openai.com/hy-am/articles/6825453-chatgpt-release-notes) | Thinking controls are placed in the composer, near the action and response mode. | Keep price and send action in one consistent composer zone; show the transient payment and thinking phases there too. | Ask (empty); Ask (answer and sending state) |
| [Claude artifacts](https://support.anthropic.com/en/articles/9487310-what-are-artifacts-and-how-do-i-use-them) | Larger, self-contained outputs can be separated into a dedicated surface and revisited/exported. | Use answer cards with a clear content hierarchy and actions so a worked solution is easy to scan and reuse. | Ask answer card; Receipt chip |
| [Perplexity Pro Search](https://www.perplexity.ai/help-center/en/articles/10352903-what-is-pro-search) | Answers expose direct citations and support contextual follow-ups. | Make proof and receipt affordances visible beneath an answer; make follow-up cost explicit before the next request. | Ask answer actions; Receipt chip |
| [Gemini sources and related links](https://support.google.com/gemini/answer/14143489?hl=en) | Sources appear inline or behind a Sources control, keeping verification attached to the answer. | Keep verification one tap away and visually subordinate to the teaching content. | Receipt chip; Receipt detail; Proof |
| [Khanmigo](https://khanmigo.ai/) | Tutor walks learners through a solution and asks questions so they can work it out, instead of only returning an answer. | Friendly teaching and academic honesty are core to the product; a refusal should still give the student a useful next step. | Ask answer; academic-honesty state |
| [Photomath](https://www.photomath.com/) | Exact problem → solution, with steps and potentially multiple methods; each step supports understanding. | A numbered derivation, readable equations and final-answer treatment suit college math and a phone viewport. | Ask answer with quadratic solution |
| [Duolingo Explain My Answer](https://blog.duolingo.com/explain-my-answer-now-free/) | Short contextual explanations make the “why” behind a correct or incorrect response easy to request. | The “Explain more” action should be an optional next paid question, clearly priced next to the action. | Ask answer actions; price-on-button |
| [Brainly AI Learning Companion](https://brainly.com/insights/meet-brainlys-ai-learning-companion) | Guided, step-by-step help is connected to test prep and the learner’s past sessions. | Use prompt examples and subject choices to make the blank chat feel approachable, then preserve answer context in receipts. | Ask empty; Receipts history |
| [Brainly answer guidelines](https://brainly.com/content-guidelines) | Good answers explain why/how, use organized steps, and stay friendly and age-appropriate; essays for others are disallowed. | Reinforces short explanations with steps and kind academic-integrity redirection, not scolding. | Ask answer; refusal/hint state |

## Per-action price and payment patterns

| Reference | Pattern observed | Why it fits Tanong402 | Maps to |
|---|---|---|---|
| [Stripe checkout guidance](https://stripe.com/resources/more/the-checkout-process-how-businesses-can-reduce-friction-and-boost-conversion) | Review the cost before the final action; after completion, show confirmation, an order/receipt reference and what happens next. | A per-question price belongs on the “Ask” action and is repeated in the receipt. The product can confirm each individual action without a checkout detour. | Price-on-button; Ask sending; Receipt detail |
| [OpenAI API pricing](https://platform.openai.com/pricing?trk=article-ssr-frontend-pulse_x-social-details_comments-action_comment-text) | API usage pricing is metered by usage unit (such as tokens) and varies by model. | The user should not need to understand usage units. Normalize the actual action to the fixed ₱0.30/question price, and keep the peso equivalent stable in the student interface. | Ask composer; price-on-button; Wallet balance |

## Patterns we’re adopting

1. Show one clear balance in pesos and translate it into **questions left**.
2. Put **₱0.30** on the send button before the student acts; repeat it in the answer receipt.
3. Separate “Paying ₱0.30…” from “Thinking…” so the wait has a visible sequence.
4. Make the answer card easy to scan: numbered steps, LaTeX, a final-answer box, then actions.
5. Put “✓ Paid ₱0.30 · View receipt” directly below each successful answer.
6. Open receipt details from either the answer chip or a history row; include amount, time, question preview and clear status.
7. Keep history chronological with day grouping, compact subject labels and optional filters.
8. Give the weekly allowance its own card with amount, questions equivalent, next-claim countdown and one clear claim action.
9. Use concrete success, pending and failure labels. A model failure explicitly says: **“You were not charged.”**
10. Start the empty chat with realistic suggested questions and subject chips, not an unexplained blank field.
11. Keep helpful verification affordances attached to the answer, while keeping technical transaction metadata in a receipt detail or Proof.
12. Use a warm, capable tutor voice; an academic-integrity refusal redirects to an outline, hint or guiding question.
13. Keep secondary details (time, source, status, explorer) visually quieter than the learning content and peso amount.
14. Use a persistent, thumb-friendly bottom navigation for Ask, Receipts and Wallet.
15. Keep “Claim” and “Ask” actions direct; avoid modal checkout for a ₱0.30 question.

## Avoid

- Trading-app or crypto aesthetics: coin glyphs, charting, neon gradients, token tickers and market language.
- Crypto vocabulary in student-facing screens. The receipt brief’s “0.005 USDC” line conflicts with the app rule; this draft omits it and keeps technical detail on Proof/Developers only.
- Dark-pattern upsells, subscriptions, guilt nudges, scarcity timers, or hiding a paid follow-up’s price.
- Ambiguous charging states, fake “live” numbers, or a success check before settlement succeeds.
- Showing technical hashes as the primary receipt content; keep them secondary behind a technical link.
- Dense finance dashboards that make the Scholarship Pool feel like a bank or investment account.
- Confetti that blocks the next action or visual treatment that makes a serious receipt feel like a game reward.

