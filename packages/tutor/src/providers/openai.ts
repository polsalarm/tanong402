import OpenAI from "openai";
import type { Effort, ProviderRequest, TutorProvider } from "./types.js";

/** Reasoning tokens count against max_output_tokens, so leave room for thinking. */
const THINKING_HEADROOM: Record<Effort, number> = { minimal: 300, low: 1500, medium: 3000 };

export function openaiProvider(apiKey: string): TutorProvider {
  const client = new OpenAI({ apiKey, maxRetries: 0 });
  return {
    id: "openai",
    async answer(req: ProviderRequest) {
      const res = await client.responses.create(
        {
          model: req.model,
          instructions: req.system,
          input: req.turns.map((t) => ({ role: t.role, content: t.text })),
          max_output_tokens: req.maxOutputTokens + THINKING_HEADROOM[req.effort],
          reasoning: { effort: req.effort },
          store: false,
        },
        { signal: req.signal },
      );
      if (res.status === "incomplete") throw new Error(`openai incomplete: ${res.incomplete_details?.reason ?? "unknown"}`);
      return { text: res.output_text, tokensIn: res.usage?.input_tokens ?? 0, tokensOut: res.usage?.output_tokens ?? 0 };
    },
  };
}
