# Instawards Statement of Work (SOW)

30-Day Scoped Engagement

> Draft for review. Items marked **[confirm]** need a real answer before we submit.

---

## 1. Project & Team Information

| Field | Value |
| --- | --- |
| Project Name | Tanong402 |
| Builder / Team Name | PXAL |
| Primary Contact (Name + Email) | **[confirm]** |
| Ambassador Chapter | STELLAR PH |
| Ambassador Chapter Lead | Mr. Nelson Lumbres |
| Date Submitted | **[confirm]** (target: November 3, 2026) |
| Suggested Sprint Start Date | November 9, 2026 (Day 1) to December 8, 2026 (Day 30) |
| Public repo | **[confirm]** (github.com/polsalarm/tanong402) |

---

## 2. Instawards Overview & Intent

### 2.1 Instawards Purpose (for Builder Context)

Instawards fund short, clearly scoped work that helps a project make real progress on Stellar. The work must be finished and shown within 30 days or less.

This SOW is a shared promise between the Builder and the Ambassador Chapter Lead about what will be delivered, why it matters, and how anyone can check it.

---

## 3. Problem Statement & Objective

### Problem Being Addressed

Tanong402 is a pay-per-question AI tutor for Filipino students. Each question costs about ₱0.30 and is paid on Stellar with USDC through the x402 standard. Students never see a wallet, a seed phrase or a fee.

The core already works on Stellar testnet:
- Paid `/ask` endpoint (x402 `exact` on USDC).
- `tanong-pool` Scholarship Pool contract (Soroban).
- Sponsored student accounts, so students hold no XLM.
- A web app and an AI agent that pays for its own questions.

Three gaps stop it from being a real product:

1. **There is no app.** It is only a website. The wallet key lives in browser storage, which can be wiped, and there are no notifications to bring students back.
2. **Getting credit depends on invite codes.** A student can only get credit with a code we hand out in person. There is nothing to do in the app except ask questions.
3. **Students can't earn their own questions.** Credit only comes from sponsors. When it runs out, the student is stuck.

### Objective of This Instaward

By Day 30, Tanong402 is a native iPhone app live on the Apple App Store. Students sign up with no invite code and earn free questions through quiz games, daily streaks and optional ads. Every question is a real x402 USDC payment on Stellar mainnet, and ad revenue is deposited into the `tanong-pool` contract on-chain. Each flow is shown with Stellar Expert transaction links and tests that pass in CI.

---

## 4. Scope of Work (30-Day Deliverables)

This Instaward is a 30-day **build sprint for the app itself**: the iPhone app, the earn system, and the mainnet release. It is not a marketing or user-growth campaign. The app reuses the existing web app, API, wallet package and contract.

**Already built (existing work, not funded here):** paid `/ask` with x402 on USDC, the `tanong-pool` contract on testnet with tests, sponsored student accounts and relayed allowance claims, multi-provider AI tutor with fallback ("you were not charged" when every provider fails), the web app UI, and the agent CLI.

**Funded under this Instaward (new work):** the iPhone app and App Store release, the earn system (quiz games, streaks, rewarded ads, points), open sign-up with abuse protection, and the mainnet release with its proof package.

### 4.1 In-Scope Deliverables

