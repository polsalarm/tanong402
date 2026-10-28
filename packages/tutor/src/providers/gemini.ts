import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import type { Effort, ProviderRequest, TutorProvider } from "./types.js";

const LEVEL: Record<Effort, ThinkingLevel> = {
  minimal: ThinkingLevel.MINIMAL,
  low: ThinkingLevel.LOW,
  medium: ThinkingLevel.MEDIUM,
};

/**
 * Gemini 3 models think before answering, and thinking tokens share the output budget.
 * Without headroom a hard question can spend the whole budget thinking and return a cut-off answer.
 */
const THINKING_HEADROOM: Record<Effort, number> = { minimal: 300, low: 1500, medium: 3000 };

export function geminiProvider(apiKey: string): TutorProvider {
  const client = new GoogleGenAI({ apiKey });
  return {
    id: "gemini",
    async answer(req: ProviderRequest) {
      const res = await client.models.generateContent({
        model: req.model,
        contents: req.turns.map((t) => ({ role: t.role === "assistant" ? "model" : "user", parts: [{ text: t.text }] })),
        config: {
          systemInstruction: req.system,
          maxOutputTokens: req.maxOutputTokens + THINKING_HEADROOM[req.effort],
          thinkingConfig: { thinkingLevel: LEVEL[req.effort] },
          temperature: 0.4,
          abortSignal: req.signal,
        },
      });
      if (res.candidates?.[0]?.finishReason === "MAX_TOKENS" && !res.text?.trim()) {
        throw new Error("gemini: ran out of tokens while thinking");
      }
      const usage = res.usageMetadata;
      return {
        text: res.text ?? "",
        tokensIn: usage?.promptTokenCount ?? 0,
        // Thinking tokens are billed as output, so count them for cost.
        tokensOut: (usage?.candidatesTokenCount ?? 0) + (usage?.thoughtsTokenCount ?? 0),
      };
    },
  };
}
