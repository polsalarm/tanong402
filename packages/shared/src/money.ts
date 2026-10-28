import { TOKEN_DECIMALS, UNITS_PER_TOKEN } from "./constants.js";

/** "0.005" → 50000n (7-decimal token units). Throws on >7 decimals. */
export function toUnits(amount: string): bigint {
  const trimmed = amount.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) throw new Error(`Invalid amount: ${amount}`);
  const [whole = "0", frac = ""] = trimmed.split(".");
  if (frac.length > TOKEN_DECIMALS) throw new Error(`Too many decimals: ${amount}`);
  return BigInt(whole) * UNITS_PER_TOKEN + BigInt(frac.padEnd(TOKEN_DECIMALS, "0"));
}

/** 50000n → "0.005" */
export function fromUnits(units: bigint): string {
  const neg = units < 0n;
  const abs = neg ? -units : units;
  const whole = abs / UNITS_PER_TOKEN;
  const frac = (abs % UNITS_PER_TOKEN).toString().padStart(TOKEN_DECIMALS, "0").replace(/0+$/, "");
  return `${neg ? "-" : ""}${whole}${frac ? `.${frac}` : ""}`;
}

export function usdToPhp(usdc: string | number, phpPerUsd: number): number {
  return Number(usdc) * phpPerUsd;
}

const phpFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatPhp(php: number): string {
  return phpFormatter.format(php);
}

export function formatUsdcAsPhp(usdc: string | number, phpPerUsd: number): string {
  return formatPhp(usdToPhp(usdc, phpPerUsd));
}

/** How many whole questions a USDC balance buys. */
export function questionsLeft(balanceUsdc: string | number, priceUsdc: string | number): number {
  const bal = Number(balanceUsdc);
  const price = Number(priceUsdc);
  if (!(price > 0) || !(bal > 0)) return 0;
  return Math.floor((bal + 1e-9) / price);
}

export function shortAddress(address: string, head = 4, tail = 4): string {
  return address.length <= head + tail + 1 ? address : `${address.slice(0, head)}…${address.slice(-tail)}`;
}