| Deliverable | Description (What will be built or produced?) | Why this matters |
| --- | --- | --- |
| **Deliverable 1: iPhone app on the App Store** | **Timeline:** Days 1 to 21.<br><br>**What will be built:** We turn our web app into an iPhone app with Capacitor, so we reuse the code that already works. The wallet key is saved in the iPhone Keychain with Face ID, and the app gets push notifications, offline quizzes and simple phone navigation.<br><br>We first test it on TestFlight with 20+ people using test money (testnet). Then we send it to the App Store with everything Apple asks for: account deletion, a privacy policy and no in-app purchases.<br><br>**Acceptance Criteria:** The app is live on the App Store. A new user can sign up and ask a question paid on Stellar mainnet without seeing any crypto words. If Apple is still reviewing on Day 30, we submit the TestFlight link instead and mark this as partial. | Students use apps, not websites. An app on the home screen with streak reminders brings them back every day.<br><br>The Keychain also keeps the wallet safer than the browser does. |
| **Deliverable 2: Earn points by playing (no more invite codes)** | **Timeline:** Days 4 to 21.<br><br>**What will be built:** Anyone can download the app and start right away, with no invite code. New users get 5 free questions. After that, students earn "Aral Points" by studying: a Daily Challenge with 5 quiz questions, a 60-second Speed Round where they try to beat their best score, bonus points for keeping a daily streak, and optional short ads. 10 points = 1 free question, and a student can earn up to about 7 free questions a day. When a student gets a quiz question wrong, an "Explain this" button opens the tutor on that exact question, so the game leads straight into learning. A weekly school leaderboard gives badges to top players. The quiz bank will have 500+ questions in Math, Science, English, Filipino and Programming, made ahead of time with our AI tutor and checked by us.<br><br>Points are saved in our database. They are not crypto, can't be sent to others and can't be cashed out, which follows Apple's rules for apps with wallets. When a student spends points, a sponsor account on our server pays for that question with a normal USDC payment on Stellar, so every free question is still a real transaction. This sponsor account is refilled from our `tanong-pool` contract with a weekly limit, and the money we earn from ads is deposited into the same pool on-chain. To stop bots from farming free points, we use Apple App Attest (only our real app on a real iPhone can earn), one welcome bonus per phone even after reinstalling, points for ads only after Google confirms the ad was watched, quiz answers checked on our server, and daily limits per user and per phone.<br><br>**Acceptance Criteria:** A user can sign up with no code, play the quiz games, keep a streak, watch an ad and spend points on a question on mainnet. That question has its own Stellar Expert link. Tests pass in CI for fake ad rewards, reinstall abuse, daily limits, spending points twice and quiz answer checks. At least one ad-revenue deposit into the pool is on mainnet. | Today, students can only get credit with an invite code we hand out in person. That is slow, needs us to be there, and gives students no reason to open the app again.<br><br>Earning points by playing quizzes turns studying into a daily habit, and students earn their own questions instead of waiting for someone to give them credit. Because ad money goes into an on-chain pool, anyone can check where it goes, and over time the scholarship can help pay for itself. |
| **Deliverable 3: Testing, sandboxes and mainnet launch** | **Timeline:** Days 1 to 30.<br><br>**What will be built:** From Day 1 we set up a safe place to build and test. CI runs a local Stellar network, so every change tests payments and the contract without touching real money. A staging server on testnet is what the TestFlight app uses, and each change gets its own copy of the database. Automated app tests tap through sign-up, quiz, ad and a paid question on every build.<br><br>Then we move everything from testnet to Stellar mainnet. The `tanong-pool` contract is deployed and funded on mainnet, the API switches to the mainnet x402 payment service, the database moves to production, and the web app and API go live on our hosting. The AI agent example is also run on mainnet, to show that apps and AI agents can pay the same endpoint in the same way.<br><br>Before real money flows, we add safety limits. There is a daily AI budget, and when it is reached the app stops taking questions before anyone pays. There are rate limits, a free check for harmful questions, and spending alarms on every account we control. We will write down exactly what our server accounts are allowed to sign, and add tests proving they refuse anything else. Finally, we build a public `/proof` page that shows live numbers (questions paid, quizzes played, ads watched, pool balance) with links to the transactions, record a 3 to 5 minute walkthrough video, and write step-by-step setup instructions in the README.<br><br>**Acceptance Criteria:** A Stellar Expert link for each money flow on mainnet: a question paid from the app, a question paid with points, a pool refill, an ad-revenue deposit and an agent-paid question. The pool contract ID on mainnet. Safety tests pass in CI. `/proof` is live. The video and README are published. | Testnet only shows the app works with test money. Mainnet shows it works with real money, and the safety limits make sure a bug or an attacker can't drain our accounts.<br><br>The `/proof` page and the transaction links let anyone, including people without a technical background, check every claim in this SOW on Stellar Expert. |

### Out of Scope (Not Included)

- User-growth targets and campus marketing. This sprint builds the product. We will still run the TestFlight beta to test it.
- Android app on the Google Play Store. The same Capacitor build can ship there later. Android users can use the web app for now.
- Buying credit with GCash, a bank or a card (this needs an onramp partner).
- Cash prizes, crypto rewards or anything students can cash out.
- Passkey smart-account wallets.
- Photo-of-homework questions.
- A paid security audit.
- Teacher or school dashboards.

---

### 4.2 Deliverable-Aligned Budget Request

**Total: $5,000**, all for building and testing the app. None of this budget goes to students, to student credit or into the Scholarship Pool.

