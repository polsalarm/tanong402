import { Address, FeeBumpTransaction, TransactionBuilder, hash, scValToNative, xdr } from "@stellar/stellar-sdk";
import { NETWORK_PASSPHRASE, USDC_ISSUER, type StellarNetwork } from "@tanong/shared";
import { claimPayload } from "./api";
import type { Signer } from "./signer";

/**
 * Whatever signs for the student (the built-in key or Freighter) only ever signs things we have
 * inspected here first. The server prepares onboarding and claim payloads, but a bad or
 * compromised server must not be able to make the student sign anything else (a payment, a new
 * signer, a different contract call). Every public `sign*` function below inspects, then signs,
 * then checks that what came back is still exactly what was inspected.
 */
export class UnsafeRequestError extends Error {
  constructor(detail: string) {
    super(detail);
    this.name = "UnsafeRequestError";
  }
}

function fail(detail: string): never {
  throw new UnsafeRequestError(detail);
}

type AddressCreds = { address: xdr.ScAddress; signature: xdr.ScVal };

/** Address credentials of an auth entry; protocol 23+ simulations return the V2 variant. */
export function addressCredentials(entry: xdr.SorobanAuthorizationEntry): AddressCreds | null {
  const creds = entry.credentials;
  if (creds.type === "sorobanCredentialsAddress") return creds.address;
  if (creds.type === "sorobanCredentialsAddressV2") return creds.addressV2;
  return null;
}

function parseTx(xdrB64: string, network: StellarNetwork) {
  let tx;
  try {
    tx = TransactionBuilder.fromXDR(xdrB64, NETWORK_PASSPHRASE[network]);
  } catch {
    fail("Malformed transaction");
  }
  if (tx instanceof FeeBumpTransaction) fail("Unexpected fee-bump transaction");
  return tx;
}

const txHashHex = (xdrB64: string, network: StellarNetwork) =>
  Array.from(parseTx(xdrB64, network).hash(), (b) => b.toString(16).padStart(2, "0")).join("");

/**
 * Onboarding must be exactly: treasury sponsors reserves → creates the student's account →
 * student adds a USDC trustline → student ends the sponsorship. Nothing else may use the
 * student as an operation source, and the student never pays the fee.
 */
export function inspectOnboardingTx(xdrB64: string, student: string, network: StellarNetwork): void {
  const tx = parseTx(xdrB64, network);
  if (tx.source === student) fail("Student must not be the fee payer");
  if (tx.operations.length === 0 || tx.operations.length > 6) fail("Unexpected operation count");

  for (const op of tx.operations) {
    const source = op.source ?? tx.source;
    switch (op.type) {
      case "beginSponsoringFutureReserves":
        if (op.sponsoredId !== student || source === student) fail("Unexpected sponsorship");
        break;
      case "createAccount":
        if (op.destination !== student || source === student) fail("Unexpected account creation");
        break;
      case "changeTrust": {
        if (source !== student) fail("Unexpected trustline source");
        const line = op.line;
        if (!("issuer" in line) || line.code !== "USDC" || line.issuer !== USDC_ISSUER[network]) {
          fail("Unexpected trustline asset");
        }
        break;
      }
      case "endSponsoringFutureReserves":
        if (source !== student) fail("Unexpected sponsorship end");
        break;
      default:
        fail(`Unexpected operation: ${op.type}`);
    }
  }
}

/** Max fee we let a self-paid trustline carry: 0.01 XLM. */
const MAX_TRUSTLINE_FEE_STROOPS = 100_000;

/**
 * A Freighter account adding the USDC trustline itself: exactly one changeTrust for the configured
 * USDC issuer, sourced from and paid by that account, with a sane fee and a non-zero limit.
 */
export function inspectTrustlineTx(xdrB64: string, account: string, network: StellarNetwork): void {
  const tx = parseTx(xdrB64, network);
  if (tx.source !== account) fail("Unexpected transaction source");
  if (Number(tx.fee) > MAX_TRUSTLINE_FEE_STROOPS) fail("Unexpected fee");
  if (tx.operations.length !== 1) fail("Unexpected operation count");
  const op = tx.operations[0]!;
  if (op.type !== "changeTrust") fail(`Unexpected operation: ${op.type}`);
  if ((op.source ?? tx.source) !== account) fail("Unexpected trustline source");
  const line = op.line;
  if (!("issuer" in line) || line.code !== "USDC" || line.issuer !== USDC_ISSUER[network]) {
    fail("Unexpected trustline asset");
  }
  if (Number(op.limit) <= 0) fail("Unexpected trustline limit");
}

/** Each claim auth entry must authorize exactly `pool.claim(student)` and nothing nested. */
export function inspectClaimEntries(entries: string[], student: string, poolContractId: string | null): void {
  for (const b64 of entries) {
    let entry: xdr.SorobanAuthorizationEntry;
    try {
      entry = xdr.SorobanAuthorizationEntry.fromXDR(b64, "base64");
    } catch {
      fail("Malformed authorization");
    }
    const creds = addressCredentials(entry);
    if (!creds) fail("Unexpected credentials");
    if (Address.fromScAddress(creds.address).toString() !== student) fail("Authorization is for someone else");
    inspectClaimInvocation(entry.rootInvocation, student, poolContractId);
  }
}

