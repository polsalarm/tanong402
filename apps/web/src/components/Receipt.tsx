import { explorerTxUrl, SUBJECT_LABEL, type StellarNetwork, type Subject } from "@tanong/shared";
import { ArrowUpRight, Check, Copy, Gift, Trash } from "lucide-react";
import { motion } from "motion/react";
import { useState, useSyncExternalStore } from "react";
import { useConfig } from "../contexts/ConfigContext";
import { useToast } from "../contexts/ToastContext";
import { copyText } from "../lib/clipboard";
import { formatDateTime, php, receiptNumber, seconds, shortHash } from "../lib/format";
import { createStore } from "../lib/storage";
import { DisplayPeso } from "./Money";
import { Sheet } from "./Sheet";
import { Button } from "./ui";

/** Everything a receipt can show, from a chat answer, local activity or the server history. */
export interface ReceiptView {
  id: string;
  kind: "question" | "claim";
  amountUsdc: string;
  at: string;
  title: string | null;
  preview?: string | null;
  subject?: string | null;
  txHash: string | null;
  network: string;
  status: "settled" | "answered" | "settle_failed" | "pending";
  /** Client-measured payment → answer time. */
  settledMs?: number | null;
  /** Server-measured tutor time. */
  latencyMs?: number | null;
  demo?: boolean;
  /** Present for server receipts: lets the student delete the question text. */
  onDeleteText?: () => Promise<void>;
}

const store = createStore<ReceiptView | null>(null);
export const openReceipt = (r: ReceiptView) => store.set(r);
const closeReceipt = () => store.set(null);

const isStellar = (n: string): n is StellarNetwork => n === "stellar:testnet" || n === "stellar:pubnet";

export function subjectLabel(s: string | null | undefined): string | null {
  if (!s) return null;
  return SUBJECT_LABEL[s as Subject] ?? s.charAt(0).toUpperCase() + s.slice(1);
}

