/**
 * Funds the Scholarship Pool from the treasury (testnet helper).
 *
 *   pnpm --filter @tanong/scripts fund-pool -- 2        # fund 2 USDC
 *
 * Reads TREASURY_SECRET + POOL_CONTRACT_ID from apps/api/.env. On testnet it first tops the
 * treasury up with USDC from the DEX if needed. Secrets are never printed.
 */
import {
  Address,
  Asset,
  BASE_FEE,
  Contract,
  Horizon,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
  nativeToScVal,
  rpc,
  scValToNative,
} from "@stellar/stellar-sdk";
import { USDC_ISSUER, toUnits } from "@tanong/shared";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const env = Object.fromEntries(
  readFileSync(resolve(ROOT, "apps/api/.env"), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);
if (env.NETWORK && env.NETWORK !== "stellar:testnet") throw new Error("fund-pool.ts is a testnet helper");

const amount = process.argv.filter((a) => /^\d+(\.\d+)?$/.test(a)).pop() ?? "2";
const treasury = Keypair.fromSecret(env.TREASURY_SECRET!);
const poolId = env.POOL_CONTRACT_ID!;
const horizon = new Horizon.Server("https://horizon-testnet.stellar.org");
const server = new rpc.Server("https://soroban-testnet.stellar.org");
const USDC = new Asset("USDC", USDC_ISSUER["stellar:testnet"]);

async function usdcBalance() {
  const acc = await horizon.loadAccount(treasury.publicKey());
  const b = acc.balances.find((x) => "asset_code" in x && x.asset_code === "USDC" && x.asset_issuer === USDC.getIssuer());
  return { acc, has: Boolean(b), balance: b ? Number(b.balance) : 0 };
}

async function main() {
  let { acc, has, balance } = await usdcBalance();
  if (!has) {
    const tx = new TransactionBuilder(acc, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
      .addOperation(Operation.changeTrust({ asset: USDC }))
      .setTimeout(60)
      .build();
    tx.sign(treasury);
    await horizon.submitTransaction(tx);
    console.log("  treasury USDC trustline added");
  }
  if (balance < Number(amount)) {
    const need = (Number(amount) - balance + 0.01).toFixed(7);
    const paths = await horizon.strictReceivePaths([Asset.native()], USDC, need).call();
    const best = paths.records.sort((a, b) => Number(a.source_amount) - Number(b.source_amount))[0];
    if (!best) throw new Error("No testnet DEX liquidity; fund the treasury from https://faucet.circle.com");
    ({ acc } = await usdcBalance());
    const tx = new TransactionBuilder(acc, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
      .addOperation(
        Operation.pathPaymentStrictReceive({
          sendAsset: Asset.native(),
          sendMax: (Number(best.source_amount) * 1.05).toFixed(7),
          destination: treasury.publicKey(),
          destAsset: USDC,
          destAmount: need,
          path: best.path.map((p) => (p.asset_type === "native" ? Asset.native() : new Asset(p.asset_code!, p.asset_issuer!))),
        }),
      )
      .setTimeout(60)
      .build();
    tx.sign(treasury);
    await horizon.submitTransaction(tx);
    console.log(`  treasury bought ${need} USDC on the testnet DEX`);
  }

  const source = await server.getAccount(treasury.publicKey());
  const built = new TransactionBuilder(source, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
    .addOperation(
      new Contract(poolId).call(
        "fund",
        new Address(treasury.publicKey()).toScVal(),
        nativeToScVal(toUnits(amount), { type: "i128" }),
      ),
    )
    .setTimeout(120)
    .build();
  const tx = await server.prepareTransaction(built);
  tx.sign(treasury);
  const sent = await server.sendTransaction(tx);
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const got = await server.getTransaction(sent.hash);
    if (got.status === rpc.Api.GetTransactionStatus.SUCCESS) {
      console.log(`  funded pool with ${amount} USDC · https://stellar.expert/explorer/testnet/tx/${sent.hash}`);
      break;
    }
    if (got.status === rpc.Api.GetTransactionStatus.FAILED) throw new Error(`fund tx failed ${sent.hash}`);
  }

  const statsTx = new TransactionBuilder(await server.getAccount(treasury.publicKey()), {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(new Contract(poolId).call("stats"))
    .setTimeout(30)
    .build();
  const sim = await server.simulateTransaction(statsTx);
  if (rpc.Api.isSimulationSuccess(sim) && sim.result) {
    console.log("  pool stats", scValToNative(sim.result.retval));
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
