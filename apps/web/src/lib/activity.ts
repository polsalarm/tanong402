import { useSyncExternalStore } from "react";
import { KEYS, createStore, readJson, writeJson } from "./storage";

/** A local, per-account log of what happened on this phone (questions paid, allowances claimed). */
export interface ActivityItem {
  id: string;
  kind: "question" | "claim";
  /** Positive USDC amount; the kind decides the sign shown. */
  amountUsdc: string;
  title: string;
  subject?: string | null;
  at: string;
  txHash: string | null;
  network: string;
}

const MAX_ITEMS = 60;
const store = createStore<{ owner: string | null; items: ActivityItem[] }>({ owner: null, items: [] });

export const activity = {
  load(owner: string | null) {
    store.set({ owner, items: owner ? readJson<ActivityItem[]>(KEYS.activity(owner), []) : [] });
  },
  add(item: ActivityItem) {
    store.set((prev) => {
      if (!prev.owner) return prev;
      const items = [item, ...prev.items.filter((i) => i.id !== item.id)].slice(0, MAX_ITEMS);
      writeJson(KEYS.activity(prev.owner), items);
      return { ...prev, items };
    });
  },
  clear() {
    store.set((prev) => {
      if (prev.owner) writeJson(KEYS.activity(prev.owner), []);
      return { ...prev, items: [] };
    });
  },
};

export function useActivity(): ActivityItem[] {
  return useSyncExternalStore(store.subscribe, () => store.get().items);
}
