import { Keypair } from "@stellar/stellar-sdk";
import type { TutorConfig } from "@tanong/tutor";
import express from "express";
import { createHash } from "node:crypto";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { loadEnv } from "../src/config/env.js";
import { MemoryStore } from "../src/store/memory.js";

const demoTutor: TutorConfig = { providers: [] };
const PAY_TO = Keypair.random().publicKey();
const PAYER = Keypair.random().publicKey();
const TX = "ab".repeat(32);

const b64json = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64");
const unb64json = (s: string) => JSON.parse(Buffer.from(s, "base64").toString("utf8"));

describe("api (payments off / demo mode)", () => {
  const env = loadEnv({ NODE_ENV: "test", PAYMENTS: "off", INVITE_CODES: "FEU001" } as NodeJS.ProcessEnv);
  const store = new MemoryStore();
  const app = createApp(env, { store, tutor: demoTutor });

  it("serves config, price and discovery", async () => {
    const cfg = await request(app).get("/config").expect(200);
    expect(cfg.body).toMatchObject({ network: "stellar:testnet", paymentsEnabled: false, tutorLive: false });
    const price = await request(app).get("/price").expect(200);
    expect(price.body.priceUsdc).toBe("0.005");
    expect(price.body.pricePhp).toBeCloseTo(0.29, 2);
    await request(app).get("/.well-known/x402").expect(200);
    await request(app).get("/openapi.json").expect(200);
  });

  it("answers /ask for free in demo mode", async () => {
    const res = await request(app).post("/ask").send({ question: "Solve 2x^2 - 8x + 6 = 0", subject: "math" }).expect(200);
    expect(res.body.answer).toContain("Final answer");
    expect(res.body.mock).toBe(true);
    expect(res.body.priceUsdc).toBe("0");
  });

  it("validates input", async () => {
    const res = await request(app).post("/ask").send({ question: "" }).expect(400);
    expect(res.body.error.code).toBe("INVALID_INPUT");
    await request(app).post("/ask").set("content-type", "application/json").send("{bad").expect(400);
  });

  it("reports onboarding/pool as not configured", async () => {
    const addr = Keypair.random().publicKey();
    const r1 = await request(app).post("/onboard").send({ address: addr, inviteCode: "FEU001" }).expect(503);
    expect(r1.body.error.code).toBe("NOT_CONFIGURED");
    await request(app).get(`/pool/status?address=${addr}`).expect(503);
  });

  it("wallet-signature login gates receipts", async () => {
    await request(app).get("/receipts").expect(401);
    const kp = Keypair.random();
    const ch = await request(app).post("/auth/challenge").send({ address: kp.publicKey() }).expect(200);
    const sig = Buffer.from(kp.sign(new TextEncoder().encode(ch.body.message))).toString("base64");
    const bad = Buffer.from(Keypair.random().sign(new TextEncoder().encode(ch.body.message))).toString("base64");
    await request(app).post("/auth/verify").send({ address: kp.publicKey(), nonce: ch.body.nonce, signature: bad }).expect(401);
    const ch2 = await request(app).post("/auth/challenge").send({ address: kp.publicKey() }).expect(200);
    const sig2 = Buffer.from(kp.sign(new TextEncoder().encode(ch2.body.message))).toString("base64");
    const v = await request(app).post("/auth/verify").send({ address: kp.publicKey(), nonce: ch2.body.nonce, signature: sig2 }).expect(200);
    const rec = await request(app).get("/receipts").set("Authorization", `Bearer ${v.body.token}`).expect(200);
    expect(rec.body.items).toEqual([]);
    // Joining the pool needs the same sign-in; here the pool isn't configured.
    await request(app).post("/pool/join").send({ inviteCode: "FEU001" }).expect(401);
    const j = await request(app).post("/pool/join").set("Authorization", `Bearer ${v.body.token}`).send({ inviteCode: "FEU001" }).expect(503);
    expect(j.body.error.code).toBe("NOT_CONFIGURED");
    expect(sig).toBeTruthy();
  });

  it("accepts Freighter's SEP-53 signatures (base64 and hex)", async () => {
    const kp = Keypair.random();
    const sep53 = (msg: string) =>
      Buffer.from(kp.sign(createHash("sha256").update(`Stellar Signed Message:\n${msg}`).digest()));
    for (const encode of ["base64", "hex"] as const) {
      const ch = await request(app).post("/auth/challenge").send({ address: kp.publicKey() }).expect(200);
      const signature = sep53(ch.body.message).toString(encode);
      const v = await request(app).post("/auth/verify").send({ address: kp.publicKey(), nonce: ch.body.nonce, signature }).expect(200);
      expect(v.body.token).toBeTruthy();
    }
    // A SEP-53 signature over a different message must still fail.
    const ch = await request(app).post("/auth/challenge").send({ address: kp.publicKey() }).expect(200);
    const wrong = sep53(`${ch.body.message}x`).toString("base64");
    await request(app).post("/auth/verify").send({ address: kp.publicKey(), nonce: ch.body.nonce, signature: wrong }).expect(401);
  });

  it("404s unknown routes with JSON", async () => {
    const r = await request(app).get("/nope").expect(404);
    expect(r.body.error.code).toBe("NOT_FOUND");
  });
});

