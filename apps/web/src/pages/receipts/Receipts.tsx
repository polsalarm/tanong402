import type { Receipt as ApiReceipt, Subject } from "@tanong/shared";
import { ArrowRight, Check, MessageCircle, RefreshCw, Search, X } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Page, PageHeader, stagger } from "../../components/Page";
import { openReceipt, subjectLabel, type ReceiptView } from "../../components/Receipt";
import { Button, Card, LinkButton } from "../../components/ui";
import { useConfig } from "../../contexts/ConfigContext";
import { useWallet } from "../../contexts/WalletContext";
import { useActivity } from "../../lib/activity";
import { api, errorMessage, isApiError } from "../../lib/api";
import { formatClock, formatDayLabel, php } from "../../lib/format";
import { SUBJECT_ICON, SUBJECT_ORDER, subjectName } from "../ask/subjects";

interface Item {
  id: string;
  question: string | null;
  preview: string | null;
  subject: string | null;
  priceUsdc: string;
  txHash: string | null;
  network: string;
  status: ApiReceipt["status"];
  latencyMs: number | null;
  at: string;
  server: boolean;
}

const fromApi = (r: ApiReceipt): Item => ({
  id: r.id,
  question: r.question,
  preview: r.answerPreview,
  subject: r.subject,
  priceUsdc: r.priceUsdc,
  txHash: r.txHash,
  network: r.network,
  status: r.status,
  latencyMs: r.latencyMs,
  at: r.createdAt,
  server: true,
});

