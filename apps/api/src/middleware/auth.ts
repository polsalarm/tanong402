import { Keypair } from "@stellar/stellar-sdk";
import type { RequestHandler } from "express";
import { SignJWT, jwtVerify } from "jose";
import { createHash, randomBytes } from "node:crypto";
import { ApiError } from "../lib/errors.js";

const TOKEN_TTL_S = 15 * 60;
const NONCE_TTL_MS = 5 * 60_000;
const SEP53_PREFIX = "Stellar Signed Message:\n";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      wallet?: string;
    }
  }
}

/** Wallet-signature login: sign a server nonce with the Stellar key → short-lived JWT. */
export class WalletAuth {
  private nonces = new Map<string, { address: string; expires: number }>();
  private key: Uint8Array;

  constructor(secret: string | undefined) {
    this.key = new TextEncoder().encode(secret ?? randomBytes(32).toString("hex"));
  }

  challenge(address: string) {
    for (const [n, v] of this.nonces) if (v.expires < Date.now()) this.nonces.delete(n);
    const nonce = randomBytes(16).toString("hex");
    this.nonces.set(nonce, { address, expires: Date.now() + NONCE_TTL_MS });
    return { nonce, message: WalletAuth.message(address, nonce) };
  }

  static message(address: string, nonce: string) {
    return `Tanong402 sign-in\naddress:${address}\nnonce:${nonce}`;
  }

  /**
   * Accepts both signature styles over the exact challenge text:
   * raw ed25519 over the message bytes (built-in wallet, agents), and SEP-53, which Freighter
   * uses: ed25519 over sha256("Stellar Signed Message:\n" + message). Base64 or hex encoded.
   */
  static verifySignature(address: string, message: string, signature: string): boolean {
    try {
      const key = Keypair.fromPublicKey(address);
      const sig = /^[0-9a-f]{128}$/i.test(signature) ? Buffer.from(signature, "hex") : Buffer.from(signature, "base64");
      if (sig.length !== 64) return false;
      const raw = Buffer.from(message, "utf8");
      const sep53 = createHash("sha256").update(Buffer.concat([Buffer.from(SEP53_PREFIX, "utf8"), raw])).digest();
      return key.verify(raw, sig) || key.verify(sep53, sig);
    } catch {
      return false;
    }
  }

  async verify(address: string, nonce: string, signatureB64: string) {
    const entry = this.nonces.get(nonce);
    this.nonces.delete(nonce);
    if (!entry || entry.address !== address || entry.expires < Date.now()) {
      throw new ApiError("UNAUTHORIZED", "Challenge expired, try again");
    }
    const ok = WalletAuth.verifySignature(address, WalletAuth.message(address, nonce), signatureB64);
    if (!ok) throw new ApiError("UNAUTHORIZED", "Signature check failed");
    const expiresAt = new Date(Date.now() + TOKEN_TTL_S * 1000);
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(address)
      .setIssuedAt()
      .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
      .setAudience("tanong402")
      .sign(this.key);
    return { token, expiresAt: expiresAt.toISOString() };
  }

  required(): RequestHandler {
    return async (req, _res, next) => {
      const h = req.headers.authorization;
      if (!h?.startsWith("Bearer ")) return next(new ApiError("UNAUTHORIZED", "Sign in required"));
      try {
        const { payload } = await jwtVerify(h.slice(7), this.key, { audience: "tanong402" });
        req.wallet = payload.sub;
        next();
      } catch {
        next(new ApiError("UNAUTHORIZED", "Session expired"));
      }
    };
  }
}