/** "✓ Paid ₱0.30 · Receipt" — sits under every paid answer. */
export function ReceiptChip({ receipt, compact = false }: { receipt: ReceiptView; compact?: boolean }) {
  const { phpPerUsd } = useConfig();
  if (receipt.demo) {
    return (
      <span className="inline-flex h-8 items-center gap-2 rounded-full px-3 text-[13px] text-fg-3 shadow-[inset_0_0_0_1px_var(--t-line)]">
        <span className="size-1.5 rounded-full bg-[var(--t-warn)]" aria-hidden />
        Demo · free
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={() => openReceipt(receipt)}
      className="hit-slop group relative inline-flex h-8 items-center gap-2 rounded-full bg-[color-mix(in_srgb,var(--t-success)_9%,transparent)] pl-1.5 pr-3 text-[13px] text-fg-2 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--t-success)_24%,transparent)] transition-colors duration-200 hover:text-fg"
    >
      <span className="grid size-5 place-items-center rounded-full bg-[var(--t-success)] text-[var(--t-bg)]">
        <Check className="size-3" strokeWidth={3} aria-hidden />
      </span>
      <span>
        Paid <span className="tabular font-medium text-fg">{php(receipt.amountUsdc, phpPerUsd)}</span>
      </span>
      {!compact && (
        <>
          <span aria-hidden className="text-fg-4">
            ·
          </span>
          <span className="underline decoration-[var(--t-line-strong)] underline-offset-[3px] group-hover:decoration-fg-3">
            Receipt
          </span>
        </>
      )}
    </button>
  );
}

function DetailRow({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3">
      <dt className="text-[14px] text-fg-3">{label}</dt>
      <dd className={`text-right text-[14.5px] text-fg ${mono ? "tabular font-mono text-[13.5px]" : ""}`}>{value}</dd>
    </div>
  );
}

/** Rendered once at the app root; any component opens it with openReceipt(). */
export function ReceiptHost() {
  const receipt = useSyncExternalStore(store.subscribe, store.get);
  const { phpPerUsd } = useConfig();
  const { toast } = useToast();
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState<string | null>(null);

  const r = receipt;
  const claim = r?.kind === "claim";
  const statusText = !r
    ? ""
    : r.status === "settle_failed"
      ? "Not charged"
      : r.status === "pending"
        ? "Processing"
        : claim
          ? "Received"
          : "Paid";
  const statusTone =
    r?.status === "settle_failed" ? "text-fg-2" : r?.status === "pending" ? "text-warn" : "text-success";

  return (
    <Sheet open={r !== null} onClose={closeReceipt} title={claim ? "Allowance receipt" : "Receipt"}>
      {r && (
        <div className="pb-1">
          <div className="flex flex-col items-center pb-6 pt-3 text-center">
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 420, damping: 22, delay: 0.08 }}
              className={`mb-4 grid size-12 place-items-center rounded-full ${r.status === "settle_failed" ? "bg-[color-mix(in_srgb,var(--t-fg)_8%,transparent)] text-fg-2" : "bg-[color-mix(in_srgb,var(--t-success)_14%,transparent)] text-success shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--t-success)_30%,transparent)]"}`}
            >
              {claim ? <Gift className="size-5" /> : <Check className="size-5" strokeWidth={2.5} />}
            </motion.div>
            <p className="font-display text-[56px] leading-none tracking-[-0.02em] text-fg">
              <DisplayPeso text={`${claim ? "+" : ""}${php(r.amountUsdc, phpPerUsd)}`} />
            </p>
            <p className={`mt-3 inline-flex items-center gap-1.5 text-[14px] font-medium ${statusTone}`}>
              {statusText}
              <span className="text-fg-4">·</span>
              <span className="font-normal text-fg-3">{formatDateTime(r.at)}</span>
            </p>
          </div>

          {r.title && deleted !== r.id && (
            <div className="glass relative mb-4 rounded-2xl px-4 py-3.5">
              <p className="eyebrow mb-1.5">{claim ? "For" : "Question"}</p>
              <p className="text-[15px] leading-relaxed text-fg">{r.title}</p>
              {r.preview && (
                <p className="mt-2 line-clamp-3 text-[14px] leading-relaxed text-fg-3">{r.preview.replace(/[*#$`]/g, "")}</p>
              )}
            </div>
          )}

          <dl className="divide-y divide-[var(--t-line)] rounded-2xl px-1">
            {r.subject && <DetailRow label="Subject" value={subjectLabel(r.subject)} />}
            {!claim && r.settledMs ? <DetailRow label="Paid and answered in" value={seconds(r.settledMs)} mono /> : null}
            {!claim && !r.settledMs && r.latencyMs ? <DetailRow label="Answered in" value={seconds(r.latencyMs)} mono /> : null}
            <DetailRow
              label="Receipt no."
              value={
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 hover:text-fg-2"
                  onClick={async () => {
                    const ok = await copyText(receiptNumber(r.txHash ?? r.id));
                    toast({ title: ok ? "Receipt number copied" : "Couldn't copy", tone: ok ? "success" : "error" });
                  }}
                >
                  {receiptNumber(r.txHash ?? r.id)}
                  <Copy className="size-3.5 text-fg-3" aria-hidden />
                </button>
              }
              mono
            />
            {r.status === "settle_failed" && (
              <DetailRow label="Charge" value="None. The answer was on us." />
            )}
          </dl>

          {r.txHash && isStellar(r.network) && (
            <a
              href={explorerTxUrl(r.network, r.txHash)}
              target="_blank"
              rel="noreferrer"
              className="glass relative mt-4 flex min-h-14 items-center justify-between gap-3 rounded-2xl px-4 transition-colors hover:bg-[color-mix(in_srgb,var(--t-fg)_4%,transparent)]"
            >
              <span>
                <span className="block text-[15px] font-medium text-fg">View public record</span>
                <span className="tabular mt-0.5 block font-mono text-[12.5px] text-fg-3">{shortHash(r.txHash, 10, 8)}</span>
              </span>
              <ArrowUpRight className="size-[18px] text-fg-2" aria-hidden />
            </a>
          )}

          {r.onDeleteText && r.title && deleted !== r.id && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-4 w-full !text-fg-3 hover:!text-danger"
              loading={deleting}
              onClick={async () => {
                setDeleting(true);
                try {
                  await r.onDeleteText?.();
                  setDeleted(r.id);
                  toast({ title: "Question text deleted", description: "The receipt stays; the words are gone.", tone: "success" });
                } catch {
                  toast({ title: "Couldn't delete right now", tone: "error" });
                } finally {
                  setDeleting(false);
                }
              }}
            >
              <Trash className="size-4" aria-hidden />
              Delete question text
            </Button>
          )}
        </div>
      )}
    </Sheet>
  );
}
