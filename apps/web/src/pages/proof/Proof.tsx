import { explorerContractUrl, explorerTxUrl, type StatsResponse, type StellarNetwork } from "@tanong/shared";
import { ArrowUpRight, Copy, MessageCircle, RefreshCw } from "lucide-react";
import { motion } from "motion/react";
import { BarChart } from "../../components/BarChart";
import { Page, stagger } from "../../components/Page";
import { subjectLabel } from "../../components/Receipt";
import { Button, Card } from "../../components/ui";
import { useConfig } from "../../contexts/ConfigContext";
import { useToast } from "../../contexts/ToastContext";
import { api, errorMessage } from "../../lib/api";
import { copyText } from "../../lib/clipboard";
import { formatShortDate, php, shortHash, timeAgo } from "../../lib/format";
import { useIsDesktop } from "../../lib/hooks/useMediaQuery";
import { useNow } from "../../lib/hooks/useNow";
import { useResource } from "../../lib/hooks/useResource";
import { SUBJECT_ICON } from "../ask/subjects";

const isStellar = (n: string): n is StellarNetwork => n === "stellar:testnet" || n === "stellar:pubnet";

function Tile({ label, value, sub, delay }: { label: string; value: string; sub?: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay }}
      className="glass relative h-full rounded-[22px] p-5"
    >
      <p className="text-[13px] text-fg-3">{label}</p>
      <p className="mt-3 text-[26px] font-medium leading-none tracking-[-0.02em] text-fg sm:text-[34px]">{value}</p>
      {sub && <p className="tabular mt-2 text-[12px] text-fg-3">{sub}</p>}
    </motion.div>
  );
}

function TileSkeleton() {
  return (
    <div className="glass relative rounded-[22px] p-5">
      <div className="skeleton-line h-2.5 w-20" />
      <div className="skeleton-line mt-4 h-7 w-24" />
    </div>
  );
}

function usdc(v: string | null) {
  if (v === null) return null;
  const n = Number(v);
  return `${n.toLocaleString("en-US", { maximumFractionDigits: n < 10 ? 3 : 2 })} USDC`;
}

