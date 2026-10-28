/**
 * VITE_MOCK_API only: `?seed=demo` boots straight into a lived-in account (balance, history, one
 * answered question) so demos and screenshots don't need clicking. Real keys, mock server.
 */
import { createWallet, unlockWallet } from "@tanong/wallet";
import type { ActivityItem } from "../activity";
import type { ChatMessage } from "../chat";
import { KEYS, readJson, writeJson } from "../storage";
import { pickAnswer } from "./answers";
import { MOCK, randomHash } from "./data";
import { seedAccount } from "./index";

export async function seedDemo(kind: string): Promise<void> {
  const w = (await unlockWallet()) ?? (await createWallet());
  // ₱9.60 at the mock rate = 0.16 USDC = 32 questions.
  const history = seedAccount(w.address, { units: 1_600_000, claimedHoursAgo: kind === "claim" ? 24 * 8 : 26 });

  if (readJson<ChatMessage[]>(KEYS.chat(w.address), []).length === 0 && kind !== "empty") {
    const asked = new Date(Date.now() - 4 * 60_000);
    const question = "Solve 2x² − 8x + 6 = 0 step by step";
    const answer = pickAnswer(question).answer;
    const txHash = randomHash();
    const messages: ChatMessage[] = [
      { id: "seed-q1", role: "student", text: question, subject: "math", at: asked.toISOString() },
      {
        id: "seed-a1",
        role: "tutor",
        text: answer,
        subject: "math",
        at: new Date(asked.getTime() + 4_800).toISOString(),
        status: "done",
        replyTo: "seed-q1",
        receipt: {
          txHash,
          network: MOCK.network,
          priceUsdc: MOCK.priceUsdc,
          settledMs: 4_800,
          model: MOCK.model,
          demo: false,
          sample: false,
          answerId: "seed-a1",
        },
      },
    ];
    writeJson(KEYS.chat(w.address), messages);

    const activity: ActivityItem[] = [
      {
        id: txHash,
        kind: "question",
        amountUsdc: MOCK.priceUsdc,
        title: question,
        subject: "math",
        at: asked.toISOString(),
        txHash,
        network: MOCK.network,
      },
      ...history.slice(0, 5).map((q) => ({
        id: q.txHash ?? q.id,
        kind: "question" as const,
        amountUsdc: q.priceUsdc,
        title: q.question ?? "Question",
        subject: q.subject,
        at: q.createdAt,
        txHash: q.txHash,
        network: q.network,
      })),
      {
        id: randomHash(),
        kind: "claim",
        amountUsdc: MOCK.allowanceUsdc,
        title: "Scholarship allowance",
        at: new Date(Date.now() - 26 * 3_600_000).toISOString(),
        txHash: randomHash(),
        network: MOCK.network,
      },
    ];
    activity.sort((a, b) => b.at.localeCompare(a.at));
    writeJson(KEYS.activity(w.address), activity);
  }
}
