import { describe, expect, it } from "vitest";
import {
  TutorError,
  askTutor,
  buildContents,
  costUsd,
  isHardQuestion,
  looksLikeCheating,
  mockAnswer,
  orderProviders,
  pickRoute,
  type ProviderSlot,
  type TutorProvider,
} from "./index.js";

const MODELS = { quick: "gpt-5-nano", default: "gpt-5-mini", hard: "gpt-5-mini" };

function fake(id: TutorProvider["id"], behaviour: () => Promise<string>): ProviderSlot & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    models: MODELS,
    provider: {
      id,
      async answer(req) {
        calls.push(req.model);
        return { text: await behaviour(), tokensIn: 1000, tokensOut: 500 };
      },
    },
  };
}

describe("tutor", () => {
  it("routes hard questions", () => {
    expect(isHardQuestion("Solve 2x^2 - 8x + 6 = 0")).toBe(false);
    expect(isHardQuestion("Prove that the derivative of x^n is n x^(n-1) using limits")).toBe(true);
  });

  it("detects graded-work requests", () => {
    expect(looksLikeCheating("Write me a 1000-word essay about climate change")).toBe(true);
    expect(looksLikeCheating("Gawan mo ako ng reflection paper")).toBe(true);
    expect(looksLikeCheating("How do I make my thesis statement clearer?")).toBe(false);
  });

  it("builds contents with subject hint and trimmed history", () => {
    const c = buildContents("What is F=ma?", "physics", [
      { role: "student", text: "hi" },
      { role: "tutor", text: "hello" },
    ]);
    expect(c).toHaveLength(3);
    expect(c[0]?.role).toBe("user");
    expect(c[1]?.role).toBe("model");
    expect(c[2]?.text).toContain("[Subject: Physics]");
  });

  it("returns canned answers in demo mode", async () => {
    const r = await askTutor({ providers: [] }, { question: "Solve 2x^2 - 8x + 6 = 0" });
    expect(r.mock).toBe(true);
    expect(r.answer).toContain("**Final answer:**");
    expect(mockAnswer("write me an essay about love")).toContain("can't write the whole essay");
  });

  it("picks routes", () => {
    expect(pickRoute("What is photosynthesis?")).toBe("quick");
    expect(pickRoute("Ano ang ibig sabihin ng osmosis?")).toBe("quick");
    expect(pickRoute("What is 2x + 3 = 7?")).toBe("default");
    expect(pickRoute("What is photosynthesis?", "general", [{ role: "student", text: "hi" }])).toBe("default");
    expect(pickRoute("Solve 2x^2 - 8x + 6 = 0")).toBe("default");
    expect(pickRoute("Prove that the derivative of x^n is n x^(n-1) using limits")).toBe("hard");
  });

  it("answers from the primary and prices the call", async () => {
    const primary = fake("openai", async () => "Photosynthesis turns light into sugar.");
    const r = await askTutor({ providers: [primary] }, { question: "What is photosynthesis?" });
    expect(r).toMatchObject({ provider: "openai", model: "gpt-5-nano", route: "quick", mock: false });
    expect(r.costUsd).toBeCloseTo(costUsd("gpt-5-nano", 1000, 500)!);
    expect(primary.calls).toEqual(["gpt-5-nano"]);
  });

  it("falls back when the primary fails or answers empty", async () => {
    const down = fake("openai", async () => {
      throw new Error("429");
    });
    const empty = fake("anthropic", async () => "   ");
    const backup = fake("gemini", async () => "From the backup.");
    const r = await askTutor({ providers: [down, empty, backup] }, { question: "Explain Newton's second law" });
    expect(r.provider).toBe("gemini");
    expect(r.answer).toBe("From the backup.");
    expect([down.calls.length, empty.calls.length, backup.calls.length]).toEqual([1, 1, 1]);
  });

  it("throws TutorError when every provider fails", async () => {
    const down = fake("openai", async () => {
      throw new Error("500");
    });
    await expect(askTutor({ providers: [down, down] }, { question: "hi" })).rejects.toBeInstanceOf(TutorError);
  });

  it("gives a hung provider only its own slice of time", async () => {
    const hung = fake("openai", () => new Promise<string>(() => {}));
    hung.provider.answer = (req) =>
      new Promise((_, reject) => req.signal.addEventListener("abort", () => reject(new Error("aborted"))));
    const backup = fake("anthropic", async () => "ok");
    const r = await askTutor({ providers: [hung, backup], attemptTimeoutMs: 50, timeoutMs: 5_000 }, { question: "hi" });
    expect(r.provider).toBe("anthropic");
  });

  it("tries the student's chosen provider first and keeps the rest as backup", async () => {
    const a = fake("openai", async () => "from openai");
    const b = fake("gemini", async () => "from gemini");
    const c = fake("groq", async () => "from groq");
    expect(orderProviders([a, b, c], "groq").map((s) => s.provider.id)).toEqual(["groq", "openai", "gemini"]);
    expect(orderProviders([a, b], "anthropic").map((s) => s.provider.id)).toEqual(["openai", "gemini"]);
    const r = await askTutor({ providers: [a, b, c] }, { question: "What is photosynthesis?", preferred: "gemini" });
    expect(r.provider).toBe("gemini");
    expect(a.calls).toEqual([]);
  });
});
