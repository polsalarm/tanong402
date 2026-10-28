export type ProviderId = "openai" | "anthropic" | "gemini" | "groq";
export type Effort = "minimal" | "low" | "medium";

export interface ProviderRequest {
  system: string;
  turns: { role: "user" | "assistant"; text: string }[];
  model: string;
  /** Budget for the visible answer. Reasoning models add their own thinking headroom on top. */
  maxOutputTokens: number;
  effort: Effort;
  signal: AbortSignal;
}

export interface ProviderAnswer {
  text: string;
  tokensIn: number;
  tokensOut: number;
}

export interface TutorProvider {
  id: ProviderId;
  answer(req: ProviderRequest): Promise<ProviderAnswer>;
}