export default function Proof() {
  const { phpPerUsd } = useConfig();
  const { toast } = useToast();
  const now = useNow(30_000);
  const desktop = useIsDesktop();
  const stats = useResource<StatsResponse>("stats", (signal) => api.stats(signal), { pollMs: 20_000 });
  const s = stats.data;
  const network = s && isStellar(s.network) ? s.network : null;
  const netLabel = network === "stellar:pubnet" ? "Stellar Mainnet" : "Stellar Testnet";
  const daily = (s?.daily ?? []).map((d) => ({ key: d.day, label: formatShortDate(`${d.day}T12:00:00`), value: d.count }));
  const thirty = daily.reduce((a, d) => a + d.value, 0);

  return (
    <Page className="mx-auto max-w-6xl px-5 pb-8 pt-6 sm:px-8 sm:pt-12">
      <header className="max-w-3xl">
        <p className="eyebrow inline-flex items-center gap-2.5">
          <span className="live-dot" aria-hidden />
          Proof · {s ? netLabel : "live"}
        </p>
        <h1 className="mt-5 font-display text-display-lg tracking-[-0.025em] text-fg">
          Every paid question, <span className="em-metal">on the record.</span>
        </h1>
        <p className="mt-4 max-w-2xl text-[16.5px] leading-relaxed text-fg-2">
          Tanong402 is paid per question with x402 on Stellar. These numbers come straight from our database and the
          network, and every payment below links to its public transaction.
        </p>
      </header>

      {stats.error != null && !s ? (
        <Card className="mt-10 p-8 text-center">
          <p className="text-[16px] text-fg">The live numbers didn't load.</p>
          <p className="mt-1 text-[14px] text-fg-3">{errorMessage(stats.error)}</p>
          <Button variant="glass" size="sm" className="mt-5" onClick={stats.reload}>
            <RefreshCw className="size-3.5" aria-hidden /> Try again
          </Button>
        </Card>
      ) : (
        <>
          <section aria-label="Totals" className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
            {s ? (
              <>
                <Tile label="Students" value={s.students.toLocaleString("en-PH")} delay={0.05} />
                <Tile label="Paid questions" value={s.paidQuestions.toLocaleString("en-PH")} delay={0.1} />
                <Tile label="Total paid" value={php(s.totalPaidUsdc, phpPerUsd)} sub={usdc(s.totalPaidUsdc) ?? undefined} delay={0.15} />
                <Tile
                  label="Scholarship Pool"
                  value={s.poolBalanceUsdc !== null ? php(s.poolBalanceUsdc, phpPerUsd) : "—"}
                  sub={usdc(s.poolBalanceUsdc) ?? "not configured"}
                  delay={0.2}
                />
                <div className="col-span-2 lg:col-span-1">
                  <Tile label="Sponsors" value={s.sponsors.toLocaleString("en-PH")} delay={0.25} />
                </div>
              </>
            ) : (
              Array.from({ length: 5 }, (_, i) => (
                <div key={i} className={i === 4 ? "col-span-2 lg:col-span-1" : ""}>
                  <TileSkeleton />
                </div>
              ))
            )}
          </section>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
            <Card className="p-5 sm:p-7">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-[16px] font-medium text-fg">Paid questions per day</h2>
                  <p className="mt-1 text-[13.5px] text-fg-3">Last 30 days · today in blue</p>
                </div>
                {s && (
                  <p className="text-[13.5px] text-fg-2">
                    <span className="tabular font-medium text-fg">{thirty.toLocaleString("en-PH")}</span> in 30 days
                  </p>
                )}
              </div>
              <div className="mt-6">
                {s ? (
                  <BarChart data={daily} height={desktop ? 340 : 220} title="Paid questions per day, last 30 days" />
                ) : (
                  <div className="flex h-[220px] items-end gap-1.5 pl-8 lg:h-[340px]">
                    {Array.from({ length: 30 }, (_, i) => (
                      <div key={i} className="skeleton-line flex-1 rounded-t-md rounded-b-none" style={{ height: `${25 + ((i * 37) % 60)}%` }} />
                    ))}
                  </div>
                )}
              </div>
            </Card>

            <Card className="flex flex-col p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-[16px] font-medium text-fg">Latest settled payments</h2>
                <span className="eyebrow !text-[10px]">Live</span>
              </div>
              <motion.ul variants={stagger.parent} initial="hidden" animate={s ? "show" : "hidden"} className="mt-3 max-h-[440px] divide-y divide-[var(--t-line)] overflow-y-auto pr-1">
                {(s?.latest ?? []).slice(0, 20).map((p) => {
                  const Icon = p.subject && p.subject in SUBJECT_ICON ? SUBJECT_ICON[p.subject as keyof typeof SUBJECT_ICON] : MessageCircle;
                  return (
                    <motion.li key={p.txHash} variants={stagger.child} className="flex min-h-14 items-center gap-3 py-2">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[color-mix(in_srgb,var(--t-fg)_6%,transparent)] text-fg-2 shadow-[inset_0_0_0_1px_var(--t-line)]">
                        <Icon className="size-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14px] text-fg">
                          {p.subject ? subjectLabel(p.subject) : "Question"}
                          <span className="text-fg-3"> · {timeAgo(p.createdAt, now)}</span>
                        </span>
                        {network ? (
                          <a
                            href={explorerTxUrl(network, p.txHash)}
                            target="_blank"
                            rel="noreferrer"
                            className="tabular inline-flex items-center gap-1 font-mono text-[12px] text-fg-3 transition-colors hover:text-accent"
                          >
                            {shortHash(p.txHash, 8, 6)}
                            <ArrowUpRight className="size-3" aria-hidden />
                          </a>
                        ) : (
                          <span className="tabular font-mono text-[12px] text-fg-3">{shortHash(p.txHash, 8, 6)}</span>
                        )}
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="tabular block font-medium text-[13.5px] text-fg">{php(p.priceUsdc, phpPerUsd)}</span>
                        <span className="tabular block text-[11px] text-fg-3">{p.priceUsdc} USDC</span>
                      </span>
                    </motion.li>
                  );
                })}
                {s && s.latest.length === 0 && <li className="py-8 text-center text-[14px] text-fg-3">No settled payments yet.</li>}
                {!s &&
                  Array.from({ length: 6 }, (_, i) => (
                    <li key={i} className="flex items-center gap-3 py-3">
                      <div className="skeleton-line size-9 rounded-full" />
                      <div className="grid grid-cols-1 flex-1 gap-2">
                        <div className="skeleton-line h-2.5 w-24" />
                        <div className="skeleton-line h-2.5 w-36" />
                      </div>
                    </li>
                  ))}
              </motion.ul>
            </Card>
          </div>

          {s?.poolContractId && network && (
            <Card className="mt-4 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div className="min-w-0">
                <h2 className="text-[16px] font-medium text-fg">Scholarship Pool contract</h2>
                <p className="mt-1 text-[13.5px] leading-relaxed text-fg-3">
                  A Soroban contract on {netLabel}: sponsors fund it, enrolled students claim a capped weekly allowance.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await copyText(s.poolContractId!);
                    toast({ title: ok ? "Contract ID copied" : "Couldn't copy", tone: ok ? "success" : "error" });
                  }}
                  className="tabular inline-flex h-10 items-center gap-2 rounded-full px-4 font-medium text-[12.5px] text-fg-2 shadow-[inset_0_0_0_1px_var(--t-line-strong)] hover:text-fg"
                >
                  {shortHash(s.poolContractId, 6, 6)}
                  <Copy className="size-3.5" aria-hidden />
                </button>
                <a
                  href={explorerContractUrl(network, s.poolContractId)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[13.5px] font-medium text-fg shadow-[inset_0_0_0_1px_var(--t-line-strong)] hover:bg-[color-mix(in_srgb,var(--t-fg)_5%,transparent)]"
                >
                  Stellar Expert <ArrowUpRight className="size-3.5" aria-hidden />
                </a>
              </div>
            </Card>
          )}

          <p className="mt-8 max-w-3xl text-[13.5px] leading-relaxed text-fg-3">
            Honest footnote: pilot credits are funded by sponsors through the Scholarship Pool, and a peso top-up is coming
            soon. Peso amounts use a display rate of ₱{phpPerUsd} per US dollar.
            {network !== "stellar:pubnet" && " This is the test network, so the USDC here is testnet USDC with no cash value."}
          </p>
        </>
      )}
    </Page>
  );
}
