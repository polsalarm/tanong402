import {
  challengeRequest,
  claimPrepareRequest,
  fromUnits,
  onboardRequest,
  signedXdrRequest,
  stellarAddress,
  type PoolStatus,
  type ReceiptsResponse,
} from "@tanong/shared";
import { Address } from "@stellar/stellar-sdk";
import { Router } from "express";
import { z } from "zod";
import type { Env } from "../config/env.js";
import { ApiError, ah } from "../lib/errors.js";
import { logger } from "../lib/logger.js";
import type { WalletAuth } from "../middleware/auth.js";
import { poolErrorToApi, type StellarService } from "../services/stellar.js";
import type { Store } from "../store/types.js";

export function accountRouter(env: Env, store: Store, stellar: StellarService, auth: WalletAuth) {
  const r = Router();

  // ---------------------------------------------------------------- onboarding
  r.post(
    "/onboard",
    ah(async (req, res) => {
      const { address, inviteCode } = onboardRequest.parse(req.body);
      if (!env.onboardingEnabled) throw new ApiError("NOT_CONFIGURED", "Onboarding is not configured yet");
      const invite = await store.redeemInvite(inviteCode, address);
      if (!invite) throw new ApiError("INVITE_INVALID", "That invite code isn't valid or was already used");
      try {
        const xdr = await stellar.buildOnboardingTx(address, inviteCode);
        await store.upsertWallet({ address, kind: "student", cohort: invite.cohort, inviteCode });
        res.json({ xdr, network: env.network });
      } catch (err) {
        await store.releaseInvite(inviteCode, address);
        throw err;
      }
    }),
  );

  r.post(
    "/onboard/submit",
    ah(async (req, res) => {
      const { address, signedXdr } = signedXdrRequest.parse(req.body);
      const txHash = await stellar.submitOnboardingTx(address, signedXdr);
      await store.upsertWallet({ address, kind: "student", sponsoredTx: txHash });
      if (env.poolEnabled) {
        try {
          await stellar.enroll(address);
          await store.upsertWallet({ address, kind: "student", enrolledAt: new Date() });
        } catch (err) {
          logger.error({ err: err instanceof Error ? err.message : err }, "enroll failed after onboarding");
        }
      }
      res.json({ txHash });
    }),
  );

  // ---------------------------------------------------------------- pool
  r.get(
    "/pool/status",
    ah(async (req, res) => {
      const address = stellarAddress.parse(req.query.address);
      if (!env.poolEnabled) throw new ApiError("NOT_CONFIGURED", "Scholarship Pool is not configured yet");
      try {
        const addr = new Address(address).toScVal();
        const [config, student, nextAt, balance] = await Promise.all([
          stellar.view("config"),
          stellar.view("student", [addr]),
          stellar.view("next_claim_at", [addr]).catch(() => null),
          stellar.usdcBalanceOf(env.POOL_CONTRACT_ID!),
        ]);
        res.json(poolStatus(config, student, nextAt, balance));
      } catch (err) {
        throw poolErrorToApi(err);
      }
    }),
  );

  /**
   * Join the pool with an invite, for accounts that already exist (e.g. Freighter). The caller
   * proves the address with a wallet sign-in; the server builds and signs its own enroll call.
   */
  r.post(
    "/pool/join",
    auth.required(),
    ah(async (req, res) => {
      const address = req.wallet!;
      const { inviteCode } = onboardRequest.pick({ inviteCode: true }).parse(req.body);
      if (!env.poolEnabled) throw new ApiError("NOT_CONFIGURED", "Scholarship Pool is not configured yet");
      const state = await stellar.accountExists(address);
      if (!state.exists) throw new ApiError("INVALID_INPUT", "This account isn't on the network yet. Use invite setup instead.");
      if (!state.hasUsdc) throw new ApiError("INVALID_INPUT", "Turn on pesos for this account first, then try again.");
      // enroll is idempotent on-chain, so check first rather than spend an invite on a no-op.
      const current = asRecord(await stellar.view("student", [new Address(address).toScVal()]).catch(() => null));
      if (current.enrolled === true) throw new ApiError("INVALID_INPUT", "This account already gets the weekly allowance");
      const invite = await store.redeemInvite(inviteCode, address);
      if (!invite) throw new ApiError("INVITE_INVALID", "That invite code isn't valid or was already used");
      try {
        const txHash = await stellar.enroll(address);
        await store.upsertWallet({ address, kind: "student", cohort: invite.cohort, inviteCode, enrolledAt: new Date() });
        res.json({ txHash });
      } catch (err) {
        await store.releaseInvite(inviteCode, address);
        throw poolErrorToApi(err);
      }
    }),
  );

  r.post(
    "/pool/claim/prepare",
    ah(async (req, res) => {
      const { address } = claimPrepareRequest.parse(req.body);
      if (!env.poolEnabled) throw new ApiError("NOT_CONFIGURED", "Scholarship Pool is not configured yet");
      try {
        const prepared = await stellar.prepareClaim(address);
        const cfg = asRecord(await stellar.view("config"));
        res.json({
          xdr: JSON.stringify(prepared),
          allowanceUsdc: fromUnits(toBig(cfg.allowance)),
          nextClaimAt: null,
        });
      } catch (err) {
        throw poolErrorToApi(err);
      }
    }),
  );

  r.post(
    "/pool/claim/submit",
    ah(async (req, res) => {
      const { address, signedXdr } = signedXdrRequest.parse(req.body);
      if (!env.poolEnabled) throw new ApiError("NOT_CONFIGURED", "Scholarship Pool is not configured yet");
      const parsed = z.object({ entries: z.array(z.string()).min(1).max(4) }).safeParse(safeJson(signedXdr));
      if (!parsed.success) throw new ApiError("INVALID_INPUT", "Malformed authorization");
      try {
        const { hash, amountUnits } = await stellar.submitClaim(address, parsed.data.entries);
        await store.recordClaim({ txHash: hash, student: address, amountUnits });
        res.json({ txHash: hash, amountUsdc: fromUnits(amountUnits) });
      } catch (err) {
        throw poolErrorToApi(err);
      }
    }),
  );

  // ---------------------------------------------------------------- auth + receipts
  r.post(
    "/auth/challenge",
    ah(async (req, res) => {
      const { address } = challengeRequest.parse(req.body);
      res.json(auth.challenge(address));
    }),
  );

  r.post(
    "/auth/verify",
    ah(async (req, res) => {
      const body = z.object({ address: stellarAddress, nonce: z.string(), signature: z.string() }).parse(req.body);
      res.json(await auth.verify(body.address, body.nonce, body.signature));
    }),
  );

  r.get(
    "/receipts",
    auth.required(),
    ah(async (req, res) => {
      const cursor = typeof req.query.cursor === "string" ? new Date(req.query.cursor) : undefined;
      const limit = 25;
      const rows = await store.listQuestions(req.wallet!, {
        limit: limit + 1,
        before: cursor && !Number.isNaN(cursor.getTime()) ? cursor : undefined,
      });
      const page = rows.slice(0, limit);
      const body: ReceiptsResponse = {
        items: page.map((q) => ({
          id: q.id,
          question: q.question,
          answerPreview: q.answer ? q.answer.slice(0, 280) : null,
          subject: q.subject,
          model: q.model,
          priceUsdc: fromUnits(q.priceUnits),
          txHash: q.txHash,
          network: q.network,
          status: q.status,
          latencyMs: q.latencyMs,
          createdAt: q.createdAt.toISOString(),
        })),
        nextCursor: rows.length > limit ? page[page.length - 1]!.createdAt.toISOString() : null,
      };
      res.json(body);
    }),
  );

  r.delete(
    "/receipts/:id",
    auth.required(),
    ah(async (req, res) => {
      const id = z.string().uuid().parse(req.params.id);
      const ok = await store.deleteQuestionText(req.wallet!, id);
      if (!ok) throw new ApiError("NOT_FOUND", "Receipt not found");
      res.json({ ok: true });
    }),
  );

  return r;
}

