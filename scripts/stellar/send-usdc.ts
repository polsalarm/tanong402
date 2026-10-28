/**
 * Testnet helper: send test USDC from the treasury to any account that already has a USDC
 * trustline (e.g. a Freighter account), buying it with treasury XLM on the testnet DEX.
 *
 *   pnpm --filter @tanong/scripts send-usdc -- <G…address> [amount=1]
 */
import { Asset, BASE_FEE, Horizon, Keypair, Networks, Operation, TransactionBuilder } from "@stellar/stellar-sdk";
import { USDC_ISSUER } from "@tanong/shared";
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
if (env.NETWORK && env.NETWORK !== "stellar:testnet") throw new Error("send-usdc.ts is a testnet helper");

const args = process.argv.slice(2).filter((a) => a !== "--");
const to = args[0];
const amount = args[1] ?? "1";
if (!to || !/^G[A-Z2-7]{55}$/.test(to)) throw new Error("usage: send-usdc <G…address> [amount]");

const horizon = new Horizon.Server("https://horizon-testnet.stellar.org");
const treasury = Keypair.fromSecret(env.TREASURY_SECRET!);
const USDC = new Asset("USDC", USDC_ISSUER["stellar:testnet"]);

const dest = await horizon.loadAccount(to);
if (!dest.balances.some((b) => "asset_code" in b && b.asset_code === "USDC" && b.asset_issuer === USDC.getIssuer())) {
  throw new Error("Destination has no USDC trustline. Add USDC (testnet, Circle) in the wallet first.");
}
const paths = await horizon.strictReceivePaths([Asset.native()], USDC, amount).call();
const best = paths.records.sort((a, b) => Number(a.source_amount) - Number(b.source_amount))[0];
if (!best) throw new Error("No testnet DEX liquidity right now; use https://faucet.circle.com");
const tx = new TransactionBuilder(await horizon.loadAccount(treasury.publicKey()), {
  fee: BASE_FEE,
  networkPassphrase: Networks.TESTNET,
})
  .addOperation(
    Operation.pathPaymentStrictReceive({
      sendAsset: Asset.native(),
      sendMax: (Number(best.source_amount) * 1.05).toFixed(7),
      destination: to,
      destAsset: USDC,
      destAmount: amount,
      path: best.path.map((p) => (p.asset_type === "native" ? Asset.native() : new Asset(p.asset_code!, p.asset_issuer!))),
    }),
  )
  .setTimeout(60)
  .build();
tx.sign(treasury);
const res = await horizon.submitTransaction(tx);
console.log(`  sent ${amount} USDC to ${to}\n  https://stellar.expert/explorer/testnet/tx/${res.hash}`);
