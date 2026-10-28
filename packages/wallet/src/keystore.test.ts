import "fake-indexeddb/auto";
import { Keypair, hash } from "@stellar/stellar-sdk";
import { describe, expect, it } from "vitest";
import {
  createWallet,
  exportBackup,
  forgetWallet,
  hasWallet,
  importBackup,
  unlockWallet,
} from "./keystore.js";
import { signMessage, verifyMessage } from "./sign.js";

describe("keystore", () => {
  it("creates, unlocks, backs up and restores a wallet", async () => {
    expect(await hasWallet()).toBe(false);
    const w = await createWallet();
    expect(w.address).toMatch(/^G[A-Z2-7]{55}$/);
    await expect(createWallet()).rejects.toThrow(/already exists/);

    const unlocked = await unlockWallet();
    expect(unlocked?.address).toBe(w.address);
    expect(unlocked?.secret).toBe(w.secret);

    await expect(exportBackup("short")).rejects.toThrow();
    const backup = await exportBackup("correct horse battery staple");
    expect(backup).not.toContain(w.secret);

    await forgetWallet();
    expect(await hasWallet()).toBe(false);
    await expect(importBackup(backup, "wrong passphrase here!")).rejects.toThrow(/Wrong passphrase/);
    const restored = await importBackup(backup, "correct horse battery staple");
    expect(restored.address).toBe(w.address);
    expect((await unlockWallet())?.secret).toBe(w.secret);
  }, 30_000);

  it("signs and verifies challenge messages", async () => {
    const w = (await unlockWallet())!;
    const sig = signMessage(w.secret, "tanong402:login:abc");
    expect(verifyMessage(w.address, "tanong402:login:abc", sig)).toBe(true);
    expect(verifyMessage(w.address, "tanong402:login:xyz", sig)).toBe(false);
    // Freighter-style SEP-53 signature, base64 and hex.
    const kp = Keypair.fromSecret(w.secret);
    const sep53 = Buffer.from(kp.sign(hash(Buffer.from("Stellar Signed Message:\ntanong402:login:abc"))));
    expect(verifyMessage(w.address, "tanong402:login:abc", sep53.toString("base64"))).toBe(true);
    expect(verifyMessage(w.address, "tanong402:login:abc", sep53.toString("hex"))).toBe(true);
    expect(verifyMessage(w.address, "tanong402:login:xyz", sep53.toString("base64"))).toBe(false);
  });
});
