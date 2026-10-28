import { Keypair } from "@stellar/stellar-sdk";
import { fromBase64, toBase64 } from "./bytes.js";

/**
 * Device-bound key storage.
 *
 * The Stellar secret is encrypted with AES-GCM using a NON-EXTRACTABLE CryptoKey that lives in
 * IndexedDB. Script on this origin can ask the browser to decrypt, but nobody can export the
 * wrapping key, so a copied IndexedDB file alone is useless. Backups use a user passphrase.
 */

const DB_NAME = "tanong402";
const STORE = "vault";
const KEY_ID = "device-key";
const WALLET_ID = "wallet";

interface StoredWallet {
  address: string;
  iv: ArrayBuffer;
  ciphertext: ArrayBuffer;
  createdAt: string;
}

export interface UnlockedWallet {
  address: string;
  secret: string;
  createdAt: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(key: string, value: unknown): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbDelete(key: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function deviceKey(): Promise<CryptoKey> {
  const existing = await idbGet<CryptoKey>(KEY_ID);
  if (existing) return existing;
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, [
    "encrypt",
    "decrypt",
  ]);
  await idbPut(KEY_ID, key);
  return key;
}

const enc = new TextEncoder();
const dec = new TextDecoder();

async function seal(secret: string, address: string, createdAt: string): Promise<StoredWallet> {
  const key = await deviceKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: enc.encode(address) },
    key,
    enc.encode(secret),
  );
  return { address, iv: iv.buffer, ciphertext, createdAt };
}

export async function hasWallet(): Promise<boolean> {
  return Boolean(await idbGet<StoredWallet>(WALLET_ID));
}

export async function getStoredAddress(): Promise<string | null> {
  return (await idbGet<StoredWallet>(WALLET_ID))?.address ?? null;
}

/** Creates a brand-new keypair and stores it. Refuses to overwrite an existing wallet. */
export async function createWallet(): Promise<UnlockedWallet> {
  if (await hasWallet()) throw new Error("A wallet already exists on this device");
  const kp = Keypair.random();
  const createdAt = new Date().toISOString();
  await idbPut(WALLET_ID, await seal(kp.secret(), kp.publicKey(), createdAt));
  return { address: kp.publicKey(), secret: kp.secret(), createdAt };
}

export async function unlockWallet(): Promise<UnlockedWallet | null> {
  const stored = await idbGet<StoredWallet>(WALLET_ID);
  if (!stored) return null;
  const key = await deviceKey();
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(stored.iv), additionalData: enc.encode(stored.address) },
    key,
    stored.ciphertext,
  );
  const secret = dec.decode(plain);
  if (Keypair.fromSecret(secret).publicKey() !== stored.address) throw new Error("Wallet integrity check failed");
  return { address: stored.address, secret, createdAt: stored.createdAt };
}

export async function forgetWallet(): Promise<void> {
  await idbDelete(WALLET_ID);
}

// ---------------------------------------------------------------- passphrase backups

const BACKUP_VERSION = 1;
const PBKDF2_ITERATIONS = 600_000;

interface BackupFile {
  v: number;
  app: "tanong402";
  address: string;
  salt: string;
  iv: string;
  data: string;
  iterations: number;
  createdAt: string;
}

const b64 = toBase64;
const unb64 = fromBase64;

async function passphraseKey(passphrase: string, salt: Uint8Array<ArrayBuffer>, iterations: number) {
  const base = await crypto.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export function passphraseStrength(passphrase: string): { ok: boolean; hint: string } {
  if (passphrase.length < 12) return { ok: false, hint: "Use at least 12 characters" };
  if (new Set(passphrase).size < 6) return { ok: false, hint: "Mix in more different characters" };
  return { ok: true, hint: "Strong enough" };
}

export async function exportBackup(passphrase: string): Promise<string> {
  const strength = passphraseStrength(passphrase);
  if (!strength.ok) throw new Error(strength.hint);
  const wallet = await unlockWallet();
  if (!wallet) throw new Error("No wallet on this device");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await passphraseKey(passphrase, salt, PBKDF2_ITERATIONS);
  const data = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: enc.encode(wallet.address) },
    key,
    enc.encode(wallet.secret),
  );
  const file: BackupFile = {
    v: BACKUP_VERSION,
    app: "tanong402",
    address: wallet.address,
    salt: b64(salt),
    iv: b64(iv),
    data: b64(data),
    iterations: PBKDF2_ITERATIONS,
    createdAt: wallet.createdAt,
  };
  return JSON.stringify(file);
}

export async function importBackup(backupJson: string, passphrase: string, opts: { replace?: boolean } = {}) {
  const file = JSON.parse(backupJson) as BackupFile;
  if (file.app !== "tanong402" || file.v !== BACKUP_VERSION) throw new Error("Not a Tanong402 backup");
  const key = await passphraseKey(passphrase, unb64(file.salt), file.iterations);
  let secret: string;
  try {
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: unb64(file.iv), additionalData: enc.encode(file.address) },
      key,
      unb64(file.data),
    );
    secret = dec.decode(plain);
  } catch {
    throw new Error("Wrong passphrase");
  }
  if (Keypair.fromSecret(secret).publicKey() !== file.address) throw new Error("Backup is corrupted");
  if ((await hasWallet()) && !opts.replace) throw new Error("A wallet already exists on this device");
  await idbPut(WALLET_ID, await seal(secret, file.address, file.createdAt));
  return { address: file.address };
}