// ------------------------------------------------------------------ helpers

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function toBig(v: unknown): bigint {
  if (typeof v === "bigint") return v;
  if (typeof v === "number") return BigInt(Math.trunc(v));
  if (typeof v === "string" && /^-?\d+$/.test(v)) return BigInt(v);
  return 0n;
}

function toDateIso(secs: unknown): string | null {
  const n = Number(toBig(secs));
  return n > 0 ? new Date(n * 1000).toISOString() : null;
}

/** Tolerant mapping from contract views (field names per contracts/README.md). */
export function poolStatus(config: unknown, student: unknown, nextAt: unknown, balance: string | null): PoolStatus {
  const cfg = asRecord(config);
  const st = asRecord(student);
  const enrolled = Boolean(st.enrolled);
  const period = Number(toBig(cfg.period ?? cfg.period_secs));
  const lastClaim = Number(toBig(st.last_claim));
  const next = toDateIso(nextAt) ?? (enrolled && lastClaim > 0 ? toDateIso(lastClaim + period) : null);
  const paused = Boolean(cfg.paused);
  const canClaim = enrolled && !paused && (!next || new Date(next).getTime() <= Date.now());
  return {
    enrolled,
    allowanceUsdc: fromUnits(toBig(cfg.allowance)),
    periodSeconds: period,
    nextClaimAt: next,
    canClaim,
    totalClaimedUsdc: fromUnits(toBig(st.total_claimed)),
    poolBalanceUsdc: balance,
    sponsors: [],
  };
}
