/**
 * Tanong402 study-buddy agent.
 *
 * An autonomous program with its own Stellar key that pays Tanong402 per question over x402:
 *   discover price → POST /ask → 402 → sign USDC payment → retry → answer + settlement tx.
 * No API key, no signup. Spend is capped per payment and per run.
 */
import { DEFAULT_RPC_URL, explorerTxUrl, toUnits, type StellarNetwork } from "@tanong/shared";
import { decodePaymentResponseHeader, wrapFetchWithPayment, x402Client } from "@x402/fetch";
import { createEd25519Signer } from "@x402/stellar";
import { ExactStellarScheme } from "@x402/stellar/exact/client";
import { Keypair } from "@stellar/stellar-sdk";

const SECRET = process.env.STELLAR_PRIVATE_KEY;
const SERVER = (process.env.SERVER_URL ?? "http://localhost:3001").replace(/\/+$/, "");
const NETWORK = (process.env.NETWORK ?? "stellar:testnet") as StellarNetwork;
const MAX_QUESTIONS = Number(process.env.MAX_QUESTIONS ?? 3);
const MAX_PRICE_USDC = process.env.MAX_PRICE_USDC ?? "0.02";

const SYLLABUS = [
  { subject: "math", question: "Solve 2x^2 - 8x + 6 = 0 step by step." },
  { subject: "physics", question: "Explain Newton's second law with one worked example." },
  { subject: "programming", question: "Bakit may NullPointerException ako sa Java? Paano i-fix?" },
  { subject: "chemistry", question: "How many moles are in 36 g of water?" },
  { subject: "math", question: "What is the derivative of x^3 sin(x)?" },
] as const;

const c = {
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  silver: (s: string) => `\x1b[38;5;252m${s}\x1b[0m`,
  ok: (s: string) => `\x1b[38;5;115m${s}\x1b[0m`,
  err: (s: string) => `\x1b[38;5;217m${s}\x1b[0m`,
};

async function main() {
  if (!SECRET) {
    console.error(c.err("STELLAR_PRIVATE_KEY is required (see .env.example)."));
    process.exit(1);
  }
  const address = Keypair.fromSecret(SECRET).publicKey();

  // 1. Discover price + payee, so we can refuse anything unexpected.
  const price = (await (await fetch(`${SERVER}/price`)).json()) as { priceUsdc: string; payTo: string; network: string };
  if (price.network !== NETWORK) throw new Error(`Server is on ${price.network}, agent is on ${NETWORK}`);
  const maxUnits = toUnits(MAX_PRICE_USDC);

  console.log(c.silver("\n  Tanong402 · study-buddy agent"));
  console.log(c.dim(`  agent   ${address}`));
  console.log(c.dim(`  server  ${SERVER}  (${price.priceUsdc} USDC/question → ${price.payTo || "demo"})\n`));

  // 2. x402 client: only pay the advertised payee, only up to our cap.
  const signer = createEd25519Signer(SECRET, NETWORK);
  const client = new x402Client()
    .register(NETWORK, new ExactStellarScheme(signer, { url: process.env.STELLAR_RPC_URL ?? DEFAULT_RPC_URL[NETWORK] }))
    .registerPolicy((_v, reqs) => reqs.filter((r) => r.payTo === price.payTo && BigInt(r.amount) <= maxUnits));
  const paidFetch = wrapFetchWithPayment(fetch, client);

  let spentUnits = 0n;
  for (const item of SYLLABUS.slice(0, MAX_QUESTIONS)) {
    const started = Date.now();
    process.stdout.write(c.silver(`  ? ${item.question}\n`));
    const res = await paidFetch(`${SERVER}/ask`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(item),
    });
    const body = (await res.json()) as { answer?: string; priceUsdc?: string; error?: { message: string } };
    if (!res.ok) {
      console.log(c.err(`    ✗ ${res.status} ${body.error?.message ?? ""}\n`));
      continue;
    }
    const header = res.headers.get("PAYMENT-RESPONSE") ?? res.headers.get("X-PAYMENT-RESPONSE");
    const settle = header ? (decodePaymentResponseHeader(header) as { transaction?: string }) : null;
    spentUnits += toUnits(body.priceUsdc ?? "0");
    const preview = (body.answer ?? "").replace(/\s+/g, " ").slice(0, 140);
    console.log(c.dim(`    ${preview}…`));
    console.log(
      settle?.transaction
        ? c.ok(`    ✓ paid ${body.priceUsdc} USDC in ${((Date.now() - started) / 1000).toFixed(1)}s · ${explorerTxUrl(NETWORK, settle.transaction)}\n`)
        : c.ok(`    ✓ answered (demo mode, no payment)\n`),
    );
  }
  console.log(c.silver(`  spent ${Number(spentUnits) / 1e7} USDC total\n`));
}

main().catch((err) => {
  console.error(c.err(`\n  ${err instanceof Error ? err.message : String(err)}\n`));
  process.exit(1);
});