function inspectClaimInvocation(
  invocation: xdr.SorobanAuthorizedInvocation,
  student: string,
  poolContractId: string | null,
): void {
  if (invocation.subInvocations.length > 0) fail("Unexpected nested authorization");
  const fn = invocation.function;
  if (fn.type !== "sorobanAuthorizedFunctionTypeContractFn") fail("Unexpected function type");
  const call = fn.contractFn;
  const contract = Address.fromScAddress(call.contractAddress).toString();
  if (poolContractId && contract !== poolContractId) fail("Unexpected contract");
  if (call.functionName.toString() !== "claim") fail("Unexpected contract function");
  const arg = call.args[0];
  if (call.args.length !== 1 || !arg || Address.fromScVal(arg).toString() !== student) fail("Unexpected claim argument");
}

/**
 * x402 payment authorization (Freighter path): the preimage handed to the signer must authorize
 * exactly `usdc.transfer(payer → payTo, amount ≤ max)` on this network, with nothing nested.
 */
export function inspectPaymentPreimage(
  preimageB64: string,
  expect: { payer: string; payTo: string; asset: string; maxUnits: bigint; network: StellarNetwork },
): void {
  let preimage: xdr.HashIdPreimage;
  try {
    preimage = xdr.HashIdPreimage.fromXDR(preimageB64, "base64");
  } catch {
    fail("Malformed payment authorization");
  }
  let body: { networkId: { toBytes(): Uint8Array }; invocation: xdr.SorobanAuthorizedInvocation };
  if (preimage.type === "envelopeTypeSorobanAuthorization") body = preimage.sorobanAuthorization;
  else if (preimage.type === "envelopeTypeSorobanAuthorizationWithAddress") {
    body = preimage.sorobanAuthorizationWithAddress;
    if (Address.fromScAddress(preimage.sorobanAuthorizationWithAddress.address).toString() !== expect.payer) {
      fail("Payment authorization is for someone else");
    }
  } else fail("Unexpected payment authorization type");

  if (!sameBytes(body.networkId.toBytes(), hash(NETWORK_PASSPHRASE[expect.network]))) {
    fail("Payment authorization is for another network");
  }

  const invocation = body.invocation;
  if (invocation.subInvocations.length > 0) fail("Unexpected nested payment authorization");
  const fn = invocation.function;
  if (fn.type !== "sorobanAuthorizedFunctionTypeContractFn") fail("Unexpected payment function type");
  const call = fn.contractFn;
  if (Address.fromScAddress(call.contractAddress).toString() !== expect.asset) fail("Unexpected payment asset");
  if (call.functionName.toString() !== "transfer") fail("Unexpected payment function");
  const [from, to, amount] = call.args;
  if (call.args.length !== 3 || !from || !to || !amount) fail("Unexpected payment arguments");
  if (Address.fromScVal(from).toString() !== expect.payer) fail("Unexpected payer");
  if (Address.fromScVal(to).toString() !== expect.payTo) fail("Unexpected payee");
  let units: bigint;
  try {
    units = BigInt(scValToNative(amount) as bigint | number | string);
  } catch {
    fail("Unexpected payment amount");
  }
  if (units <= 0n || units > expect.maxUnits) fail("Payment is more than the price shown");
}

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/** The signer must hand back the very transaction we inspected, only with signatures added. */
function assertSameTx(original: string, signed: string, network: StellarNetwork): void {
  if (txHashHex(original, network) !== txHashHex(signed, network)) fail("Signed transaction was changed");
}

export async function signOnboarding(signer: Signer, xdrB64: string, network: StellarNetwork): Promise<string> {
  inspectOnboardingTx(xdrB64, signer.address, network);
  const signed = await signer.signTransaction(xdrB64, network);
  assertSameTx(xdrB64, signed, network);
  return signed;
}

export async function signTrustline(signer: Signer, xdrB64: string, network: StellarNetwork): Promise<string> {
  inspectTrustlineTx(xdrB64, signer.address, network);
  const signed = await signer.signTransaction(xdrB64, network);
  assertSameTx(xdrB64, signed, network);
  return signed;
}

/** Takes the prepare payload (a JSON string) and returns the submit payload (a JSON string). */
export async function signClaim(
  signer: Signer,
  preparedJson: string,
  network: StellarNetwork,
  poolContractId: string | null,
): Promise<string> {
  let payload;
  try {
    payload = claimPayload.parse(JSON.parse(preparedJson));
  } catch {
    fail("Malformed claim request");
  }
  inspectClaimEntries(payload.entries, signer.address, poolContractId);
  const signed = await signer.signAuthEntries(payload.entries, payload.validUntilLedger, network);
  if (signed.length !== payload.entries.length) fail("Unexpected signed authorization count");
  // Re-inspect what came back: same single call, still only for this student.
  inspectClaimEntries(signed, signer.address, poolContractId);
  return JSON.stringify({ entries: signed });
}

/** Sign-in challenge: only the exact message format the API documents. */
export async function signChallenge(
  signer: Signer,
  nonce: string,
  message: string,
  network: StellarNetwork,
): Promise<string> {
  const expected = `Tanong402 sign-in\naddress:${signer.address}\nnonce:${nonce}`;
  if (message !== expected) fail("Unexpected sign-in message");
  return signer.signMessage(message, network);
}