| Amount | What it pays for |
| --- | --- |
| **$2,000** | **Deliverable 1: iPhone app.** iOS app setup with CI builds and TestFlight ($350). Keychain wallet with Face ID ($350). Push notifications ($250). Offline quizzes ($200). Phone navigation and welcome screens ($400). Apple requirements: account deletion, privacy and store listing ($200). App Store submission and fixes ($250). |
| **$2,000** | **Deliverable 2: Earn system.** Points system and spending flow ($400). Quiz games, streaks and leaderboard ($550). Quiz bank of 500+ questions ($200). Rewarded ads with Google confirmation ($250). Anti-bot protection ($300). Automated tests for points, ads and anti-bot checks ($300). |
| **$1,000** | **Deliverable 3: Testing, sandboxes and mainnet launch.** Testnet sandbox and staging: a local Stellar network for CI, a staging server and a database copy for each change ($250). Automated app tests that tap through every flow on each build ($200). Mainnet launch of the contract, API, database and app ($200). Safety limits and signing tests ($200). `/proof` page, video and README ($150). |
| **$5,000** | **Total** |

---

### 4.3 Stellar Primitives, Technical Differentiation & Security Scope

**Stellar primitives used:**
- **x402 `exact` payments on USDC.** Every question, including those paid with points, is a standard x402 payment on Stellar. Any x402 client or AI agent can pay the same endpoint, with no API key.
- **Soroban `tanong-pool` contract (Rust).** Holds sponsor and ad revenue funds, caps how much goes out each week, and keeps public stats.
- **Sponsored reserves.** New student accounts and USDC trustlines are paid for by our treasury, so students never need XLM.
- **Stellar Asset Contract (SAC)** for USDC in the pool.
- **Stellar Expert** as the public proof for every transaction.

**What makes this different:**
- x402 payments running inside a native iPhone app, with the wallet in the Keychain and no crypto words on screen.
- Earn-to-learn that stays inside Apple's rules: points are not crypto, but every question they pay for is a real Stellar transaction.
- Ad revenue goes into an on-chain pool where anyone can check it.
- One endpoint serves the app and AI agents. An agent pays per question the same way a student does.

**Security focus for this sprint:**
1. **Fake points.** Bots or modified apps could farm points. We block this with App Attest, DeviceCheck, ad rewards confirmed by Google's server, answer checks on the server, and daily limits.
2. **Spending too much.** A bug or an attack could drain the sponsor payer account. It only holds one week of budget, refills from the pool with a cap, and has a hard daily spend limit.
3. **Blind signing.** The treasury, relayer and sponsor payer only sign transactions they build themselves. Tests prove they refuse anything else.
4. **Lost phones.** The wallet key is in the Keychain behind Face ID, and the encrypted backup still works. Balances are small by design.

---

### 4.4 Trust Model & Honest Notes

- **Points are run by us (off-chain).** Points live in our database, the same as any app's reward points. What is on-chain is every question paid with them, the pool funding, the payer refills and the ad revenue deposits.
- **The money is partly circular for now.** Sponsor, pool and ad money pay for questions, and the payments land at the Tanong402 receiving address. Every payment is a real mainnet transaction, but most of it isn't outside revenue yet. Students paying with their own money comes with the GCash onramp, which is out of scope.
- **Ad revenue is small per view.** One rewarded ad in the Philippines earns roughly the cost of one question, sometimes less. `/proof` shows the real numbers instead of guesses.
- **If Tanong402 shuts down,** the pool contract and all payment records stay on Stellar. The admin can return the remaining pool funds, and the code is public.

---

## 5. 30-Day Execution Plan & Timeline

### 5.1 Weekly Breakdown

| Week | Planned Work | Expected Output |
| --- | --- | --- |
| **Week 1** (Nov 9 to 15) | Capacitor iOS project with CI builds. Keychain wallet with Face ID. Phone navigation and first-run walkthrough. Points ledger tables and API. First 200 quiz questions. Finish the testnet end-to-end run left from the web build. | App runs on a real iPhone on testnet. Wallet in the Keychain. Points can be earned and spent on testnet. |
| **Week 2** (Nov 16 to 22) | Daily Challenge, Speed Round, streaks and leaderboard. AdMob rewarded ads with server verification. App Attest and DeviceCheck. Push notifications. Offline quizzes. Account deletion and privacy. **TestFlight beta with 20+ testers. Submit to App Store by Day 14 (Nov 22).** | Full earn loop working on testnet with tests in CI. TestFlight link live. App Store review started. |
| **Week 3** (Nov 23 to 29) | Mainnet release: pool contract, x402 facilitator, database, hosting. Guardrails and signing-rule tests. Fix anything Apple review flags. **App Store release by Day 21.** Grow the quiz bank to 500+. | App live on the App Store, paying on mainnet. First mainnet tx hashes for each flow. |
| **Week 4** (Nov 30 to Dec 8) | Sponsor payer refill from the pool and first ad-revenue `fund()` on mainnet. Agent CLI on mainnet. `/proof` page. Bug fixes from TestFlight and App Store feedback. Walkthrough video and evidence export. | Every acceptance item checked, with tx links and CI runs. Ready to submit. |