export default function Receipts() {
  const wallet = useWallet();
  const { config, phpPerUsd } = useConfig();
  const local = useActivity();
  const [items, setItems] = useState<Item[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [mode, setMode] = useState<"loading" | "server" | "local" | "error">("loading");
  const [more, setMore] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState<Subject | null>(null);
  const loadedFor = useRef<string | null>(null);

  const load = useCallback(
    async (after: string | null) => {
      try {
        if (after) setMore(true);
        else setMode("loading");
        const token = await wallet.session();
        const page = await api.receipts(token, after);
        setItems((prev) => (after ? [...prev, ...page.items.map(fromApi)] : page.items.map(fromApi)));
        setCursor(page.nextCursor);
        setMode("server");
        setError(null);
      } catch (err) {
        if (isApiError(err) && err.code === "SESSION_UNSUPPORTED") setMode("local");
        else {
          setError(err);
          if (!after) setMode("error");
        }
      } finally {
        setMore(false);
      }
    },
    [wallet],
  );

  // Sign-in needs the network from /config; wait for both before the first load.
  useEffect(() => {
    if (!config || wallet.status !== "ready" || !wallet.address) return;
    if (loadedFor.current === wallet.address) return;
    loadedFor.current = wallet.address;
    void load(null);
  }, [config, wallet.status, wallet.address, load]);

  const source: Item[] = useMemo(() => {
    if (mode !== "local") return items;
    return local
      .filter((a) => a.kind === "question")
      .map((a) => ({
        id: a.id,
        question: a.title,
        preview: null,
        subject: a.subject ?? null,
        priceUsdc: a.amountUsdc,
        txHash: a.txHash,
        network: a.network,
        status: "settled" as const,
        latencyMs: null,
        at: a.at,
        server: false,
      }));
  }, [mode, items, local]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return source.filter(
      (i) => (!subject || i.subject === subject) && (!q || (i.question ?? "").toLowerCase().includes(q)),
    );
  }, [source, query, subject]);

  const groups = useMemo(() => {
    const out: { day: string; items: Item[] }[] = [];
    for (const i of filtered) {
      const day = formatDayLabel(i.at);
      const last = out[out.length - 1];
      if (last?.day === day) last.items.push(i);
      else out.push({ day, items: [i] });
    }
    return out;
  }, [filtered]);

  const open = (i: Item) => {
    const view: ReceiptView = {
      id: i.id,
      kind: "question",
      amountUsdc: i.priceUsdc,
      at: i.at,
      title: i.question,
      preview: i.preview,
      subject: i.subject,
      txHash: i.txHash,
      network: i.network,
      status: i.status,
      latencyMs: i.latencyMs,
      demo: Number(i.priceUsdc) === 0,
      onDeleteText:
        i.server && i.question
          ? async () => {
              const token = await wallet.session();
              await api.deleteReceipt(token, i.id);
              setItems((prev) => prev.map((x) => (x.id === i.id ? { ...x, question: null, preview: null } : x)));
            }
          : undefined,
    };
    openReceipt(view);
  };

  if (wallet.status === "none") {
    return (
      <Page className="mx-auto max-w-[560px] pt-8">
        <PageHeader eyebrow="Receipts" title={<>Wala pang <span className="em-metal">tanong.</span></>} description="Set up your account and every answer you get will have a receipt here." />
        <LinkButton to="/start" variant="metal" size="lg" className="mt-8">
          I have an invite code <ArrowRight className="size-[18px]" aria-hidden />
        </LinkButton>
      </Page>
    );
  }

  const total = source.reduce((s, i) => s + (i.status === "settle_failed" ? 0 : Number(i.priceUsdc)), 0);

  return (
    <Page className="mx-auto max-w-[760px]">
      <PageHeader
        eyebrow="Receipts"
        title={<>Every answer, <span className="em-metal">accounted for.</span></>}
        description={
          source.length > 0 ? (
            <>
              <span className="tabular font-medium text-fg">{source.length}</span> receipts ·{" "}
              <span className="tabular font-medium text-fg">{php(total, phpPerUsd)}</span> spent
              {mode === "server" && cursor ? " so far" : ""}
            </>
          ) : undefined
        }
      />

      {mode === "local" && (
        <p className="mt-5 rounded-2xl px-4 py-3 text-[13.5px] leading-relaxed text-fg-2 shadow-[inset_0_0_0_1px_var(--t-line)]">
          Showing receipts saved on this device. Full history sync works with the built-in account for now.
        </p>
      )}

      <div className="mt-7 grid grid-cols-1 gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-fg-3" aria-hidden />
          <label htmlFor="receipt-search" className="sr-only">
            Search receipts
          </label>
          <input
            id="receipt-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your questions"
            className="glass h-13 w-full rounded-full pl-11 pr-11 text-[16px] text-fg outline-none placeholder:text-fg-3 focus:shadow-[inset_0_0_0_1px_var(--t-accent),0_0_0_4px_color-mix(in_srgb,var(--t-accent)_14%,transparent)]"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-fg-3 hover:text-fg"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Filter by subject">
          {[null, ...SUBJECT_ORDER].map((s) => {
            const active = s === subject;
            const Icon = s ? SUBJECT_ICON[s] : null;
            return (
              <button
                key={s ?? "all"}
                type="button"
                aria-pressed={active}
                onClick={() => setSubject(s)}
                className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13.5px] transition-colors duration-200 ${active ? "metal-fill" : "text-fg-2 shadow-[inset_0_0_0_1px_var(--t-line-strong)] hover:text-fg"}`}
              >
                {Icon && <Icon className="size-3.5" aria-hidden />}
                {s ? subjectName(s) : "All"}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6">
        {mode === "loading" || wallet.status === "loading" ? (
          <Card className="grid grid-cols-1 gap-5 p-6">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="skeleton-line size-10 shrink-0 rounded-full" />
                <div className="grid grid-cols-1 flex-1 gap-2">
                  <div className="skeleton-line h-3 w-3/4" />
                  <div className="skeleton-line h-2.5 w-1/3" />
                </div>
              </div>
            ))}
          </Card>
        ) : mode === "error" ? (
          <Card className="p-6 text-center">
            <p className="text-[15px] text-fg">Couldn't load your receipts.</p>
            <p className="mt-1 text-[14px] text-fg-3">{errorMessage(error)}</p>
            <Button variant="glass" size="sm" className="mt-4" onClick={() => void load(null)}>
              <RefreshCw className="size-3.5" aria-hidden /> Try again
            </Button>
          </Card>
        ) : source.length === 0 ? (
          <Card className="px-6 py-14 text-center">
            <p className="font-display text-[34px] leading-tight text-fg">Wala pang tanong.</p>
            <p className="mt-2 text-[15px] text-fg-2">Ask your first one! Its receipt will land here.</p>
            <LinkButton to="/ask" variant="metal" className="mt-6">
              Ask a question
            </LinkButton>
          </Card>
        ) : filtered.length === 0 ? (
          <p className="px-2 py-10 text-center text-[15px] text-fg-3">No receipts match that.</p>
        ) : (
          <motion.div variants={stagger.parent} initial="hidden" animate="show" className="grid grid-cols-1 gap-6">
            {groups.map((g) => (
              <section key={g.day}>
                <h2 className="eyebrow mb-2 px-2">{g.day}</h2>
                <Card className="p-2">
                  <ul className="divide-y divide-[var(--t-line)]">
                    {g.items.map((i) => {
                      const Icon = i.subject && i.subject in SUBJECT_ICON ? SUBJECT_ICON[i.subject as Subject] : MessageCircle;
                      const failed = i.status === "settle_failed";
                      const free = Number(i.priceUsdc) === 0;
                      return (
                        <motion.li key={i.id} variants={stagger.child}>
                          <button
                            type="button"
                            onClick={() => open(i)}
                            className="flex min-h-[68px] w-full items-center gap-3.5 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--t-fg)_4%,transparent)]"
                          >
                            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[color-mix(in_srgb,var(--t-fg)_6%,transparent)] text-fg-2 shadow-[inset_0_0_0_1px_var(--t-line)]">
                              <Icon className="size-[17px]" aria-hidden />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className={`block truncate text-[15px] ${i.question ? "text-fg" : "italic text-fg-3"}`}>
                                {i.question ?? "Question text deleted"}
                              </span>
                              <span className="mt-0.5 block text-[12.5px] text-fg-3">
                                {formatClock(i.at)}
                                {i.subject ? ` · ${subjectLabel(i.subject)}` : ""}
                              </span>
                            </span>
                            <span className="flex shrink-0 items-center gap-2">
                              <span className={`tabular font-medium text-[14px] ${failed ? "text-fg-3 line-through" : "text-fg"}`}>
                                {free ? "Free" : php(i.priceUsdc, phpPerUsd)}
                              </span>
                              {!failed && !free && (
                                <span className="grid size-[18px] place-items-center rounded-full bg-[var(--t-success)] text-[var(--t-bg)]">
                                  <Check className="size-2.5" strokeWidth={3.5} aria-hidden />
                                </span>
                              )}
                            </span>
                          </button>
                        </motion.li>
                      );
                    })}
                  </ul>
                </Card>
              </section>
            ))}
            {mode === "server" && cursor && (
              <Button variant="glass" className="mx-auto" loading={more} onClick={() => void load(cursor)}>
                Load older receipts
              </Button>
            )}
          </motion.div>
        )}
      </div>
    </Page>
  );
}
