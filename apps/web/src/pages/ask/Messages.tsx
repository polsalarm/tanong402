import { Check, CircleAlert, Copy, RotateCcw, Sparkles, Wallet } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { Link } from "react-router";
import { LogoMark } from "../../components/Logo";
import { Markdown } from "../../components/Markdown";
import { ReceiptChip, type ReceiptView } from "../../components/Receipt";
import { Badge, Button, Spinner } from "../../components/ui";
import { useConfig } from "../../contexts/ConfigContext";
import type { ChatMessage } from "../../lib/chat";
import { copyText } from "../../lib/clipboard";
import { formatClock, seconds } from "../../lib/format";
import { answerToPlainText } from "../../lib/markdown";
import { SUBJECT_ICON, subjectName } from "./subjects";

const EASE = [0.16, 1, 0.3, 1] as const;

export function StudentBubble({ m }: { m: ChatMessage }) {
  const Icon = m.subject ? SUBJECT_ICON[m.subject] : null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: EASE }}
      className="flex flex-col items-end"
    >
      {m.subject && !m.followUp && Icon && (
        <span className="eyebrow mb-1.5 inline-flex items-center gap-1.5 !text-[10px]">
          <Icon className="size-3" aria-hidden />
          {subjectName(m.subject)}
        </span>
      )}
      <div className="relative max-w-[88%] whitespace-pre-wrap rounded-[22px] rounded-br-md bg-[color-mix(in_srgb,var(--t-fg)_8%,transparent)] px-4 py-3 text-[16px] leading-relaxed text-fg shadow-[inset_0_0_0_1px_var(--t-line-strong),0_10px_30px_-18px_rgb(0_0_0/0.6)] sm:max-w-[78%]">
        {m.followUp ? <span className="text-fg-2">Explain more</span> : m.text}
      </div>
    </motion.div>
  );
}

function TutorHeader({ m, children }: { m: ChatMessage; children?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <LogoMark size={26} />
      <span className="text-[14px] font-medium text-fg">Tutor</span>
      {children}
      <span className="ml-auto tabular text-[11.5px] text-fg-4">{formatClock(m.at)}</span>
    </div>
  );
}

/** Paying ₱0.30 → Thinking… → answer. The steps are honest: "paying" ends when the paid request leaves. */
export function PendingAnswer({ m }: { m: ChatMessage }) {
  const { pricePhp, demo } = useConfig();
  const reduce = useReducedMotion();
  const paying = m.status === "paying";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE }}
      aria-live="polite"
      aria-busy="true"
    >
      <TutorHeader m={m} />
      <div className="flex flex-wrap items-center gap-2">
        {!demo && (
          <motion.span
            layout
            className={`inline-flex h-8 items-center gap-2 rounded-full pl-1.5 pr-3 text-[13px] ${paying ? "text-fg shadow-[inset_0_0_0_1px_var(--t-line-strong)]" : "bg-[color-mix(in_srgb,var(--t-success)_9%,transparent)] text-fg-2 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--t-success)_24%,transparent)]"}`}
          >
            <span className="grid size-5 place-items-center">
              <AnimatePresence mode="wait" initial={false}>
                {paying ? (
                  <motion.span key="s" exit={{ opacity: 0, scale: 0.6 }}>
                    <Spinner className="size-4 !text-fg" />
                  </motion.span>
                ) : (
                  <motion.span
                    key="c"
                    initial={{ scale: reduce ? 1 : 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 520, damping: 22 }}
                    className="grid size-5 place-items-center rounded-full bg-[var(--t-success)] text-[var(--t-bg)]"
                  >
                    <Check className="size-3" strokeWidth={3} aria-hidden />
                  </motion.span>
                )}
              </AnimatePresence>
            </span>
            {paying ? (
              <span className="text-shimmer">Paying {pricePhp}</span>
            ) : (
              <span>
                Paid <span className="tabular font-medium text-fg">{pricePhp}</span>
              </span>
            )}
          </motion.span>
        )}
        <AnimatePresence>
          {!paying && (
            <motion.span
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              className="inline-flex h-8 items-center gap-2 px-1 text-[13.5px]"
            >
              <Sparkles className="size-3.5 text-fg-2" aria-hidden />
              <span className="text-shimmer">Thinking it through…</span>
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      <div className="mt-5 grid grid-cols-1 max-w-[560px] gap-3">
        <div className="skeleton-line h-3 w-[92%]" />
        <div className="skeleton-line h-3 w-[78%]" />
        <div className="skeleton-line h-3 w-[86%]" />
        {!paying && <div className="skeleton-line mt-2 h-16 w-full rounded-2xl" />}
      </div>
    </motion.div>
  );
}

