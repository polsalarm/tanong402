# Claude Design Prompt — Tanong402

How to use: open **Claude Design**, paste the **App context** block first, then generate screens one at a time with the prompts below. Ask for **mobile (390×844)** first, then the **desktop web (1440)** variant. Export each screen (HTML + PNG) into `UI/MOBILE/<screen>/` and `UI/WEB/<screen>/`, then hand the exports to Claude Code to build in `apps/web`.

> Build order tip: generate **Ask (chat)** and **Wallet** first, in light and dark. Those two set the whole design system. Then do the rest.

---

## App context (paste once, keep at top)

> Design a mobile-first web app (installable PWA) called **Tanong402**, a pay-per-question AI tutor for Filipino college students. "Tanong" means "question" in Filipino. Instead of a ₱1,000/month AI subscription, students pay about **₱0.30 per question**. Each answer comes with a small receipt. Students get a weekly allowance from a **Scholarship Pool** funded by sponsors (schools, alumni, community).
>
> **Never show the words crypto, blockchain, wallet seed, token, gas, or USDC in the main UI.** Money is always shown in pesos (₱) and as "questions left". Technical details (Stellar, transaction links) appear only as small "View receipt" links and on the Advanced settings and Proof pages.
>
> **Audience:** 18–22-year-old students on mid-range Android phones and prepaid data, studying the night before a quiz. They write in English and Taglish.
>
> **Brand and tone:** a smart, kind *ate/kuya* study buddy, not a bank and not a trading app. Friendly, focused, a little playful, never childish. Copy is short, warm, and in plain English with light Taglish where natural ("Ano'ng tanong mo?").
>
> **Visual language:**
> - Concept: **yellow pad + ballpen**, the paper every Filipino student knows. Use it as a subtle motif (faint ruled lines behind the composer, a red margin line accent), not a skeuomorphic texture.
> - Palette: ballpen blue `#1F3FBF` primary, yellow-pad cream `#FFF6D6` surfaces, margin red `#E5484D` for accents and alerts only, ink charcoal `#1A1A1A` text, success green `#1F9D55` for receipts. Dark mode: deep navy `#0E1530` background, cream text, blue stays primary.
> - Type: a friendly geometric sans for UI (e.g. Plus Jakarta Sans or Inter), a handwritten accent font used sparingly for the logo and empty states, and a clean monospace for math/code.
> - Rounded cards (16–20px), generous spacing, 48px+ tap targets, bottom navigation on mobile.
> - Signature component: the **receipt chip** under every answer: "✓ Paid ₱0.30 · View receipt". Small, green check, tappable.
> - Signature indicator: the **questions-left pill** in the header ("₱9.60 · 32 questions left").
> - Math renders with LaTeX (KaTeX); code blocks have copy buttons.
> - Accessibility: WCAG AA contrast, 16px minimum body text, works on 360px-wide screens.

---

## Screens

### 1. Landing
Hero: logo "Tanong402" with a pencil-question-mark mark. Headline **"Bayad per tanong. Not per month."** Subhead: "Step-by-step AI tutor for ₱0.30 a question. No subscription, no card." Primary button **Ask your first question**, secondary "I have an invite code". A side-by-side price comparison card: "Monthly AI plan ₱1,100" vs "20 questions ₱6". A 3-step strip: Get invite → Ask → See your receipt. A small live-stats strip ("1,284 questions answered this week") linking to **Proof**. Footer: "Payments settle on Stellar" small link, Developers link.

### 2. Invite code + creating your account
Step 1: single big input for an invite code (6 characters, auto-uppercase, also "Scan QR"). Step 2: a friendly progress screen while we set things up (4 checkmarks animating: "Making your account", "Securing it on this phone", "Joining the Scholarship Pool", "Adding your first allowance: ₱14.50"). Ends with confetti-lite and **Start asking**. No mention of keys or crypto.

