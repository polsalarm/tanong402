/**
 * Mock-only helpers that build real Stellar payloads, so the demo exercises the same wallet
 * signing and client-side inspection code as production. Nothing here is submitted anywhere.
 */
import {
  Account,
  Address,
  Asset,
  BASE_FEE,
  FeeBumpTransaction,
  Keypair,
  Memo,
  Operation,
  TransactionBuilder,
  xdr,
} from "@stellar/stellar-sdk";
import { NETWORK_PASSPHRASE, USDC_ISSUER, type StellarNetwork } from "@tanong/shared";

const treasury = Keypair.random();

const hex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

export function buildOnboardingTx(student: string, network: StellarNetwork): { xdr: string; hash: string } {
  const source = new Account(treasury.publicKey(), "4815162342");
  const tx = new TransactionBuilder(source, {
    fee: String(Number(BASE_FEE) * 10),
    networkPassphrase: NETWORK_PASSPHRASE[network],
  })
    .addOperation(Operation.beginSponsoringFutureReserves({ sponsoredId: student }))
    .addOperation(Operation.createAccount({ destination: student, startingBalance: "0" }))
    .addOperation(Operation.changeTrust({ asset: new Asset("USDC", USDC_ISSUER[network]), source: student }))
    .addOperation(Operation.endSponsoringFutureReserves({ source: student }))
    .addMemo(Memo.text("tanong402 onboard"))
    .setTimeout(300)
    .build();
  tx.sign(treasury);
  return { xdr: tx.toXDR(), hash: hex(tx.hash()) };
}

export function isOnboardingSigned(signedXdr: string, student: string, network: StellarNetwork, hash: string): boolean {
  try {
    const tx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE[network]);
    if (tx instanceof FeeBumpTransaction || hex(tx.hash()) !== hash) return false;
    const kp = Keypair.fromPublicKey(student);
    return tx.signatures.some((s) => {
      try {
        return kp.verify(tx.hash(), s.signature);
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}

export function buildClaimEntry(student: string, poolContractId: string): string {
  const entry = new xdr.SorobanAuthorizationEntry({
    credentials: xdr.SorobanCredentials.sorobanCredentialsAddress(
      new xdr.SorobanAddressCredentials({
        address: new Address(student).toScAddress(),
        nonce: BigInt(Math.floor(Math.random() * 1e15)),
        signatureExpirationLedger: 0,
        signature: xdr.ScVal.scvVoid(),
      }),
    ),
    rootInvocation: new xdr.SorobanAuthorizedInvocation({
      function: xdr.SorobanAuthorizedFunction.sorobanAuthorizedFunctionTypeContractFn(
        new xdr.InvokeContractArgs({
          contractAddress: new Address(poolContractId).toScAddress(),
          functionName: "claim",
          args: [new Address(student).toScVal()],
        }),
      ),
      subInvocations: [],
    }),
  });
  return entry.toXDR("base64");
}

export function areClaimEntriesSigned(entries: string[], student: string): boolean {
  if (entries.length === 0) return false;
  return entries.every((b64) => {
    try {
      const entry = xdr.SorobanAuthorizationEntry.fromXDR(b64, "base64");
      const creds = entry.credentials;
      return (
        creds.type === "sorobanCredentialsAddress" &&
        creds.address.signature.type !== "scvVoid" &&
        Address.fromScAddress(creds.address.address).toString() === student
      );
    } catch {
      return false;
    }
  });
}

/** Same check as the real API: raw or SEP-53 (Freighter) signatures. */
export { verifyMessage } from "@tanong/wallet";
