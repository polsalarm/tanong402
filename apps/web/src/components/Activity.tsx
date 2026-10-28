import { Gift, MessageCircle } from "lucide-react";
import { motion } from "motion/react";
import { useConfig } from "../contexts/ConfigContext";
import type { ActivityItem } from "../lib/activity";
import { formatClock, formatDayLabel, phpValue } from "../lib/format";
import { Amount } from "./Money";
import { stagger } from "./Page";
import { openReceipt, subjectLabel } from "./Receipt";

export function openActivityReceipt(item: ActivityItem) {
  openReceipt({
    id: item.id,
    kind: item.kind,
    amountUsdc: item.amountUsdc,
    at: item.at,
    title: item.kind === "claim" ? "Scholarship allowance" : item.title,
    subject: item.subject ?? null,
    txHash: item.txHash,
    network: item.network,
    status: "settled",
  });
}

/** Questions (−₱0.30) and allowances (+₱15.00), newest first, grouped by day. */
export function ActivityList({ items, limit, dense = false }: { items: ActivityItem[]; limit?: number; dense?: boolean }) {
  const { phpPerUsd } = useConfig();
  const shown = limit ? items.slice(0, limit) : items;
  const groups: { day: string; items: ActivityItem[] }[] = [];
  for (const item of shown) {
    const day = formatDayLabel(item.at);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.items.push(item);
    else groups.push({ day, items: [item] });
  }

  return (
    <motion.div variants={stagger.parent} initial="hidden" animate="show" className="grid grid-cols-1 gap-4">
      {groups.map((g) => (
        <section key={g.day}>
          {!dense && <h3 className="eyebrow mb-1.5 px-1">{g.day}</h3>}
          <ul className="grid grid-cols-1">
            {g.items.map((item) => {
              const claim = item.kind === "claim";
              return (
                <motion.li key={item.id} variants={stagger.child}>
                  <button
                    type="button"
                    onClick={() => openActivityReceipt(item)}
                    className={`flex w-full items-center gap-3 rounded-2xl px-2 text-left transition-colors duration-200 hover:bg-[color-mix(in_srgb,var(--t-fg)_4%,transparent)] ${dense ? "min-h-14 py-1.5" : "min-h-16 py-2"}`}
                  >
                    <span
                      className={`grid size-10 shrink-0 place-items-center rounded-full shadow-[inset_0_0_0_1px_var(--t-line)] ${claim ? "bg-[color-mix(in_srgb,var(--t-success)_12%,transparent)] text-success" : "bg-[color-mix(in_srgb,var(--t-fg)_6%,transparent)] text-fg-2"}`}
                    >
                      {claim ? <Gift className="size-[17px]" aria-hidden /> : <MessageCircle className="size-[17px]" aria-hidden />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] text-fg">{claim ? "Scholarship allowance" : item.title}</span>
                      <span className="mt-0.5 block text-[12.5px] text-fg-3">
                        {dense ? `${formatDayLabel(item.at)} · ` : ""}
                        {formatClock(item.at)}
                        {!dense && !claim && item.subject ? ` · ${subjectLabel(item.subject)}` : ""}
                      </span>
                    </span>
                    <Amount
                      value={phpValue(item.amountUsdc, phpPerUsd)}
                      sign={claim ? "+" : "−"}
                      className={`shrink-0 text-[14px] ${claim ? "text-success" : "text-fg-2"}`}
                    />
                  </button>
                </motion.li>
              );
            })}
          </ul>
        </section>
      ))}
    </motion.div>
  );
}