### 3. Ask (chat): the main screen
- Header: logo, **questions-left pill**, menu.
- Empty state: "Ano'ng tanong mo?" with 4 example prompt cards (Math: "Solve 2x² − 8x + 6 = 0 step by step", Physics, Programming: "Bakit may NullPointerException ako?", Essay: "Paano ko gagawing mas malinaw ang thesis ko?") and subject chips (Math, Physics, Chem, Programming, Filipino, Writing).
- Conversation: student bubble (right, blue) and tutor answer (left, cream card with ruled-line hint) showing a numbered step-by-step solution with LaTeX math and a highlighted final answer box. Under each answer: **receipt chip** "✓ Paid ₱0.30 · View receipt" and actions "Explain more (₱0.30)", "Copy".
- Composer pinned at the bottom: multiline input, subject chip, send button with the **price on the button** ("Ask · ₱0.30").
- States to show: sending ("Paying ₱0.30…" → "Thinking…" skeleton), success, error ("Something went wrong. You were not charged."), low balance banner ("4 questions left · next allowance Monday").
- Show the academic-honesty refusal style: student asks "write my 1000-word essay", tutor replies kindly with an outline and guiding questions instead.

### 4. Receipt detail (bottom sheet)
Amount ₱0.30 (small "0.005 USDC" under it), date/time, question preview, "Settled in 4.8 s", status **Paid ✓**, and **View on Stellar Expert ↗** link with a shortened transaction hash. Calm, trustworthy, like a GCash receipt.

### 5. Wallet / Allowance
Big balance card: "₱9.60" and "≈ 32 questions left". Scholarship card: "Scholarship Pool: ₱14.50 every week", a progress ring or countdown to the next claim, and a big **Claim ₱14.50** button (disabled state: "Next claim in 2d 4h"). "Funded by" row with sponsor avatars/names. Recent activity list mixing claims (+₱14.50, green) and questions (−₱0.30). Note: "Top up with GCash, coming soon" disabled row.

### 6. Receipts (history)
Search bar, filter chips by subject, list grouped by day: question preview (1 line), subject tag, ₱0.30, time, small green check. Tap → Receipt detail. Empty state uses the handwritten font: "Wala pang tanong. Ask your first one!"

### 7. Settings
Sections: Language (English / Taglish auto), Theme, **Back up this account** (create a backup passphrase → download file / show QR), **Restore on a new phone**, Delete my question history, **Advanced** (collapsed): account address (copyable, truncated `GABC…XYZ`), network, "View on Stellar Expert".

### 8. Proof (public transparency page)
A data-forward page for judges and sponsors: big stat tiles (Students, Paid questions, Total paid ₱/USDC, Pool balance, Sponsors), a 30-day bar chart of daily paid questions, a live feed of the latest 20 settled payments (time, ₱0.30, shortened tx hash → Stellar Expert), and the pool contract ID with an explorer link. Honest footnote: "Pilot credits are funded by sponsors; peso top-up coming soon."

### 9. Developers (for AI agents)
Dev-docs style page: "Any AI agent can pay Tanong402 per question. No API key." Sections: How x402 works (4-step diagram: request → 402 → pay → answer), endpoint card `POST /ask` with price, copy-paste `curl` showing the 402 response, a TypeScript snippet using `@x402/fetch` + `@x402/stellar`, links to `/.well-known/x402` and OpenAPI. Monospace-heavy, still on-brand.

### 10. Sponsor (optional, desktop-first)
"Fund a student's questions." Choose amount (₱500 = ~1,600 questions), connect a Stellar wallet (generic multi-wallet chooser: Freighter, LOBSTR, xBull), **Fund the pool** button, then a thank-you with a tx link and the sponsor's name on the Proof page.

---

## Components to make consistent
Receipt chip · questions-left pill · price-on-button · subject chips · answer card (steps, math, final-answer box) · bottom nav (Ask · Receipts · Wallet · Settings) · toast · bottom sheet · empty states with handwritten font.

## Hand-off prompt for Claude Code (after exporting)
> Using the exported designs in `UI/MOBILE/*` and `UI/WEB/*`, build the matching pages in `apps/web/src/pages/*` with React 19 + Tailwind v4. Pull colors/type/radii into Tailwind theme tokens in `index.css` first, build the shared components listed in `docs/design/CLAUDE_DESIGN_PROMPT.md` → "Components", then the pages. Wire data through `apps/web/src/lib/api.ts` and `packages/wallet`. Never show crypto terms outside Advanced settings, Proof and Developers.
