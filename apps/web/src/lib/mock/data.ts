import { DEFAULT_HORIZON_URL, DEFAULT_RPC_URL, type StatsResponse } from "@tanong/shared";
import { pickAnswer } from "./answers";

export const MOCK = {
  network: "stellar:testnet" as const,
  horizonUrl: DEFAULT_HORIZON_URL["stellar:testnet"],
  rpcUrl: DEFAULT_RPC_URL["stellar:testnet"],
  payTo: "GARPCE4SZS7AW4UXB5USPBABMJLBIHKAOAUVPPHZUBJV7FDZ42UQ3KQ3",
  poolContractId: "CBCHGSQ4AD56RQGO2HDDQLHOXAKWCZEPWZABRXY2KJI4C62HDDVLPLEN",
  priceUsdc: "0.005",
  priceUnits: 50_000,
  phpPerUsd: 60,
  maxPriceUsdc: "0.02",
  allowanceUsdc: "0.25",
  allowanceUnits: 2_500_000,
  periodSeconds: 7 * 86_400,
  model: "gemini-flash-lite",
  hardModel: "gemini-flash",
};

export const SPONSORS = [
  { name: "Student org fund", address: "GCVUK3UAOXUDFRXMUTMOTX6SB4HSIT2TKIML76RJVM3ZG5J3H5NV5PXL" },
  { name: "Alumni circle", address: "GBMPAY4UNQDDYYEU5KVW3RCR2EYLME4WV7TNJUTJ5UC74Q6JA2I3QXDS" },
  { name: "Community sponsors", address: null },
];

/** Small deterministic PRNG so demo stats look the same on every reload. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashFrom(rand: () => number): string {
  let s = "";
  for (let i = 0; i < 64; i++) s += Math.floor(rand() * 16).toString(16);
  return s;
}

export function randomHash(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

const SUBJECT_CYCLE = ["math", "programming", "physics", "math", "writing", "chemistry", "filipino", "math", "physics"];

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function buildStats(now: number, own: { txHash: string | null; priceUsdc: string; subject: string | null; createdAt: string }[]): StatsResponse {
  const rand = mulberry32(402);
  const daily: { day: string; count: number }[] = [];
  const today = new Date(now);
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    const weekend = d.getDay() === 0 || d.getDay() === 6;
    const base = 14 + (29 - i) * 3.4;
    const examBump = i === 9 || i === 10 ? 1.35 : 1;
    const count = Math.round(base * (weekend ? 0.68 : 1) * examBump * (0.86 + rand() * 0.28));
    daily.push({ day: dayKey(d), count });
  }
  const ownToday = own.filter((q) => dayKey(new Date(q.createdAt)) === dayKey(today)).length;
  const last = daily[daily.length - 1];
  if (last) last.count += ownToday;

  const inWindow = daily.reduce((s, d) => s + d.count, 0);
  const paidQuestions = inWindow + 186;

  const latest: StatsResponse["latest"] = own
    .filter((q) => q.txHash)
    .map((q) => ({ txHash: q.txHash!, priceUsdc: q.priceUsdc, subject: q.subject, createdAt: q.createdAt }));
  let t = now - 3 * 60_000;
  const feedRand = mulberry32(Math.floor(now / 600_000));
  while (latest.length < 20) {
    latest.push({
      txHash: hashFrom(feedRand),
      priceUsdc: MOCK.priceUsdc,
      subject: SUBJECT_CYCLE[latest.length % SUBJECT_CYCLE.length] ?? null,
      createdAt: new Date(t).toISOString(),
    });
    t -= (2 + Math.floor(feedRand() * 11)) * 60_000;
  }

  return {
    network: MOCK.network,
    students: 128,
    paidQuestions,
    totalPaidUsdc: (paidQuestions * 0.005).toFixed(3),
    poolBalanceUsdc: "71.4",
    poolContractId: MOCK.poolContractId,
    sponsors: 7,
    daily,
    latest: latest.slice(0, 20),
  };
}

export interface MockQuestion {
  id: string;
  question: string | null;
  answer: string | null;
  subject: string | null;
  model: string;
  priceUsdc: string;
  txHash: string | null;
  network: string;
  status: "answered" | "settled" | "settle_failed";
  latencyMs: number | null;
  createdAt: string;
}

const HISTORY: { q: string; subject: string; daysAgo: number; at: [number, number] }[] = [
  { q: "Why does my Java object return null?", subject: "programming", daysAgo: 1, at: [21, 18] },
  { q: "Explain Newton's second law simply", subject: "physics", daysAgo: 1, at: [23, 7] },
  { q: "Help me outline my thesis statement", subject: "writing", daysAgo: 2, at: [22, 21] },
  { q: "How do I find the derivative of x³ + 2x?", subject: "math", daysAgo: 2, at: [20, 50] },
  { q: "How many moles are in 18 g of water?", subject: "chemistry", daysAgo: 3, at: [19, 34] },
  { q: "Ano ang pagkakaiba ng ng at nang?", subject: "filipino", daysAgo: 4, at: [21, 2] },
  { q: "Can you factor 2x² − 8x + 6 for me?", subject: "math", daysAgo: 5, at: [22, 45] },
];

/** A believable week of past questions for the DEMO invite code. */
export function seededHistory(now: number): MockQuestion[] {
  const rand = mulberry32(7);
  const today = new Date(now);
  return HISTORY.map((h, i) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - h.daysAgo, h.at[0], h.at[1]);
    return {
      id: `seed-${i}-${hashFrom(rand).slice(0, 8)}`,
      question: h.q,
      answer: pickAnswer(h.q).answer,
      subject: h.subject,
      model: MOCK.model,
      priceUsdc: MOCK.priceUsdc,
      txHash: hashFrom(rand),
      network: MOCK.network,
      status: "settled" as const,
      latencyMs: 3600 + Math.floor(rand() * 2600),
      createdAt: d.toISOString(),
    };
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
