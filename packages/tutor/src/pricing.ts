/** USD per 1M tokens [input, output]. Checked October 2026; see docs/AI_INTEGRATION.md. */
const PRICES: Record<string, [number, number]> = {
  "gpt-5-nano": [0.05, 0.4],
  "gpt-5-mini": [0.25, 2.0],
  "gpt-5.4-mini": [0.75, 4.5],
  // Pro tier (third-party aggregator prices, Oct 2026; verify on official pages)
  "gpt-5.4": [2.5, 15],
  "gpt-5.5": [5, 30],
  "gemini-3.1-pro-preview": [2.5, 15],
  "gemini-pro-latest": [2.5, 15],
  "claude-haiku-5-5": [0.1, 0.5],
  "claude-sonnet-5-5": [2, 10],
  "gemini-2.5-flash-lite": [0.1, 0.4],
  "gemini-3.1-flash-lite": [0.25, 1.5],
  "gemini-flash-lite-latest": [0.25, 1.5],
  "gemini-flash-latest": [0.75, 3.75],
  // Groq (verify at groq.com/pricing before launch)
  "llama-3.1-8b-instant": [0.05, 0.08],
  "openai/gpt-oss-20b": [0.075, 0.3],
  "openai/gpt-oss-120b": [0.15, 0.6],
};

/** Cost of one call in USD, or null when the model isn't in the table. */
export function costUsd(model: string, tokensIn: number, tokensOut: number): number | null {
  const p = PRICES[model];
  if (!p) return null;
  return (tokensIn * p[0] + tokensOut * p[1]) / 1_000_000;
}
