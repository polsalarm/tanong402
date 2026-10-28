/**
 * In-browser stand-in for apps/api (VITE_MOCK_API=true), so the app is demoable on its own.
 * Every response is shaped exactly like the real API and still goes through the zod schemas.
 * The wallet, signing and inspection code paths are real; only the server side is simulated.
 *
 * Invite codes: anything works; codes starting with DEMO add a believable week of history;
 * codes containing BAD or USED are rejected; codes starting with OFF act as "not configured".
 * Ask "#fail" anywhere in a question to see the not-charged error state.
 * Flags (localStorage "t402.mock.flags", JSON): { "payments": false } for demo mode,
 * { "offline": true } to simulate the API being down.
 */
import {
  askRequest,
  fromUnits,
  USDC_ADDRESS,
  USDC_ISSUER,
  type ClientConfig,
  type ErrorCode,
  type PoolStatus,
} from "@tanong/shared";
import { API_URL } from "../env";
import { pickAnswer } from "./answers";
import { MOCK, SPONSORS, buildStats, randomHash, seededHistory, type MockQuestion } from "./data";

const STATE_KEY = "t402.mock.v1";
const FLAGS_KEY = "t402.mock.flags";

interface MockAccount {
  exists: boolean;
  enrolled: boolean;
  units: number;
  lastClaimAt: number | null;
  totalClaimedUnits: number;
  inviteCode: string | null;
  pendingHash: string | null;
  questions: MockQuestion[];
}

interface MockState {
  accounts: Record<string, MockAccount>;
  nonces: Record<string, string>;
}

function loadState(): MockState {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (raw) return JSON.parse(raw) as MockState;
  } catch {
    /* fresh state */
  }
  return { accounts: {}, nonces: {} };
}

const state = loadState();
const save = () => {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
};

function flags(): { payments?: boolean; offline?: boolean } {
  try {
    return JSON.parse(localStorage.getItem(FLAGS_KEY) ?? "{}") as { payments?: boolean; offline?: boolean };
  } catch {
    return {};
  }
}

function account(address: string): MockAccount {
  return (state.accounts[address] ??= {
    exists: false,
    enrolled: false,
    units: 0,
    lastClaimAt: null,
    totalClaimedUnits: 0,
    inviteCode: null,
    pendingHash: null,
    questions: [],
  });
}

const chain = () => import("./chain");

/**
 * Screenshot/demo fixture: an onboarded, enrolled account with a week of history and a balance.
 * Only reachable from lib/mock/seed.ts, which only loads in VITE_MOCK_API builds.
 */
export function seedAccount(address: string, opts: { units: number; claimedHoursAgo: number }) {
  const acct = account(address);
  const now = Date.now();
  acct.exists = true;
  acct.enrolled = true;
  acct.units = opts.units;
  acct.inviteCode = "DEMO-SEED";
  acct.pendingHash = null;
  acct.lastClaimAt = now - opts.claimedHoursAgo * 3_600_000;
  acct.totalClaimedUnits = MOCK.allowanceUnits * 3;
  if (acct.questions.length === 0) acct.questions = seededHistory(now);
  save();
  return acct.questions;
}

function delay(ms: number, signal?: AbortSignal | null): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
    const id = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(id);
        reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

const jitter = (min: number, max: number) => min + Math.floor(Math.random() * (max - min));

function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

const fail = (status: number, code: ErrorCode, message: string) => json(status, { error: { code, message } });

function encodeHeader(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  return btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(""));
}

