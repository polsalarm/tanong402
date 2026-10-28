/**
 * One-shot testnet setup for local development.
 *
 *   pnpm --filter @tanong/scripts setup:testnet
 *
 * Creates (or reuses) three testnet keys, funds them with Friendbot, adds USDC trustlines,
 * tries to buy a little testnet USDC on the SDEX for the agent, and writes:
 *   apps/api/.env            (receiver address, treasury secret, testnet facilitator)
 *   examples/agent-cli/.env  (agent secret)
 * Both files are gitignored. Secrets are never printed.
 */
import {
  Asset,
  BASE_FEE,
  Horizon,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { USDC_ISSUER } from "@tanong/shared";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const API_ENV = resolve(ROOT, "apps/api/.env");
const AGENT_ENV = resolve(ROOT, "examples/agent-cli/.env");
const HORIZON = "https://horizon-testnet.stellar.org";
const horizon = new Horizon.Server(HORIZON);
const USDC = new Asset("USDC", USDC_ISSUER["stellar:testnet"]);

function readEnv(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split("\n")
      .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
      .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
  );
}

function upsertEnv(path: string, values: Record<string, string>, header: string) {
  const current = existsSync(path) ? readFileSync(path, "utf8") : `${header}\n`;
  const lines = current.split("\n");
  for (const [k, v] of Object.entries(values)) {
    const i = lines.findIndex((l) => l.startsWith(`${k}=`));
    if (i >= 0) lines[i] = `${k}=${v}`;
    else lines.push(`${k}=${v}`);
  }
  writeFileSync(path, lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n", { mode: 0o600 });
}

async function friendbot(address: string) {
  try {
    await horizon.loadAccount(address);
    return "exists";
  } catch {
    const r = await fetch(`https://friendbot.stellar.org?addr=${address}`);
    if (!r.ok) throw new Error(`Friendbot failed for ${address}: ${r.status}`);
    return "funded";
  }
}

async function ensureTrustline(kp: Keypair) {
  const acc = await horizon.loadAccount(kp.publicKey());
  const has = acc.balances.some((b) => "asset_code" in b && b.asset_code === "USDC" && b.asset_issuer === USDC.getIssuer());
  if (has) return "exists";
  const tx = new TransactionBuilder(acc, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
    .addOperation(Operation.changeTrust({ asset: USDC }))
    .setTimeout(60)
    .build();
  tx.sign(kp);
  await horizon.submitTransaction(tx);
  return "added";
}

async function usdcBalance(address: string): Promise<number> {
  const acc = await horizon.loadAccount(address);
  const b = acc.balances.find((x) => "asset_code" in x && x.asset_code === "USDC" && x.asset_issuer === USDC.getIssuer());
  return b ? Number(b.balance) : 0;
}

/** Try to swap XLM → USDC on the testnet DEX. Liquidity on testnet comes and goes. */
async function buyUsdc(kp: Keypair, usdcWanted: string): Promise<string> {
  const paths = await horizon.strictReceivePaths([Asset.native()], USDC, usdcWanted).call();
  const best = paths.records.sort((a, b) => Number(a.source_amount) - Number(b.source_amount))[0];
  if (!best) return "no DEX liquidity right now";
  const sendMax = (Number(best.source_amount) * 1.05).toFixed(7);
  if (Number(sendMax) > 2000) return `too expensive on DEX (${sendMax} XLM)`;
  const acc = await horizon.loadAccount(kp.publicKey());
  const tx = new TransactionBuilder(acc, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
    .addOperation(
      Operation.pathPaymentStrictReceive({
        sendAsset: Asset.native(),
        sendMax,
        destination: kp.publicKey(),
        destAsset: USDC,
        destAmount: usdcWanted,
        path: best.path.map((p) => (p.asset_type === "native" ? Asset.native() : new Asset(p.asset_code!, p.asset_issuer!))),
      }),
    )
    .setTimeout(60)
    .build();
  tx.sign(kp);
  const res = await horizon.submitTransaction(tx);
  return `bought ${usdcWanted} USDC for ≤${sendMax} XLM (tx ${res.hash.slice(0, 12)}…)`;
}

async function main() {
  const apiEnv = readEnv(API_ENV);
  const agentEnv = readEnv(AGENT_ENV);

  const receiver = apiEnv.RECEIVER_SECRET ? Keypair.fromSecret(apiEnv.RECEIVER_SECRET) : Keypair.random();
  const treasury = apiEnv.TREASURY_SECRET ? Keypair.fromSecret(apiEnv.TREASURY_SECRET) : Keypair.random();
  const agent = agentEnv.STELLAR_PRIVATE_KEY ? Keypair.fromSecret(agentEnv.STELLAR_PRIVATE_KEY) : Keypair.random();

  const log = (label: string, msg: string) => console.log(`  ${label.padEnd(10)} ${msg}`);
  console.log("\nTanong402 · testnet setup\n");

  for (const [name, kp] of [["receiver", receiver], ["treasury", treasury], ["agent", agent]] as const) {
    log(name, `${kp.publicKey()}  ${await friendbot(kp.publicKey())}`);
  }
  log("receiver", `USDC trustline ${await ensureTrustline(receiver)}`);
  log("agent", `USDC trustline ${await ensureTrustline(agent)}`);

  let agentUsdc = await usdcBalance(agent.publicKey());
  if (agentUsdc < 0.05) {
    try {
      log("agent", await buyUsdc(agent, "0.5"));
    } catch (err) {
      log("agent", `DEX swap failed: ${err instanceof Error ? err.message : String(err)}`);
    }
    agentUsdc = await usdcBalance(agent.publicKey());
  }
  log("agent", `USDC balance ${agentUsdc}`);
  if (agentUsdc < 0.005) {
    console.log(
      `\n  ⚠ The agent has no testnet USDC yet. Get some free at https://faucet.circle.com (Stellar testnet)\n` +
        `    and send it to ${agent.publicKey()}\n`,
    );
  }

  upsertEnv(
    API_ENV,
    {
      NETWORK: "stellar:testnet",
      FACILITATOR_URL: "https://x402.org/facilitator",
      SERVER_STELLAR_ADDRESS: receiver.publicKey(),
      RECEIVER_SECRET: receiver.secret(),
      TREASURY_SECRET: treasury.secret(),
      INVITE_CODES: apiEnv.INVITE_CODES ?? "FEU001,FEU002,FEU003,DEMO42",
      JWT_SECRET: apiEnv.JWT_SECRET ?? Keypair.random().secret().slice(1, 40),
    },
    "# Generated by scripts/stellar/setup-testnet.ts: TESTNET ONLY, gitignored. Do not reuse on mainnet.",
  );
  upsertEnv(
    AGENT_ENV,
    { STELLAR_PRIVATE_KEY: agent.secret(), SERVER_URL: "http://localhost:3001", NETWORK: "stellar:testnet" },
    "# Generated by scripts/stellar/setup-testnet.ts: TESTNET ONLY, gitignored.",
  );
  console.log(`\n  wrote apps/api/.env and examples/agent-cli/.env (secrets not printed)\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
