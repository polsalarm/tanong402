import {
  Address,
  Asset,
  BASE_FEE,
  Contract,
  Horizon,
  Keypair,
  Memo,
  Operation,
  TransactionBuilder,
  nativeToScVal,
  rpc,
  scValToNative,
  xdr,
  type Transaction,
} from "@stellar/stellar-sdk";
import { NETWORK_PASSPHRASE, USDC_ISSUER, fromUnits } from "@tanong/shared";
import type { Env } from "../config/env.js";
import { ApiError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";

const TX_TIMEOUT_S = 180;
const PENDING_TTL_MS = 5 * 60_000;

interface PendingOnboard {
  hash: string;
  inviteCode: string;
  expires: number;
}

/**
 * Treasury-side Stellar operations. The treasury only ever signs transactions it built itself;
 * client-signed XDR is checked against the hash we produced before anything is submitted.
 */
export class StellarService {
  readonly passphrase: string;
  readonly horizon: Horizon.Server;
  readonly rpc: rpc.Server;
  private readonly treasury: Keypair | null;
  private readonly admin: Keypair | null;
  private readonly usdc: Asset;
  private pending = new Map<string, PendingOnboard>();

  constructor(private readonly env: Env) {
    this.passphrase = NETWORK_PASSPHRASE[env.network];
    this.horizon = new Horizon.Server(env.horizonUrl);
    this.rpc = new rpc.Server(env.rpcUrl);
    this.treasury = env.TREASURY_SECRET ? Keypair.fromSecret(env.TREASURY_SECRET) : null;
    const adminSecret = env.POOL_ADMIN_SECRET ?? env.TREASURY_SECRET;
    this.admin = adminSecret ? Keypair.fromSecret(adminSecret) : null;
    this.usdc = new Asset("USDC", USDC_ISSUER[env.network]);
  }

  get treasuryAddress() {
    return this.treasury?.publicKey() ?? null;
  }

  private requireTreasury(): Keypair {
    if (!this.treasury) throw new ApiError("NOT_CONFIGURED", "Onboarding is not configured on this server");
    return this.treasury;
  }

  // ------------------------------------------------------------------ onboarding

  async accountExists(address: string): Promise<{ exists: boolean; hasUsdc: boolean }> {
    try {
      const acc = await this.horizon.loadAccount(address);
      const hasUsdc = acc.balances.some(
        (b) => "asset_code" in b && b.asset_code === "USDC" && b.asset_issuer === this.usdc.getIssuer(),
      );
      return { exists: true, hasUsdc };
    } catch (err) {
      if ((err as { response?: { status?: number } }).response?.status === 404) return { exists: false, hasUsdc: false };
      throw err;
    }
  }

  /**
   * Builds: treasury sponsors student's account (0 XLM) + USDC trustline.
   * Treasury signs now; student must co-sign (changeTrust + endSponsoring have the student as source).
   */
  async buildOnboardingTx(student: string, inviteCode: string): Promise<string> {
    const treasury = this.requireTreasury();
    const state = await this.accountExists(student);
    if (state.exists && state.hasUsdc) throw new ApiError("INVALID_INPUT", "This account is already set up");
    if (state.exists) throw new ApiError("INVALID_INPUT", "Account exists without a USDC trustline; contact support");

    const source = await this.horizon.loadAccount(treasury.publicKey());
    const tx = new TransactionBuilder(source, { fee: (Number(BASE_FEE) * 10).toString(), networkPassphrase: this.passphrase })
      .addOperation(Operation.beginSponsoringFutureReserves({ sponsoredId: student }))
      .addOperation(Operation.createAccount({ destination: student, startingBalance: "0" }))
      .addOperation(Operation.changeTrust({ asset: this.usdc, source: student }))
      .addOperation(Operation.endSponsoringFutureReserves({ source: student }))
      .addMemo(Memo.text("tanong402 onboard"))
      .setTimeout(TX_TIMEOUT_S)
      .build();
    tx.sign(treasury);
    this.pending.set(student, {
      hash: Buffer.from(tx.hash()).toString("hex"),
      inviteCode,
      expires: Date.now() + PENDING_TTL_MS,
    });
    return tx.toXDR();
  }

  pendingInvite(student: string): string | null {
    const p = this.pending.get(student);
    return p && p.expires > Date.now() ? p.inviteCode : null;
  }

  async submitOnboardingTx(student: string, signedXdr: string): Promise<string> {
    const pending = this.pending.get(student);
    if (!pending || pending.expires < Date.now()) throw new ApiError("INVALID_INPUT", "Onboarding expired, start again");
    let tx: Transaction;
    try {
      tx = TransactionBuilder.fromXDR(signedXdr, this.passphrase) as Transaction;
    } catch {
      throw new ApiError("INVALID_INPUT", "Malformed transaction");
    }
    if (Buffer.from(tx.hash()).toString("hex") !== pending.hash) {
      throw new ApiError("INVALID_INPUT", "Transaction does not match what the server prepared");
    }
    const studentKp = Keypair.fromPublicKey(student);
    const signedByStudent = tx.signatures.some((s) => {
      try {
        return studentKp.verify(tx.hash(), s.signature);
      } catch {
        return false;
      }
    });
    if (!signedByStudent) throw new ApiError("INVALID_INPUT", "Missing student signature");

    try {
      const res = await this.horizon.submitTransaction(tx);
      this.pending.delete(student);
      return res.hash;
    } catch (err) {
      const codes = (err as { response?: { data?: { extras?: { result_codes?: unknown } } } }).response?.data?.extras
        ?.result_codes;
      logger.warn({ codes }, "onboarding submit failed");
      throw new ApiError("INTERNAL", "Network rejected the setup transaction");
    }
  }

  // ------------------------------------------------------------------ pool (Soroban)

  private requirePool(): { contract: Contract; treasury: Keypair } {
    if (!this.env.POOL_CONTRACT_ID) throw new ApiError("NOT_CONFIGURED", "Scholarship Pool is not configured");
    return { contract: new Contract(this.env.POOL_CONTRACT_ID), treasury: this.requireTreasury() };
  }

  /** Read-only contract call via simulation. */
  async view(fn: string, args: xdr.ScVal[] = []): Promise<unknown> {
    const { contract, treasury } = this.requirePool();
    const source = await this.rpc.getAccount(treasury.publicKey());
    const tx = new TransactionBuilder(source, { fee: BASE_FEE, networkPassphrase: this.passphrase })
      .addOperation(contract.call(fn, ...args))
      .setTimeout(30)
      .build();
    const sim = await this.rpc.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(sim)) throw new PoolError(sim.error);
    const ret = sim.result?.retval;
    return ret ? scValToNative(ret) : null;
  }

  private async sendAndWait(tx: Transaction): Promise<{ hash: string; returnValue: unknown }> {
    const sent = await this.rpc.sendTransaction(tx);
    if (sent.status === "ERROR") throw new PoolError(`send failed: ${JSON.stringify(sent.errorResult ?? "")}`);
    const hash = sent.hash;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const got = await this.rpc.getTransaction(hash);
      if (got.status === rpc.Api.GetTransactionStatus.SUCCESS) {
        return { hash, returnValue: got.returnValue ? scValToNative(got.returnValue) : null };
      }
      if (got.status === rpc.Api.GetTransactionStatus.FAILED) throw new PoolError(`tx ${hash} failed`);
    }
    throw new PoolError(`tx ${hash} not confirmed in time`);
  }

  /** Admin-signed enroll. Admin = POOL_ADMIN_SECRET (falls back to treasury). */
  async enroll(student: string): Promise<string> {
    const { contract } = this.requirePool();
    if (!this.admin) throw new ApiError("NOT_CONFIGURED", "Pool admin key missing");
    const source = await this.rpc.getAccount(this.admin.publicKey());
    const built = new TransactionBuilder(source, { fee: BASE_FEE, networkPassphrase: this.passphrase })
      .addOperation(contract.call("enroll", new Address(student).toScVal()))
      .setTimeout(TX_TIMEOUT_S)
      .build();
    const tx = await this.rpc.prepareTransaction(built);
    tx.sign(this.admin);
    return (await this.sendAndWait(tx as Transaction)).hash;
  }

  private claimTx(source: Awaited<ReturnType<rpc.Server["getAccount"]>>, student: string, auth?: xdr.SorobanAuthorizationEntry[]) {
    const { contract } = this.requirePool();
    const op = auth
      ? Operation.invokeContractFunction({
          contract: contract.contractId(),
          function: "claim",
          args: [new Address(student).toScVal()],
          auth,
        })
      : contract.call("claim", new Address(student).toScVal());
    return new TransactionBuilder(source, { fee: BASE_FEE, networkPassphrase: this.passphrase })
      .addOperation(op)
      .setTimeout(TX_TIMEOUT_S)
      .build();
  }

  /**
   * Simulates claim(student) with the treasury as source and returns the auth entries the
   * student must sign. Simulation also surfaces contract errors (too early, not enrolled…).
   */
  async prepareClaim(student: string): Promise<{ entries: string[]; validUntilLedger: number }> {
    const { treasury } = this.requirePool();
    const source = await this.rpc.getAccount(treasury.publicKey());
    const sim = await this.rpc.simulateTransaction(this.claimTx(source, student));
    if (rpc.Api.isSimulationError(sim)) throw new PoolError(sim.error);
    const auth = sim.result?.auth ?? [];
    const entries = auth.filter((e) => entryAddress(e) === student);
    if (entries.length === 0) throw new PoolError("claim did not request student authorization");
    return { entries: entries.map((e) => e.toXDR("base64")), validUntilLedger: sim.latestLedger + 60 };
  }

  /** Verifies signed entries match a fresh simulation exactly, then treasury signs + submits. */
  async submitClaim(student: string, signedEntriesB64: string[]): Promise<{ hash: string; amountUnits: bigint }> {
    const { treasury } = this.requirePool();
    const source = await this.rpc.getAccount(treasury.publicKey());
    const fresh = await this.rpc.simulateTransaction(this.claimTx(source, student));
    if (rpc.Api.isSimulationError(fresh)) throw new PoolError(fresh.error);
    const expected = (fresh.result?.auth ?? []).filter((e) => entryAddress(e) === student);

    let signed: xdr.SorobanAuthorizationEntry[];
    try {
      signed = signedEntriesB64.map((b) => xdr.SorobanAuthorizationEntry.fromXDR(b, "base64"));
    } catch {
      throw new ApiError("INVALID_INPUT", "Malformed authorization");
    }
    if (signed.length !== expected.length) throw new ApiError("INVALID_INPUT", "Unexpected authorization entries");
    for (let i = 0; i < signed.length; i++) {
      const s = signed[i]!;
      const e = expected[i]!;
      if (entryAddress(s) !== student || s.rootInvocation.toXDR("base64") !== e.rootInvocation.toXDR("base64")) {
        throw new ApiError("INVALID_INPUT", "Authorization does not match the claim");
      }
    }

    // Building the verification simulation bumped `source`'s sequence; reload for the real tx.
    const freshSource = await this.rpc.getAccount(treasury.publicKey());
    const tx = await this.rpc.prepareTransaction(this.claimTx(freshSource, student, signed));
    tx.sign(treasury);
    const { hash, returnValue } = await this.sendAndWait(tx as Transaction);
    const amountUnits = typeof returnValue === "bigint" ? returnValue : BigInt(String(returnValue ?? 0));
    return { hash, amountUnits };
  }

  async usdcBalanceOf(contractOrAccount: string): Promise<string | null> {
    try {
      const token = new Contract(this.env.usdcAddress);
      const { treasury } = this.requirePool();
      const source = await this.rpc.getAccount(treasury.publicKey());
      const tx = new TransactionBuilder(source, { fee: BASE_FEE, networkPassphrase: this.passphrase })
        .addOperation(token.call("balance", nativeToScVal(Address.fromString(contractOrAccount), { type: "address" })))
        .setTimeout(30)
        .build();
      const sim = await this.rpc.simulateTransaction(tx);
      if (rpc.Api.isSimulationError(sim) || !sim.result) return null;
      return fromUnits(BigInt(scValToNative(sim.result.retval) as bigint));
    } catch {
      return null;
    }
  }
}