describe("api (x402 paywall with fake facilitator)", () => {
  let facilitator: Server;
  let facilitatorUrl = "";
  const calls = { verify: 0, settle: 0 };

  beforeAll(async () => {
    const f = express();
    f.use(express.json({ limit: "1mb" }));
    f.get("/supported", (_req, res) =>
      res.json({
        kinds: [{ x402Version: 2, scheme: "exact", network: "stellar:testnet", extra: { areFeesSponsored: true } }],
        extensions: [],
        signers: {},
      }),
    );
    f.post("/verify", (_req, res) => {
      calls.verify++;
      res.json({ isValid: true, payer: PAYER });
    });
    f.post("/settle", (_req, res) => {
      calls.settle++;
      res.json({ success: true, transaction: TX, network: "stellar:testnet", payer: PAYER });
    });
    await new Promise<void>((resolve) => {
      facilitator = f.listen(0, () => resolve());
    });
    facilitatorUrl = `http://127.0.0.1:${(facilitator.address() as AddressInfo).port}`;
  });

  afterAll(() => facilitator?.close());

  function paidApp(tutor: TutorConfig, tutorPro?: TutorConfig) {
    const env = loadEnv({
      NODE_ENV: "test",
      PAYMENTS: "on",
      SERVER_STELLAR_ADDRESS: PAY_TO,
      FACILITATOR_URL: facilitatorUrl,
    } as NodeJS.ProcessEnv);
    const store = new MemoryStore();
    return { app: createApp(env, { store, tutor, tutorPro }), store };
  }

  async function paymentHeader(app: ReturnType<typeof createApp>) {
    const first = await request(app).post("/ask").send({ question: "What is F = ma?" });
    expect(first.status).toBe(402);
    const pr = unb64json(first.headers["payment-required"]!);
    expect(pr.accepts[0]).toMatchObject({ scheme: "exact", network: "stellar:testnet", payTo: PAY_TO, amount: "50000" });
    return b64json({ x402Version: 2, resource: pr.resource, accepted: pr.accepts[0], payload: { transaction: "AAAA" } });
  }

  it("402 → pay → answer + settlement header + recorded receipt", async () => {
    const { app, store } = paidApp(demoTutor);
    const header = await paymentHeader(app);
    const before = { ...calls };
    const res = await request(app).post("/ask").set("PAYMENT-SIGNATURE", header).send({ question: "What is F = ma?" });
    expect(res.status).toBe(200);
    expect(res.body.answer).toMatch(/Newton/);
    expect(res.body.priceUsdc).toBe("0.005");
    const settle = unb64json(res.headers["payment-response"]!);
    expect(settle).toMatchObject({ success: true, transaction: TX });
    expect(calls.verify).toBe(before.verify + 1);
    expect(calls.settle).toBe(before.settle + 1);

    await new Promise((r) => setTimeout(r, 20));
    const rows = await store.listQuestions(PAYER, { limit: 5 });
    expect(rows[0]).toMatchObject({ status: "settled", txHash: TX, priceUnits: 50_000n });
    const stats = await store.stats("stellar:testnet");
    expect(stats.paidQuestions).toBe(1);
  });

  it("does NOT settle when the tutor fails", async () => {
    const failing: TutorConfig = {
      providers: [
        {
          provider: { id: "openai", answer: async () => { throw new Error("boom"); } },
          models: { quick: "m", default: "m", hard: "m" },
        },
      ],
    };
    const { app } = paidApp(failing);
    const header = await paymentHeader(app);
    const before = { ...calls };
    const res = await request(app).post("/ask").set("PAYMENT-SIGNATURE", header).send({ question: "What is F = ma?" });
    expect(res.status).toBe(502);
    expect(res.body.error.message).toMatch(/not charged/);
    expect(calls.settle).toBe(before.settle);
  });

  describe("Pro tier", () => {
    const proSlot = (text: string): TutorConfig => ({
      providers: [
        {
          provider: { id: "openai", answer: async () => ({ text, tokensIn: 500, tokensOut: 700 }) },
          models: { quick: "gpt-5.4", default: "gpt-5.4", hard: "gpt-5.4" },
        },
      ],
    });

    it("advertises Pro models with their price in /config and /price", async () => {
      const { app } = paidApp(demoTutor, proSlot("pro"));
      const cfg = await request(app).get("/config").expect(200);
      expect(cfg.body.proPriceUsdc).toBe("0.02");
      expect(cfg.body.models).toContainEqual(expect.objectContaining({ id: "pro-openai", tier: "pro", priceUsdc: "0.02" }));
      const price = await request(app).get("/price").expect(200);
      expect(price.body).toMatchObject({ priceUsdc: "0.005", proPriceUsdc: "0.02" });
    });

    it("prices ?tier=pro at the Pro price and settles a Pro answer", async () => {
      const { app, store } = paidApp(demoTutor, proSlot("A careful Pro answer."));
      const first = await request(app).post("/ask?tier=pro").send({ question: "Prove it", model: "pro-openai" });
      expect(first.status).toBe(402);
      const pr = unb64json(first.headers["payment-required"]!);
      expect(pr.accepts[0]).toMatchObject({ amount: "200000", payTo: PAY_TO });
      const header = b64json({ x402Version: 2, resource: pr.resource, accepted: pr.accepts[0], payload: { transaction: "AAAA" } });
      const before = { ...calls };
      const res = await request(app).post("/ask?tier=pro").set("PAYMENT-SIGNATURE", header).send({ question: "Prove it", model: "pro-openai" });
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ answer: "A careful Pro answer.", model: "gpt-5.4", priceUsdc: "0.02" });
      expect(calls.settle).toBe(before.settle + 1);
      await new Promise((r) => setTimeout(r, 20));
      const [row] = await store.listQuestions(PAYER, { limit: 1 });
      expect(row).toMatchObject({ priceUnits: 200_000n, model: "gpt-5.4" });
    });

    it("refuses a Pro model paid at the Standard price, without settling", async () => {
      const { app } = paidApp(demoTutor, proSlot("should not be served"));
      const header = await paymentHeader(app);
      const before = { ...calls };
      const res = await request(app).post("/ask").set("PAYMENT-SIGNATURE", header).send({ question: "What is F = ma?", model: "pro-openai" });
      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/tier=pro/);
      expect(calls.settle).toBe(before.settle);
    });
  });
});
