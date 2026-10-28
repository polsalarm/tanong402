import Anthropic from "@anthropic-ai/sdk";
import type { ProviderRequest, TutorProvider } from "./types.js";

export function anthropicProvider(apiKey: string): TutorProvider {
  const client = new Anthropic({ apiKey, maxRetries: 0 });
  return {
    id: "anthropic",
    async answer(req: ProviderRequest) {
      const res = await client.messages.create(
        {
          model: req.model,
          system: req.system,
          messages: req.turns.map((t) => ({ role: t.role, content: t.text })),
          max_tokens: req.maxOutputTokens,
        },
        { signal: req.signal },
      );
      if (res.stop_reason === "refusal") throw new Error("anthropic refused");
      if (res.stop_reason === "max_tokens") throw new Error("anthropic hit max_tokens");
      const text = res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
      return { text, tokensIn: res.usage.input_tokens, tokensOut: res.usage.output_tokens };
    },
  };
}