function config(): ClientConfig {
  return {
    network: MOCK.network,
    horizonUrl: MOCK.horizonUrl,
    rpcUrl: MOCK.rpcUrl,
    payTo: MOCK.payTo,
    priceUsdc: MOCK.priceUsdc,
    phpPerUsd: MOCK.phpPerUsd,
    maxPriceUsdc: MOCK.maxPriceUsdc,
    paymentsEnabled: flags().payments !== false,
    tutorLive: true,
    poolContractId: MOCK.poolContractId,
    poolEnabled: true,
    usdcAddress: USDC_ADDRESS[MOCK.network],
    models: [
      { id: "auto", label: "Auto", hint: "Picks the best model for each question", tier: "standard", priceUsdc: MOCK.priceUsdc },
      { id: "openai", label: "GPT-5 mini", hint: "Careful step-by-step reasoning", tier: "standard", priceUsdc: MOCK.priceUsdc },
      { id: "gemini", label: "Gemini Flash", hint: "Fast, great with math and Taglish", tier: "standard", priceUsdc: MOCK.priceUsdc },
      { id: "groq", label: "Groq · Llama / GPT-OSS", hint: "Fastest replies", tier: "standard", priceUsdc: MOCK.priceUsdc },
      { id: "pro-openai", label: "GPT-5.4", hint: "Strongest reasoning for proofs and code", tier: "pro", priceUsdc: "0.02" },
      { id: "pro-gemini", label: "Gemini Pro", hint: "Deep thinking for hard problems", tier: "pro", priceUsdc: "0.02" },
    ],
    proPriceUsdc: "0.02",
  };
}

function nextClaimAt(acct: MockAccount): number | null {
  return acct.lastClaimAt ? acct.lastClaimAt + MOCK.periodSeconds * 1000 : null;
}

function poolStatus(acct: MockAccount): PoolStatus {
  const next = nextClaimAt(acct);
  return {
    enrolled: acct.enrolled,
    allowanceUsdc: MOCK.allowanceUsdc,
    periodSeconds: MOCK.periodSeconds,
    nextClaimAt: acct.enrolled && next ? new Date(next).toISOString() : null,
    canClaim: acct.enrolled && (!next || next <= Date.now()),
    totalClaimedUsdc: fromUnits(BigInt(acct.totalClaimedUnits)),
    poolBalanceUsdc: "71.4",
    sponsors: SPONSORS,
  };
}

function bearer(req: Request): string | null {
  const h = req.headers.get("authorization");
  const token = h?.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token?.startsWith("mock.")) return null;
  try {
    return atob(token.split(".")[1] ?? "");
  } catch {
    return null;
  }
}

async function body<T>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}

async function handleHorizon(url: URL, signal: AbortSignal): Promise<Response> {
  await delay(jitter(120, 260), signal);
  const address = url.pathname.split("/").pop() ?? "";
  const acct = state.accounts[address];
  if (!acct?.exists) return json(404, { status: 404, title: "Resource Missing" });
  return json(200, {
    id: address,
    balances: [
      {
        asset_type: "credit_alphanum4",
        asset_code: "USDC",
        asset_issuer: USDC_ISSUER[MOCK.network],
        balance: fromUnits(BigInt(acct.units)),
      },
      { asset_type: "native", balance: "0.0000000" },
    ],
  });
}

