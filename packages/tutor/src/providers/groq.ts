import OpenAI from "openai";
import type { Effort, ProviderRequest, TutorProvider } from "./types.js";

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

/** Reasoning models on Groq (gpt-oss, qwen3, r1) take a reasoning effort and spend tokens thinking. */
const isReasoning = (model: string) => /gpt-oss|qwen3|deepseek-r1/i.test(model);
const GROQ_EFFORT: Record<Effort, "low" | "medium"> = { minimal: "low", low: "low", medium: "medium" };
const THINKING_HEADROOM: Record<Effort, number> = { minimal: 300, low: 1000, medium: 2000 };

/** Groq: OpenAI-compatible Chat Completions on Groq's LPU hardware. Very fast, cheap open models. */
export function groqProvider(apiKey: string): TutorProvider {
  const client = new OpenAI({ apiKey, baseURL: GROQ_BASE_URL, maxRetries: 0 });
  return {
    id: "groq",
    async answer(req: ProviderRequest) {
      const reasoning = isReasoning(req.model);
      const res = await client.chat.completions.create(
        {
          model: req.model,
          messages: [
            { role: "system", content: req.system },
            ...req.turns.map((t) => ({ role: t.role, content: t.text })),
          ],
          max_completion_tokens: req.maxOutputTokens + (reasoning ? THINKING_HEADROOM[req.effort] : 0),
          temperature: 0.4,
          ...(reasoning ? { reasoning_effort: GROQ_EFFORT[req.effort] } : {}),
        },
        { signal: req.signal },
      );
      const choice = res.choices[0];
      if (choice?.finish_reason === "length" && !choice.message.content) throw new Error("groq: ran out of tokens");
      return {
        text: choice?.message.content ?? "",
        tokensIn: res.usage?.prompt_tokens ?? 0,
        tokensOut: res.usage?.completion_tokens ?? 0,
      };
    },
  };
}
