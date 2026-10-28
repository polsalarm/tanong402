/**
 * End-to-end student journey against a running API (testnet), using the same
 * @tanong/wallet code the web app uses:
 *
 *   invite → sponsored account (0 XLM) → enrolled → relayed allowance claim → paid question
 *
 *   pnpm --filter @tanong/scripts e2e -- [API_URL] [INVITE]
 */
import { Keypair } from "@stellar/stellar-sdk";
import { explorerTxUrl, type ClientConfig } from "@tanong/shared";
import { createPaidFetch, getBalances, signAuthEntries, signTransactionXdr } from "@tanong/wallet";

const args = process.argv.slice(2).filter((a) => a !== "--");
const API = args[0] ?? "http://localhost:3001";
const INVITE = args[1] ?? "FEU002";

async function post<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(API + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = (await r.json()) as T & { error?: { code: string; message: string } };
  if (!r.ok) throw new Error(`${path} → ${r.status} ${j.error?.code}: ${j.error?.message}`);
  return j;
}

const step = (n: number, s: string) => console.log(`\n  ${n}. ${s}`);

async function main() {
  const config = (await (await fetch(`${API}/config`)).json()) as ClientConfig;
  const kp = Keypair.random();
  const address = kp.publicKey();
  console.log(`\n  Tanong402 · e2e student journey on ${config.network}\n  student ${address}`);

  step(1, `onboard with invite ${INVITE}`);
  const { xdr } = await post<{ xdr: string }>("/onboard", { address, inviteCode: INVITE });
  const signed = signTransactionXdr(kp.secret(), xdr, config.network);
  const onboard = await post<{ txHash: string }>("/onboard/submit", { address, signedXdr: signed });
  console.log(`     sponsored account + USDC trustline · ${explorerTxUrl(config.network, onboard.txHash)}`);

  step(2, "pool status");
  const status1 = (await (await fetch(`${API}/pool/status?address=${address}`)).json()) as Record<string, unknown>;
  console.log("    ", status1);

  step(3, "claim weekly allowance (relayed: student signs auth entry only)");
  const prep = await post<{ xdr: string; allowanceUsdc: string }>("/pool/claim/prepare", { address });
  const { entries, validUntilLedger } = JSON.parse(prep.xdr) as { entries: string[]; validUntilLedger: number };
  const signedEntries = await signAuthEntries(kp.secret(), entries, validUntilLedger, config.network);
  const claim = await post<{ txHash: string; amountUsdc: string }>("/pool/claim/submit", {
    address,
    signedXdr: JSON.stringify({ entries: signedEntries }),
  });
  console.log(`     claimed ${claim.amountUsdc} USDC · ${explorerTxUrl(config.network, claim.txHash)}`);

  const bal = await getBalances(address, config.horizonUrl, config.network);
  console.log(`     balance: ${bal.usdc} USDC, ${bal.xlm} XLM (student holds no XLM)`);

  step(4, "claim again (must be refused: too early)");
  try {
    await post("/pool/claim/prepare", { address });
    console.log("     ✗ unexpectedly allowed");
  } catch (err) {
    console.log(`     ✓ refused: ${(err as Error).message}`);
  }

  step(5, "ask a paid question");
  if (!config.paymentsEnabled || !config.payTo) {
    console.log("     payments are off on this server; skipping");
    return;
  }
  const paidFetch = createPaidFetch({ secret: kp.secret(), network: config.network, payTo: config.payTo, maxPriceUsdc: config.maxPriceUsdc });
  const { response, settlement } = await paidFetch(`${API}/ask`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ question: "Solve 2x^2 - 8x + 6 = 0", subject: "math" }),
  });
  const ans = (await response.json()) as { answer: string; priceUsdc: string };
  console.log(`     ${response.status} · paid ${ans.priceUsdc} USDC · ${settlement?.transaction ? explorerTxUrl(config.network, settlement.transaction) : "no settlement"}`);
  console.log(`     ${ans.answer.replace(/\s+/g, " ").slice(0, 120)}…`);
  const bal2 = await getBalances(address, config.horizonUrl, config.network);
  console.log(`     balance after: ${bal2.usdc} USDC`);
}

main().catch((err) => {
  console.error(`\n  ✗ ${err instanceof Error ? err.message : err}\n`);
  process.exit(1);
});