async function handleApi(req: Request, path: string, url: URL): Promise<Response> {
  const signal = req.signal;
  const method = req.method.toUpperCase();

  if (method === "GET" && path === "/config") {
    await delay(jitter(90, 180), signal);
    return json(200, config());
  }

  if (method === "GET" && path === "/price") {
    await delay(80, signal);
    return json(200, {
      priceUsdc: MOCK.priceUsdc,
      pricePhp: Number((Number(MOCK.priceUsdc) * MOCK.phpPerUsd).toFixed(2)),
      phpPerUsd: MOCK.phpPerUsd,
      asset: USDC_ADDRESS[MOCK.network],
      network: MOCK.network,
      payTo: MOCK.payTo,
    });
  }

  if (method === "GET" && path === "/stats") {
    await delay(jitter(220, 420), signal);
    const own = Object.values(state.accounts).flatMap((a) => a.questions.filter((q) => !q.id.startsWith("seed-")));
    own.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return json(200, buildStats(Date.now(), own));
  }

  if (method === "POST" && path === "/onboard") {
    await delay(jitter(700, 1100), signal);
    const b = await body<{ address?: string; inviteCode?: string }>(req);
    const code = (b?.inviteCode ?? "").trim().toUpperCase();
    if (!b?.address || !/^G[A-Z2-7]{55}$/.test(b.address) || code.length < 4) {
      return fail(400, "INVALID_INPUT", "inviteCode: Enter the code from your school or org");
    }
    if (/^OFF/.test(code)) return fail(503, "NOT_CONFIGURED", "Onboarding is not configured yet");
    if (/BAD|USED/.test(code)) return fail(400, "INVITE_INVALID", "That invite code isn't valid or was already used");
    const acct = account(b.address);
    if (acct.exists) return fail(400, "INVALID_INPUT", "This account is already set up");
    const { buildOnboardingTx } = await chain();
    const tx = buildOnboardingTx(b.address, MOCK.network);
    acct.pendingHash = tx.hash;
    acct.inviteCode = code;
    save();
    return json(200, { xdr: tx.xdr, network: MOCK.network });
  }

  if (method === "POST" && path === "/onboard/submit") {
    await delay(jitter(1300, 1900), signal);
    const b = await body<{ address?: string; signedXdr?: string }>(req);
    const acct = b?.address ? state.accounts[b.address] : undefined;
    if (!b?.address || !b.signedXdr || !acct?.pendingHash) {
      return fail(400, "INVALID_INPUT", "Onboarding expired, start again");
    }
    const { isOnboardingSigned } = await chain();
    if (!isOnboardingSigned(b.signedXdr, b.address, MOCK.network, acct.pendingHash)) {
      return fail(400, "INVALID_INPUT", "Transaction does not match what the server prepared");
    }
    acct.exists = true;
    acct.enrolled = true;
    acct.pendingHash = null;
    if (acct.inviteCode?.startsWith("DEMO")) {
      const now = Date.now();
      acct.questions = seededHistory(now);
      acct.lastClaimAt = now - MOCK.periodSeconds * 1000 - 2 * 3_600_000;
      acct.totalClaimedUnits = MOCK.allowanceUnits;
    }
    save();
    return json(200, { txHash: randomHash() });
  }

  if (method === "GET" && path === "/pool/status") {
    await delay(jitter(160, 300), signal);
    const address = url.searchParams.get("address") ?? "";
    if (!/^G[A-Z2-7]{55}$/.test(address)) return fail(400, "INVALID_INPUT", "Invalid Stellar address");
    return json(200, poolStatus(state.accounts[address] ?? account(address)));
  }

  if (method === "POST" && path === "/pool/join") {
    await delay(jitter(1200, 1800), signal);
    const address = bearer(req);
    if (!address) return fail(401, "UNAUTHORIZED", "Sign in required");
    const b = await body<{ inviteCode?: string }>(req);
    const code = (b?.inviteCode ?? "").trim().toUpperCase();
    if (code.length < 4) return fail(400, "INVALID_INPUT", "inviteCode: Enter the code from your school or org");
    if (/BAD|USED/.test(code)) return fail(400, "INVITE_INVALID", "That invite code isn't valid or was already used");
    const acct = account(address);
    if (acct.enrolled) return fail(400, "INVALID_INPUT", "This account already gets the weekly allowance");
    acct.exists = true;
    acct.enrolled = true;
    acct.inviteCode = code;
    save();
    return json(200, { txHash: randomHash() });
  }

  if (method === "POST" && path === "/pool/claim/prepare") {
    await delay(jitter(500, 800), signal);
    const b = await body<{ address?: string }>(req);
    const acct = b?.address ? state.accounts[b.address] : undefined;
    if (!b?.address || !acct?.enrolled) return fail(403, "NOT_ENROLLED", "You're not in the Scholarship Pool yet");
    const next = nextClaimAt(acct);
    if (next && next > Date.now()) return fail(409, "CLAIM_TOO_EARLY", "Your next allowance isn't ready yet");
    const { buildClaimEntry } = await chain();
    const entries = [buildClaimEntry(b.address, MOCK.poolContractId)];
    return json(200, {
      xdr: JSON.stringify({ entries, validUntilLedger: 1_284_402 }),
      allowanceUsdc: MOCK.allowanceUsdc,
      nextClaimAt: null,
    });
  }

  if (method === "POST" && path === "/pool/claim/submit") {
    await delay(jitter(1400, 2000), signal);
    const b = await body<{ address?: string; signedXdr?: string }>(req);
    const acct = b?.address ? state.accounts[b.address] : undefined;
    if (!b?.address || !acct?.enrolled) return fail(403, "NOT_ENROLLED", "You're not in the Scholarship Pool yet");
    let entries: string[] = [];
    try {
      entries = (JSON.parse(b.signedXdr ?? "{}") as { entries?: string[] }).entries ?? [];
    } catch {
      return fail(400, "INVALID_INPUT", "Malformed authorization");
    }
    const { areClaimEntriesSigned } = await chain();
    if (!areClaimEntriesSigned(entries, b.address)) return fail(400, "INVALID_INPUT", "Authorization does not match the claim");
    const next = nextClaimAt(acct);
    if (next && next > Date.now()) return fail(409, "CLAIM_TOO_EARLY", "Your next allowance isn't ready yet");
    acct.units += MOCK.allowanceUnits;
    acct.totalClaimedUnits += MOCK.allowanceUnits;
    acct.lastClaimAt = Date.now();
    save();
    return json(200, { txHash: randomHash(), amountUsdc: MOCK.allowanceUsdc });
  }

  if (method === "POST" && path === "/auth/challenge") {
    await delay(120, signal);
    const b = await body<{ address?: string }>(req);
    if (!b?.address) return fail(400, "INVALID_INPUT", "Invalid Stellar address");
    const nonce = randomHash().slice(0, 32);
    state.nonces[nonce] = b.address;
    return json(200, { nonce, message: `Tanong402 sign-in\naddress:${b.address}\nnonce:${nonce}` });
  }

  if (method === "POST" && path === "/auth/verify") {
    await delay(140, signal);
    const b = await body<{ address?: string; nonce?: string; signature?: string }>(req);
    if (!b?.address || !b.nonce || !b.signature || state.nonces[b.nonce] !== b.address) {
      return fail(401, "UNAUTHORIZED", "Challenge expired, try again");
    }
    delete state.nonces[b.nonce];
    const { verifyMessage } = await chain();
    if (!verifyMessage(b.address, `Tanong402 sign-in\naddress:${b.address}\nnonce:${b.nonce}`, b.signature)) {
      return fail(401, "UNAUTHORIZED", "Signature check failed");
    }
    return json(200, {
      token: `mock.${btoa(b.address)}.${Date.now()}`,
      expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
    });
  }

  if (method === "GET" && path === "/receipts") {
    await delay(jitter(220, 380), signal);
    const address = bearer(req);
    if (!address) return fail(401, "UNAUTHORIZED", "Sign in required");
    const all = [...(state.accounts[address]?.questions ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const cursor = url.searchParams.get("cursor");
    const rest = cursor ? all.filter((q) => q.createdAt < cursor) : all;
    const page = rest.slice(0, 25);
    return json(200, {
      items: page.map((q) => ({
        id: q.id,
        question: q.question,
        answerPreview: q.answer ? q.answer.slice(0, 280) : null,
        subject: q.subject,
        model: q.model,
        priceUsdc: q.priceUsdc,
        txHash: q.txHash,
        network: q.network,
        status: q.status,
        latencyMs: q.latencyMs,
        createdAt: q.createdAt,
      })),
      nextCursor: rest.length > page.length ? (page[page.length - 1]?.createdAt ?? null) : null,
    });
  }

  if (method === "DELETE" && path.startsWith("/receipts/")) {
    await delay(160, signal);
    const address = bearer(req);
    if (!address) return fail(401, "UNAUTHORIZED", "Sign in required");
    const id = decodeURIComponent(path.slice("/receipts/".length));
    const q = state.accounts[address]?.questions.find((x) => x.id === id);
    if (!q) return fail(404, "NOT_FOUND", "Receipt not found");
    q.question = null;
    q.answer = null;
    save();
    return json(200, { ok: true });
  }

  if (method === "POST" && path === "/ask") {
    const raw = await body<unknown>(req);
    const parsed = askRequest.safeParse(raw);
    if (!parsed.success) {
      return fail(400, "INVALID_INPUT", parsed.error.issues.map((i) => i.message).join("; ") || "Invalid question");
    }
    const q = parsed.data;
    const cfg = config();
    let payer: string | null = null;

    if (cfg.paymentsEnabled) {
      const sig = req.headers.get("PAYMENT-SIGNATURE");
      if (!sig) {
        return new Response("{}", {
          status: 402,
          headers: {
            "content-type": "application/json",
            "PAYMENT-REQUIRED": encodeHeader({
              x402Version: 2,
              error: "Payment required",
              resource: { url: `${API_URL}/ask`, description: "One tutor answer", mimeType: "application/json" },
              accepts: [
                {
                  scheme: "exact",
                  network: MOCK.network,
                  amount: String(MOCK.priceUnits),
                  asset: USDC_ADDRESS[MOCK.network],
                  payTo: MOCK.payTo,
                  maxTimeoutSeconds: 300,
                  extra: {},
                },
              ],
            }),
          },
        });
      }
      try {
        payer = (JSON.parse(atob(sig)) as { payer?: string }).payer ?? null;
      } catch {
        payer = null;
      }
      const acct = payer ? state.accounts[payer] : undefined;
      if (!payer || !acct?.exists || acct.units < MOCK.priceUnits) {
        await delay(300, signal);
        return json(402, { error: "insufficient_funds" });
      }
    }

    await delay(jitter(1700, 2600), signal);
    if (/#fail/i.test(q.question)) {
      return fail(502, "MODEL_ERROR", "The tutor couldn't answer right now. You were not charged.");
    }

    const picked = pickAnswer(q.question, q.history ?? []);
    const id = crypto.randomUUID();
    const txHash = cfg.paymentsEnabled ? randomHash() : null;
    const model = picked.hard ? MOCK.hardModel : MOCK.model;
    if (payer) {
      const acct = account(payer);
      acct.units -= MOCK.priceUnits;
      acct.questions.unshift({
        id,
        question: q.question,
        answer: picked.answer,
        subject: q.subject ?? null,
        model,
        priceUsdc: MOCK.priceUsdc,
        txHash,
        network: MOCK.network,
        status: "settled",
        latencyMs: jitter(2400, 3600),
        createdAt: new Date().toISOString(),
      });
      save();
    }
    const headers: Record<string, string> = {};
    if (txHash) {
      headers["PAYMENT-RESPONSE"] = encodeHeader({ success: true, transaction: txHash, network: MOCK.network, payer });
    }
    return json(
      200,
      {
        id,
        answer: picked.answer,
        model,
        priceUsdc: cfg.paymentsEnabled ? MOCK.priceUsdc : "0",
        tokens: { input: 180 + q.question.length, output: Math.round(picked.answer.length / 3.6) },
      },
      headers,
    );
  }

  return fail(404, "NOT_FOUND", "Not found");
}

export const mockFetch: typeof fetch = async (input, init) => {
  const req = input instanceof Request ? input : new Request(input, init);
  const url = new URL(req.url);

  if (url.href.startsWith(MOCK.horizonUrl)) return handleHorizon(url, req.signal);

  if (!url.href.startsWith(API_URL)) return globalThis.fetch(req);

  if (flags().offline) {
    await delay(400, req.signal);
    throw new TypeError("Failed to fetch");
  }
  const path = url.pathname.replace(new URL(API_URL).pathname.replace(/\/$/, ""), "") || "/";
  return handleApi(req, path, url);
};
