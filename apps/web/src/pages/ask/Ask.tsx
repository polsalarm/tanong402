import { AI_CHOICES, tierOf, type AiChoice, type HistoryTurn, type Subject } from "@tanong/shared";
import { ArrowRight, ArrowUpRight, Gift, Plus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { Page } from "../../components/Page";
import { LinkButton } from "../../components/ui";
import { useConfig } from "../../contexts/ConfigContext";
import { useWallet } from "../../contexts/WalletContext";
import { activity } from "../../lib/activity";
import { errorMessage, toApiError } from "../../lib/api";
import { performAsk } from "../../lib/ask";
import { chat, useChat, type ChatMessage } from "../../lib/chat";
import { formatWeekday, greeting, php, questionsLabel, uid } from "../../lib/format";
import { usePool } from "../../lib/hooks/usePool";
import type { Signer } from "../../lib/signer";
import { KEYS, readString, writeString } from "../../lib/storage";
import { Composer } from "./Composer";
import { ErrorAnswer, PendingAnswer, StudentBubble, TutorAnswer } from "./Messages";
import { FOLLOW_UP, SUBJECT_ICON, SUBJECT_ORDER, SUGGESTIONS, subjectName } from "./subjects";

const EASE = [0.16, 1, 0.3, 1] as const;

function readSubject(): Subject | null {
  const s = readString(KEYS.subject);
  return s && (SUBJECT_ORDER as string[]).includes(s) ? (s as Subject) : null;
}

function readModel(): AiChoice {
  const m = readString(KEYS.model);
  return m && (AI_CHOICES as readonly string[]).includes(m) ? (m as AiChoice) : "auto";
}

/** The last few settled turns before `beforeId`, in the shape the API accepts. */
function historyFor(messages: ChatMessage[], beforeId: string): HistoryTurn[] {
  const idx = messages.findIndex((m) => m.id === beforeId);
  const prior = (idx === -1 ? messages : messages.slice(0, idx)).filter(
    (m) => m.role === "student" || m.status === "done",
  );
  return prior.slice(-8).map((m) => ({ role: m.role, text: m.text.slice(0, 6000) }));
}

function EmptyState({ onPick, subject, onSubject }: { onPick: (text: string, s: Subject) => void; subject: Subject | null; onSubject: (s: Subject | null) => void }) {
  const { pricePhp, demo } = useConfig();
  return (
    <div className="mx-auto flex max-w-[720px] flex-col pt-6 sm:pt-12 lg:pt-16">
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} className="eyebrow">
        {greeting()}
      </motion.p>
      <motion.h1
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: EASE, delay: 0.05 }}
        className="mt-4 font-display text-[clamp(2.75rem,5vw+1rem,4.5rem)] leading-[0.98] tracking-[-0.03em] text-fg"
      >
        Ano'ng <span className="em-metal">tanong</span> mo?
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: EASE, delay: 0.12 }}
        className="mt-4 max-w-md text-[16px] leading-relaxed text-fg-2"
      >
        Step-by-step answers in English or Taglish.{" "}
        {demo ? "Free while we're in demo mode." : <>{pricePhp} per question, receipt included.</>}
      </motion.p>

      <motion.div
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.2 } } }}
        className="mt-9 grid grid-cols-1 gap-3 sm:grid-cols-2"
      >
        {SUGGESTIONS.map((s) => {
          const Icon = SUBJECT_ICON[s.subject];
          return (
            <motion.button
              key={s.text}
              type="button"
              variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } } }}
              onClick={() => onPick(s.text, s.subject)}
              className="glass group relative flex min-h-[84px] flex-col justify-between gap-3 rounded-[22px] p-4 text-left transition-transform duration-300 ease-[var(--ease-silk)] hover:-translate-y-0.5"
            >
              <span className="flex items-center justify-between">
                <span className="eyebrow inline-flex items-center gap-1.5 !text-[10px]">
                  <Icon className="size-3.5" aria-hidden />
                  {subjectName(s.subject)}
                </span>
                <ArrowUpRight className="size-4 text-fg-3 transition-colors group-hover:text-fg" aria-hidden />
              </span>
              <span className="text-[15px] leading-snug text-fg">{s.text}</span>
            </motion.button>
          );
        })}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="no-scrollbar -mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
        role="group"
        aria-label="Subject"
      >
        {SUBJECT_ORDER.filter((s) => s !== "general").map((s) => {
          const Icon = SUBJECT_ICON[s];
          const active = subject === s;
          return (
            <button
              key={s}
              type="button"
              aria-pressed={active}
              onClick={() => onSubject(active ? null : s)}
              className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13.5px] transition-colors duration-200 ${active ? "metal-fill" : "text-fg-2 shadow-[inset_0_0_0_1px_var(--t-line-strong)] hover:text-fg"}`}
            >
              <Icon className="size-3.5" aria-hidden />
              {subjectName(s)}
            </button>
          );
        })}
      </motion.div>
    </div>
  );
}

function SetupCard() {
  return (
    <div className="mx-auto max-w-[560px] pt-10 sm:pt-16">
      <div className="glass relative overflow-hidden rounded-[30px] p-7 sm:p-9">
        <div className="spotlight -right-24 -top-24 size-72" aria-hidden />
        <p className="eyebrow">One step first</p>
        <h1 className="relative mt-4 font-display text-[44px] leading-[1] tracking-[-0.025em] text-fg">
          Your tutor is <span className="em-metal">waiting.</span>
        </h1>
        <p className="relative mt-4 text-[15.5px] leading-relaxed text-fg-2">
          Enter the invite code from your school or org. It sets up your account on this phone and adds your weekly
          allowance.
        </p>
        <LinkButton to="/start" variant="metal" size="lg" className="relative mt-7 w-full sm:w-auto">
          I have an invite code
          <ArrowRight className="size-[18px]" aria-hidden />
        </LinkButton>
      </div>
    </div>
  );
}

function BalanceBanner() {
  const { demo } = useConfig();
  const { status, balance, questionsLeft } = useWallet();
  const pool = usePool();
  if (demo || status !== "ready" || !balance || questionsLeft > 5) return null;
  const next = pool.data?.nextClaimAt ? new Date(pool.data.nextClaimAt) : null;
  const canClaim = Boolean(pool.data?.canClaim);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass relative mb-2.5 flex items-center gap-3 rounded-2xl px-4 py-2.5 text-[13.5px]"
    >
      <span className={`size-2 shrink-0 rounded-full ${questionsLeft === 0 ? "bg-[var(--t-danger)]" : "bg-[var(--t-warn)]"}`} aria-hidden />
      <span className="min-w-0 flex-1 text-fg-2">
        <span className="font-medium text-fg">{questionsLabel(questionsLeft)}</span>
        {canClaim ? " · your allowance is ready" : next ? ` · next allowance ${formatWeekday(next)}` : ""}
      </span>
      <Link to="/wallet" className="inline-flex shrink-0 items-center gap-1 font-medium text-fg hover:underline">
        {canClaim ? (
          <>
            <Gift className="size-3.5" aria-hidden /> Claim
          </>
        ) : (
          "Wallet"
        )}
      </Link>
    </motion.div>
  );
}

export default function Ask() {
  const { config, demo, pricePhp, status: cfgStatus } = useConfig();
  const wallet = useWallet();
  const messages = useChat();
  const [draft, setDraft] = useState("");
  const [subject, setSubjectState] = useState<Subject | null>(readSubject);
  const [modelPref, setModelState] = useState<AiChoice>(readModel);
  const models = config?.models ?? [];
  // Fall back to Auto if the saved pick isn't offered by this server.
  const model: AiChoice = models.some((m) => m.id === modelPref) ? modelPref : "auto";
  const setModel = (m: AiChoice) => {
    setModelState(m);
    writeString(KEYS.model, m);
  };
  const ctrlRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const firstScroll = useRef(true);

  const pending = messages.some((m) => m.status === "paying" || m.status === "thinking");
  const needsAccount = Boolean(config?.paymentsEnabled) && (wallet.status === "none" || wallet.status === "error");
  const signingPaused = wallet.kind === "freighter" && wallet.freighterIssue !== null;
  const ready = Boolean(config) && !needsAccount && !signingPaused && (demo || wallet.status === "ready");
  // Pro models cost more per question, so the button shows the selected model's price.
  const proSelected = tierOf(model) === "pro" && Boolean(config?.proPriceUsdc);
  const priceLabel = demo ? "Free" : proSelected && config?.proPriceUsdc ? php(config.proPriceUsdc, config.phpPerUsd) : pricePhp;

  const setSubject = (s: Subject | null) => {
    setSubjectState(s);
    writeString(KEYS.subject, s ?? "");
  };

  // Keep the newest message in view.
  useLayoutEffect(() => {
    if (messages.length === 0) return;
    const toBottom = (behavior: ScrollBehavior) =>
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior });
    if (firstScroll.current) {
      firstScroll.current = false;
      toBottom("auto");
      // Math fonts can grow the thread after first paint; settle at the bottom once they're in.
      void document.fonts?.ready.then(() => requestAnimationFrame(() => toBottom("auto")));
    } else {
      requestAnimationFrame(() => toBottom("smooth"));
    }
  }, [messages.length, messages[messages.length - 1]?.status]);

  useEffect(() => () => ctrlRef.current?.abort(), []);

  const ask = useCallback(
    async (text: string, opts: { followUp?: boolean; retryOf?: ChatMessage; subjectOverride?: Subject | null } = {}) => {
      if (!config) return;
      const subj = opts.subjectOverride !== undefined ? opts.subjectOverride : subject;
      let studentId: string;
      if (opts.retryOf) {
        studentId = opts.retryOf.replyTo ?? "";
        chat.remove(opts.retryOf.id);
      } else {
        studentId = uid();
        chat.add({ id: studentId, role: "student", text, subject: subj, at: new Date().toISOString(), followUp: opts.followUp });
      }
      const answerId = uid();
      chat.add({
        id: answerId,
        role: "tutor",
        text: "",
        subject: subj,
        at: new Date().toISOString(),
        status: config.paymentsEnabled ? "paying" : "thinking",
        replyTo: studentId,
      });
      const history = historyFor(chat.get(), studentId);
      const ctrl = new AbortController();
      ctrlRef.current = ctrl;
      const body = {
        question: text,
        subject: subj ?? undefined,
        history: history.length ? history : undefined,
        model: model !== "auto" ? model : undefined,
      };
      const run = (signer: Signer | null) =>
        performAsk(body, {
          config,
          signer,
          signal: ctrl.signal,
          onPhase: (phase) => chat.update(answerId, { status: phase }),
        });
      try {
        const out = config.paymentsEnabled ? await wallet.withSigner(run) : await run(null);
        const at = new Date().toISOString();
        chat.update(answerId, {
          status: "done",
          text: out.answer.answer,
          at,
          receipt: {
            txHash: out.receipt?.txHash ?? null,
            network: out.receipt?.network ?? config.network,
            priceUsdc: out.receipt?.priceUsdc ?? out.answer.priceUsdc,
            settledMs: out.receipt?.settledMs ?? out.elapsedMs,
            model: out.answer.model,
            demo: !out.receipt,
            sample: Boolean(out.answer.mock) || !config.tutorLive,
            answerId: out.answer.id,
          },
        });
        if (out.receipt) {
          wallet.nudgeBalance(-Number(out.receipt.priceUsdc));
          activity.add({
            id: out.receipt.txHash ?? out.answer.id,
            kind: "question",
            amountUsdc: out.receipt.priceUsdc,
            title: opts.followUp ? "Explain more" : text,
            subject: subj,
            at,
            txHash: out.receipt.txHash,
            network: out.receipt.network,
          });
        }
      } catch (err) {
        const e = toApiError(err);
        chat.update(answerId, { status: "error", error: { code: e.code, message: errorMessage(e), charged: e.charged } });
      }
    },
    [config, subject, wallet, model],
  );

  const submit = () => {
    const text = draft.trim();
    if (!text || pending || !ready) return;
    setDraft("");
    void ask(text);
  };

  const lastTutor = [...messages].reverse().find((m) => m.role === "tutor");

  let placeholder = "Type or paste your problem…";
  if (!config && cfgStatus !== "ready") placeholder = "Connecting…";
  else if (needsAccount) placeholder = "Set up your account to ask";
  else if (signingPaused) placeholder = "Fix your sign-in in Settings to ask";

  return (
    <Page className="flex min-h-[calc(100dvh-170px)] flex-col lg:min-h-[calc(100dvh-80px)]">
      <div className="flex-1">
        {needsAccount && messages.length === 0 ? (
          <SetupCard />
        ) : messages.length === 0 ? (
          <EmptyState
            subject={subject}
            onSubject={setSubject}
            onPick={(text, s) => {
              setSubject(s);
              if (ready) void ask(text, { subjectOverride: s });
              else setDraft(text);
            }}
          />
        ) : (
          <div className="mx-auto max-w-[720px]">
            <div className="mb-6 flex items-center justify-between">
              <p className="eyebrow">Today's session</p>
              <button
                type="button"
                onClick={() => !pending && chat.clear()}
                disabled={pending}
                className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] text-fg-2 shadow-[inset_0_0_0_1px_var(--t-line)] transition-colors hover:text-fg disabled:opacity-40"
              >
                <Plus className="size-3.5" aria-hidden />
                New chat
              </button>
            </div>
            <div className="grid grid-cols-1 gap-9 pb-6">
              <AnimatePresence initial={false}>
                {messages.map((m) =>
                  m.role === "student" ? (
                    <StudentBubble key={m.id} m={m} />
                  ) : m.status === "paying" || m.status === "thinking" ? (
                    <PendingAnswer key={m.id} m={m} />
                  ) : m.status === "error" ? (
                    <ErrorAnswer
                      key={m.id}
                      m={m}
                      disabled={pending || !ready}
                      onRetry={() => {
                        const q = messages.find((x) => x.id === m.replyTo);
                        if (q) void ask(q.followUp ? FOLLOW_UP : q.text, { retryOf: m, followUp: q.followUp, subjectOverride: q.subject });
                      }}
                    />
                  ) : (
                    <TutorAnswer
                      key={m.id}
                      m={m}
                      pricePhp={priceLabel}
                      isLast={m.id === lastTutor?.id}
                      explainDisabled={pending || !ready}
                      onExplainMore={() => void ask(FOLLOW_UP, { followUp: true, subjectOverride: m.subject })}
                    />
                  ),
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
        <div ref={endRef} className="h-px" />
      </div>

      <div className="sticky bottom-[calc(90px+env(safe-area-inset-bottom))] z-30 mx-auto mt-6 w-full max-w-[720px] lg:bottom-6">
        <div aria-hidden className="pointer-events-none absolute -inset-x-4 -bottom-6 -top-10 -z-10 bg-[linear-gradient(180deg,transparent,var(--t-bg)_55%)] lg:-bottom-8" />
        <BalanceBanner />
        {needsAccount ? (
          <LinkButton to="/start" variant="metal" size="lg" className="w-full">
            Get started with an invite code
            <ArrowRight className="size-[18px]" aria-hidden />
          </LinkButton>
        ) : (
          <Composer
            value={draft}
            onChange={setDraft}
            onSubmit={submit}
            subject={subject}
            onSubject={setSubject}
            models={models}
            model={model}
            onModel={setModel}
            formatPrice={(u) => (config ? php(u, config.phpPerUsd) : `$${u}`)}
            priceLabel={priceLabel}
            disabled={!ready}
            busy={pending}
            placeholder={placeholder}
          />
        )}
        <p className="mt-2 hidden text-center text-[11.5px] text-fg-4 lg:block">
          The tutor explains; you do the learning. Answers can be wrong, so check the steps.
        </p>
      </div>
    </Page>
  );
}
