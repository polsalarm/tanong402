import { Account, Asset, BASE_FEE, Operation, TransactionBuilder } from "@stellar/stellar-sdk";
import { NETWORK_PASSPHRASE, USDC_ISSUER, type StellarNetwork } from "@tanong/shared";

/**
 * For Freighter accounts that already exist but can't hold USDC yet: one changeTrust, paid by the
 * account itself. We build it here; lib/signing.ts still inspects it before Freighter signs.
 */
export async function buildTrustlineTx(
  address: string,
  horizonUrl: string,
  network: StellarNetwork,
  fetchImpl: typeof fetch,
): Promise<string> {
  const res = await fetchImpl(`${horizonUrl.replace(/\/$/, "")}/accounts/${address}`);
  if (res.status === 404) throw new Error("This account isn't on the network yet.");
  if (!res.ok) throw new Error(`Couldn't load the account (${res.status}).`);
  const body = (await res.json()) as { sequence?: string };
  if (!body.sequence) throw new Error("Couldn't load the account.");
  const tx = new TransactionBuilder(new Account(address, body.sequence), {
    fee: String(Number(BASE_FEE) * 10),
    networkPassphrase: NETWORK_PASSPHRASE[network],
  })
    .addOperation(Operation.changeTrust({ asset: new Asset("USDC", USDC_ISSUER[network]) }))
    .setTimeout(180)
    .build();
  return tx.toXDR();
}

/** Submits a signed envelope to Horizon and returns the transaction hash. */
export async function submitToHorizon(signedXdr: string, horizonUrl: string, fetchImpl: typeof fetch): Promise<string> {
  const res = await fetchImpl(`${horizonUrl.replace(/\/$/, "")}/transactions`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: `tx=${encodeURIComponent(signedXdr)}`,
  });
  const body = (await res.json().catch(() => ({}))) as {
    hash?: string;
    extras?: { result_codes?: { transaction?: string; operations?: string[] } };
  };
  if (!res.ok || !body.hash) {
    const codes = body.extras?.result_codes;
    const op = codes?.operations?.find((c) => c !== "op_success");
    if (op === "op_low_reserve" || codes?.transaction === "tx_insufficient_balance") {
      throw new Error("This account needs a little more XLM to add the trustline.");
    }
    throw new Error(codes ? `The network rejected it (${op ?? codes.transaction ?? "unknown"}).` : `Submit failed (${res.status}).`);
  }
  return body.hash;
}