export function ErrorAnswer({ m, onRetry, disabled }: { m: ChatMessage; onRetry: () => void; disabled: boolean }) {
  const e = m.error;
  const unknown = e?.charged === "unknown";
  const broke = e?.code === "INSUFFICIENT_FUNDS";
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }}>
      <TutorHeader m={m} />
      <div
        role="alert"
        className="rounded-[22px] bg-[color-mix(in_srgb,var(--t-danger)_7%,transparent)] p-4 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--t-danger)_22%,transparent)] sm:p-5"
      >
        <div className="flex gap-3">
          <CircleAlert className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-[15.5px] font-medium text-fg">{unknown ? "The line dropped" : broke ? "Out of questions" : "Something went wrong"}</p>
            <p className="mt-1 text-[14.5px] leading-relaxed text-fg-2">
              {(e?.message ?? "Please try again.").replace(/\s*You were not charged\.?$/i, "")}
            </p>
            {!unknown && (
              <p className="mt-2.5 inline-flex items-center gap-1.5 text-[14px] font-medium text-success">
                <Check className="size-4" aria-hidden /> You were not charged.
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              {broke && (
                <Link
                  to="/wallet"
                  className="inline-flex h-9 items-center gap-1.5 rounded-full bg-fg px-4 text-[14px] font-medium text-bg transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <Wallet className="size-3.5" aria-hidden />
                  Go to Wallet
                </Link>
              )}
              <Button variant="glass" size="sm" onClick={onRetry} disabled={disabled}>
                <RotateCcw className="size-3.5" aria-hidden />
                Try again
              </Button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function TutorAnswer({
  m,
  onExplainMore,
  explainDisabled,
  pricePhp,
  isLast,
}: {
  m: ChatMessage;
  onExplainMore: () => void;
  explainDisabled: boolean;
  pricePhp: string;
  isLast: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const r = m.receipt;
  const view: ReceiptView | null = r
    ? {
        id: r.answerId,
        kind: "question",
        amountUsdc: r.priceUsdc,
        at: m.at,
        title: null,
        subject: m.subject,
        txHash: r.txHash,
        network: r.network,
        status: r.txHash ? "settled" : "pending",
        settledMs: r.settledMs,
        demo: r.demo,
      }
    : null;

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE }}
      aria-label="Tutor answer"
    >
      <TutorHeader m={m}>
        {r?.sample && <Badge>Sample answer</Badge>}
        {r && !r.demo && r.settledMs > 0 && (
          <span className="hidden tabular text-[11.5px] text-fg-3 sm:inline">{seconds(r.settledMs)}</span>
        )}
      </TutorHeader>
      <Markdown>{m.text}</Markdown>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        {view && <ReceiptChip receipt={view} />}
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={async () => {
              if (await copyText(answerToPlainText(m.text))) {
                setCopied(true);
                setTimeout(() => setCopied(false), 1400);
              }
            }}
            className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-[13.5px] text-fg-2 transition-colors hover:bg-[color-mix(in_srgb,var(--t-fg)_6%,transparent)] hover:text-fg"
          >
            {copied ? <Check className="size-4 text-success" aria-hidden /> : <Copy className="size-4" aria-hidden />}
            {copied ? "Copied" : "Copy"}
          </button>
          {isLast && (
            <button
              type="button"
              onClick={onExplainMore}
              disabled={explainDisabled}
              className="inline-flex h-10 items-center gap-1.5 rounded-full px-3.5 text-[13.5px] font-medium text-fg shadow-[inset_0_0_0_1px_var(--t-line-strong)] transition-colors hover:bg-[color-mix(in_srgb,var(--t-fg)_6%,transparent)] disabled:opacity-45"
            >
              Explain more
              <span className="text-fg-4">·</span>
              <span className="tabular font-medium text-fg-2">{pricePhp}</span>
            </button>
          )}
        </div>
      </div>
    </motion.article>
  );
}
