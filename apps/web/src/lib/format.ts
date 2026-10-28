import { formatPhp, questionsLeft, usdToPhp } from "@tanong/shared";

/** USDC amount → "₱9.60" at the configured display rate. */
export function php(usdc: string | number, phpPerUsd: number): string {
  return formatPhp(usdToPhp(usdc, phpPerUsd));
}

export function phpValue(usdc: string | number, phpPerUsd: number): number {
  return Math.round(usdToPhp(usdc, phpPerUsd) * 100) / 100;
}

/** Split "₱1,234.50" into parts so big numbers can style the symbol and cents separately. */
export function phpParts(value: number): { symbol: string; whole: string; cents: string } {
  const [whole = "0", cents = "00"] = formatPhp(value).replace("₱", "").split(".");
  return { symbol: "₱", whole, cents };
}

export function questionsLeftFor(balanceUsdc: string | number, priceUsdc: string | number): number {
  return questionsLeft(balanceUsdc, priceUsdc);
}

export function questionsLabel(n: number, long = true): string {
  if (n <= 0) return long ? "No questions left" : "0 left";
  const noun = n === 1 ? "question" : "questions";
  return long ? `${n.toLocaleString("en-PH")} ${noun} left` : `${n.toLocaleString("en-PH")} left`;
}

const clockFmt = new Intl.DateTimeFormat("en-PH", { hour: "numeric", minute: "2-digit" });
const dayFmt = new Intl.DateTimeFormat("en-PH", { weekday: "short", month: "short", day: "numeric" });
const dateFmt = new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric" });
const weekdayFmt = new Intl.DateTimeFormat("en-PH", { weekday: "long" });
const shortDateFmt = new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric" });
const monthYearFmt = new Intl.DateTimeFormat("en-PH", { month: "2-digit", year: "2-digit" });

export function formatClock(iso: string | number | Date): string {
  return clockFmt.format(new Date(iso));
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function formatDayLabel(iso: string | number | Date, now = new Date()): string {
  const d = new Date(iso);
  const diff = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return dayFmt.format(d);
}

export function formatDateTime(iso: string | number | Date): string {
  const d = new Date(iso);
  return `${formatDayLabel(d)} · ${clockFmt.format(d)}`;
}

export function formatDate(iso: string | number | Date): string {
  return dateFmt.format(new Date(iso));
}

export function formatShortDate(iso: string | number | Date): string {
  return shortDateFmt.format(new Date(iso));
}

export function formatWeekday(iso: string | number | Date): string {
  return weekdayFmt.format(new Date(iso));
}

/** "10/26" style, like the "member since" line on a card. */
export function formatMonthYear(iso: string | number | Date): string {
  return monthYearFmt.format(new Date(iso));
}

export function timeAgo(iso: string | number | Date, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

/** Countdown text for the next allowance: "2d 4h", "4h 12m", "12m 08s". */
export function countdown(ms: number): string {
  if (ms <= 0) return "now";
  const total = Math.floor(ms / 1000);
  const d = Math.floor(total / 86_400);
  const h = Math.floor((total % 86_400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

export function seconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)} s`;
}

export function shortHash(hash: string, head = 6, tail = 4): string {
  return hash.length <= head + tail + 1 ? hash : `${hash.slice(0, head)}…${hash.slice(-tail)}`;
}

/** Student-facing receipt number derived from the payment proof id. No jargon. */
export function receiptNumber(hashOrId: string): string {
  const clean = hashOrId.replace(/[^a-z0-9]/gi, "").toUpperCase();
  return `T402-${clean.slice(0, 4)}-${clean.slice(-4)}`;
}

/** Card-style grouping of an account id: "GDX4 ·· 7QKP". */
export function cardId(address: string): string {
  return `${address.slice(0, 4)} ·· ${address.slice(-4)}`;
}

export function greeting(now = new Date()): string {
  const h = now.getHours();
  if (h < 5) return "Late night study";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export function uid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
