import { Address, Keypair, TransactionBuilder, authorizeEntry, hash, xdr } from "@stellar/stellar-sdk";
import { NETWORK_PASSPHRASE, type StellarNetwork } from "@tanong/shared";
import { fromBase64, toBase64, utf8 } from "./bytes.js";

/** Signs a server-prepared transaction (onboarding, relayed claim). Caller should show what it is. */
export function signTransactionXdr(secret: string, xdr: string, network: StellarNetwork): string {
  const passphrase = NETWORK_PASSPHRASE[network];
  const tx = TransactionBuilder.fromXDR(xdr, passphrase);
  tx.sign(Keypair.fromSecret(secret));
  return tx.toXDR();
}

/** Signs an auth challenge message; returns base64 signature. */
export function signMessage(secret: string, message: string): string {
  return toBase64(Keypair.fromSecret(secret).sign(utf8(message)));
}

const SEP53_PREFIX = "Stellar Signed Message:\n";

/**
 * Checks a message signature in either style the API accepts: raw ed25519 over the message
 * (this wallet, agents) or SEP-53, which Freighter uses: ed25519 over
 * sha256("Stellar Signed Message:\n" + message). Signature may be base64 or hex.
 */
export function verifyMessage(address: string, message: string, signature: string): boolean {
  try {
    const key = Keypair.fromPublicKey(address);
    const sig = /^[0-9a-f]{128}$/i.test(signature) ? fromHex(signature) : fromBase64(signature);
    if (sig.length !== 64) return false;
    return key.verify(utf8(message), sig) || key.verify(hash(utf8(SEP53_PREFIX + message)), sig);
  } catch {
    return false;
  }
}

function fromHex(s: string): Uint8Array<ArrayBuffer> {
  return new Uint8Array(s.match(/../g)!.map((h) => parseInt(h, 16)));
}

/**
 * Signs Soroban authorization entries (base64 XDR) that require this account's address credentials.
 * Used for relayed pool claims: the server is the tx source and pays the fee; the student only
 * authorizes `tanong-pool.claim(student)`. Entries for other addresses are returned untouched.
 */
export async function signAuthEntries(
  secret: string,
  entriesXdr: string[],
  validUntilLedger: number,
  network: StellarNetwork,
): Promise<string[]> {
  const kp = Keypair.fromSecret(secret);
  const passphrase = NETWORK_PASSPHRASE[network];
  const out: string[] = [];
  for (const b64 of entriesXdr) {
    const entry = xdr.SorobanAuthorizationEntry.fromXDR(b64, "base64");
    const creds = entry.credentials;
    const addrCreds =
      creds.type === "sorobanCredentialsAddress"
        ? creds.address
        : creds.type === "sorobanCredentialsAddressV2"
          ? creds.addressV2
          : null;
    const isMine = addrCreds !== null && Address.fromScAddress(addrCreds.address).toString() === kp.publicKey();
    if (!isMine) {
      out.push(b64);
      continue;
    }
    const signed = await authorizeEntry(entry, kp, validUntilLedger, passphrase);
    out.push(signed.toXDR("base64"));
  }
  return out;
}