export class PoolError extends Error {
  constructor(readonly detail: string) {
    super(detail);
    this.name = "PoolError";
  }
}

function entryAddress(e: xdr.SorobanAuthorizationEntry): string | null {
  const c = e.credentials;
  // Protocol 23+ simulations return the V2 address credentials variant.
  const creds =
    c.type === "sorobanCredentialsAddress" ? c.address : c.type === "sorobanCredentialsAddressV2" ? c.addressV2 : null;
  if (!creds) return null;
  try {
    return Address.fromScAddress(creds.address).toString();
  } catch {
    return null;
  }
}

/** Maps contract error codes surfaced by simulation to API errors. Codes match contracts/README.md. */
export function poolErrorToApi(err: unknown): ApiError {
  const msg = err instanceof Error ? err.message : String(err);
  if (/Error\(Contract, #(\d+)\)/.test(msg)) {
    const code = Number(/Error\(Contract, #(\d+)\)/.exec(msg)![1]);
    const map = POOL_ERROR_MAP[code];
    if (map) return new ApiError(map.code, map.message);
  }
  if (err instanceof ApiError) return err;
  logger.warn({ detail: msg.slice(0, 500) }, "pool error");
  return new ApiError("INTERNAL", "Scholarship Pool is unavailable right now");
}

/** Filled from the contract's #[contracterror] enum (see contracts/README.md). */
export const POOL_ERROR_MAP: Record<number, { code: ApiError["code"]; message: string }> = {
  2: { code: "INVALID_INPUT", message: "Invalid amount" },
  4: { code: "NOT_ENROLLED", message: "You're not enrolled in the Scholarship Pool yet" },
  5: { code: "CLAIM_TOO_EARLY", message: "Your next allowance isn't ready yet" },
  6: { code: "NOT_CONFIGURED", message: "Allowance claims are paused right now" },
  7: { code: "POOL_EMPTY", message: "The Scholarship Pool is empty right now, so sponsors need to top it up" },
};
