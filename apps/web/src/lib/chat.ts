import type { Subject } from "@tanong/shared";
import { useSyncExternalStore } from "react";
import type { Charged, ClientErrorCode } from "./api";
import { KEYS, createStore, readJson, writeJson } from "./storage";

/** Chat lives in memory and in localStorage per account. Never secrets, never signatures. */
export interface ChatReceipt {
  txHash: string | null;
  network: string;
  priceUsdc: string;
  settledMs: number;
  model: string;
  /** Payments were off: the answer was free. */
  demo: boolean;
  /** The tutor ran without a live model (canned sample answer). */
  sample: boolean;
  answerId: string;
}

export interface ChatMessage {
  id: string;
  role: "student" | "tutor";
  text: string;
  subject: Subject | null;
  at: string;
  /** Tutor messages only. */
  status?: "paying" | "thinking" | "done" | "error";
  /** The student message this answer replies to (for retry). */
  replyTo?: string;
  receipt?: ChatReceipt;
  error?: { code: ClientErrorCode; message: string; charged: Charged };
  /** "Explain more" follow-ups are marked so the UI can label them. */
  followUp?: boolean;
}

const MAX_SAVED = 40;
const GUEST = "guest";
const store = createStore<{ owner: string; messages: ChatMessage[] }>({ owner: GUEST, messages: [] });

function persist(owner: string, messages: ChatMessage[]) {
  const settled = messages.filter((m) => m.role === "student" || m.status === "done" || m.status === "error");
  writeJson(KEYS.chat(owner), settled.slice(-MAX_SAVED));
}

export const chat = {
  load(owner: string | null) {
    const key = owner ?? GUEST;
    const saved = readJson<ChatMessage[]>(KEYS.chat(key), []);
    // A pending answer can't survive a reload; drop orphans so the thread stays honest.
    store.set({ owner: key, messages: saved.filter((m) => m.role === "student" || m.status === "done" || m.status === "error") });
  },
  add(message: ChatMessage) {
    store.set((prev) => {
      const messages = [...prev.messages, message];
      persist(prev.owner, messages);
      return { ...prev, messages };
    });
  },
  update(id: string, patch: Partial<ChatMessage>) {
    store.set((prev) => {
      const messages = prev.messages.map((m) => (m.id === id ? { ...m, ...patch } : m));
      persist(prev.owner, messages);
      return { ...prev, messages };
    });
  },
  remove(id: string) {
    store.set((prev) => {
      const messages = prev.messages.filter((m) => m.id !== id);
      persist(prev.owner, messages);
      return { ...prev, messages };
    });
  },
  clear() {
    store.set((prev) => {
      writeJson(KEYS.chat(prev.owner), []);
      return { ...prev, messages: [] };
    });
  },
  get: () => store.get().messages,
};

export function useChat(): ChatMessage[] {
  return useSyncExternalStore(store.subscribe, () => store.get().messages);
}
