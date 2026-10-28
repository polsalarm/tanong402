/**
 * Everything that touches keys, signers or the Stellar SDK sits behind this module. It is loaded
 * lazily (see kit.ts) so the landing, Proof and Developers pages never download it.
 */
export {
  createWallet,
  exportBackup,
  forgetWallet,
  getBalances,
  getStoredAddress,
  hasWallet,
  importBackup,
  passphraseStrength,
  readSettlement,
  SpendGuardError,
  unlockWallet,
  verifyMessage,
  type AccountBalances,
  type Settlement,
  type UnlockedWallet,
} from "@tanong/wallet";
export { signChallenge, signClaim, signOnboarding, signTrustline, UnsafeRequestError } from "./signing";
export { createFreighterSigner, createLocalSigner, SignatureDeclinedError, type Signer } from "./signer";
export { buildTrustlineTx, submitToHorizon } from "./trustline";