### 5.2 Biggest risks and what we do about them

| Risk | What we do |
| --- | --- |
| **Apple Developer account takes too long.** A wallet app needs an organization account, which needs a D-U-N-S number (can take 1 to 2 weeks). | Apply for the D-U-N-S number and Apple account **before Day 1**. If it isn't ready, we publish under an existing organization account. **[confirm which]** |
| **Apple rejects the app.** | We submit by Day 14, which leaves a week for one or two rounds of fixes. We follow Apple's rules: no in-app purchase, points that aren't crypto, account deletion, native features. If it is still in review on Day 30, we hand in TestFlight plus the review messages. |
| **x402 libraries inside the iOS web view.** | The app runs the same JavaScript as the web app, which already pays on testnet. We test a paid question on a real iPhone in Week 1, so any problem shows up early. |
| **Bots farm points.** | App Attest, DeviceCheck, verified ad rewards, daily limits and a capped payer account. The worst-case loss per day is capped. |
| **AdMob account approval is slow.** | Ads are one of four ways to earn. Quizzes and streaks work without ads. |
| **Conflict with our Bequest Instaward** (same team and chapter). | Confirm with the Chapter Lead that both can run at the same time **before** submitting. **[confirm]** |

---

## 6. Evidence of Completion (Required)

All proof is public and easy to check, even without technical knowledge: an App Store link, Stellar Expert transaction links, the `/proof` page, the GitHub repo, CI runs and a walkthrough video.

### 6.1 Planned Evidence to Be Submitted

| Deliverable | Evidence Type | Description |
| --- | --- | --- |
| **Deliverable 1** | App Store link, TestFlight link, GitHub repo, CI run, screen recording | Public App Store listing. A recording of install, sign-up, Face ID wallet and a paid question on mainnet. iOS project code and CI build in the repo. |
| **Deliverable 2** | Screen recording, CI run with named tests, mainnet tx hashes | The earn loop from start to finish (quiz, streak, ad, spend points, answer with a Stellar Expert link). Named tests for ad verification, reinstall bonus block, point limits and double spend. Ad-revenue `fund()` tx on mainnet. |
| **Deliverable 3** | Mainnet contract ID, tx hash list, CI run, `/proof` URL, 3 to 5 min video, README | One mainnet tx for every money flow, signing-rule tests, live `/proof` page, step-by-step run instructions. |

### 6.2 Evidence Verification Checklist (For Ambassador Use)

| Deliverable | Evidence Present | Evidence Partial | Evidence Missing | Comments |
| --- | --- | --- | --- | --- |
| Deliverable 1 | ☐ | ☐ | ☐ | |
| Deliverable 2 | ☐ | ☐ | ☐ | |
| Deliverable 3 | ☐ | ☐ | ☐ | |

---

## 7. Next-Step Alignment

### 7.1 Anticipated Next Step After Completion

☑ Apply to SCF Build Award
☐ Continue development independently
☐ Apply for a follow-on Instaward (if eligible)
☐ Seek other ecosystem support
☐ Other:

**What comes next:** a student pilot at FEU and partner schools, the Android app on Google Play (same codebase), GCash top-up through a Stellar anchor (SEP-24) so students can pay with their own pesos, and passkey wallets.

---

## 8. Instawards Constraints Acknowledgement

By submitting this SOW, the Builder acknowledges:
☐ This scope will be completed within 30 days or less.
☐ Instawards support execution, not open-ended exploration.
☐ A project may receive no more than two follow-on Instawards.
☐ Each Instaward is capped at $5,000.
☐ Total Instawards funding may not exceed $15,000.

---

## 9. Submission Confirmation

Once finalized, the Ambassador Chapter Lead will submit this Statement of Work through the Instawards Airtable form for review and approval.
