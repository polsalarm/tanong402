import { ArrowUpRight, Check, CircleSlash, CreditCard, Gift, Loader2, ShieldCheck, Sparkles, Users } from "lucide-react";
import { LogoMark } from "../../components/Logo";

/* ── How it works: one drawn scene per step ─────────────────────────── */

export function InviteScene({ allowancePhp }: { allowancePhp: string }) {
  return (
    <div className="relative grid gap-3">
      <div className="glass-float rounded-2xl p-4">
        <p className="eyebrow !text-[10px]">Invite code</p>
        <div className="mt-2.5 flex gap-1 sm:gap-1.5">
          {"FEU7Q2K".split("").map((ch, i) => (
            <span
              key={i}
              className={`grid h-10 w-[30px] place-items-center rounded-lg font-mono text-[16px] font-semibold text-fg shadow-[inset_0_0_0_1px_var(--t-line-strong)] sm:h-11 sm:w-9 sm:text-[18px] ${i === 3 ? "ml-1.5 sm:ml-2" : ""}`}
            >
              {ch}
            </span>
          ))}
        </div>
      </div>
      <div className="glass-float ml-auto inline-flex items-center gap-2.5 rounded-2xl py-2.5 pl-2.5 pr-4">
        <span className="grid size-8 place-items-center rounded-full bg-[color-mix(in_srgb,var(--t-success)_16%,transparent)] text-success">
          <Gift className="size-4" aria-hidden />
        </span>
        <span className="text-[13px] text-fg-2">
          Weekly allowance <span className="tabular font-semibold text-success">+{allowancePhp}</span>
        </span>
      </div>
    </div>
  );
}

export function AskScene({ pricePhp }: { pricePhp: string }) {
  return (
    <div className="relative grid gap-3">
      <div className="ml-auto max-w-[85%] rounded-[18px] rounded-br-md bg-[color-mix(in_srgb,var(--t-fg)_10%,transparent)] px-4 py-2.5 text-[14px] text-fg shadow-[inset_0_0_0_1px_var(--t-line)]">
        Ipaliwanag ang osmosis, step by step
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="glass inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12.5px] text-fg-2">
          <Check className="size-3.5 text-success" aria-hidden /> Paying <span className="tabular text-fg">{pricePhp}</span>
        </span>
        <span className="glass inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12.5px] text-fg">
          <Loader2 className="size-3.5 animate-spin" aria-hidden /> Thinking
        </span>
      </div>
      <div className="glass-float rounded-2xl p-4">
        <div className="flex items-center gap-2">
          <LogoMark size={20} />
          <span className="skeleton-line h-2.5 w-24 rounded-full" />
        </div>
        <span className="skeleton-line mt-3 block h-2.5 w-full rounded-full" />
        <span className="skeleton-line mt-2 block h-2.5 w-4/5 rounded-full" />
        <span className="skeleton-line mt-2 block h-2.5 w-3/5 rounded-full" />
      </div>
    </div>
  );
}

export function ReceiptScene({ pricePhp }: { pricePhp: string }) {
  return (
    <div className="glass-float relative rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <p className="eyebrow !text-[10px]">Receipt</p>
        <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--t-success)_14%,transparent)] px-2 py-0.5 text-[11px] font-medium text-success">
          <Check className="size-3" strokeWidth={3} aria-hidden /> Paid
        </span>
      </div>
      <p className="mt-3 text-[40px] font-semibold leading-none tracking-tight text-fg">
        <span className="tabular">{pricePhp}</span>
      </p>
      <dl className="mt-4 grid gap-2 text-[12.5px]">
        <div className="flex justify-between">
          <dt className="text-fg-3">Settled</dt>
          <dd className="tabular text-fg">4.8 s</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-fg-3">Proof</dt>
          <dd className="inline-flex items-center gap-1 font-mono text-fg">
            a658…8651 <ArrowUpRight className="size-3" aria-hidden />
          </dd>
        </div>
      </dl>
      <div className="mt-4 h-px w-full bg-[repeating-linear-gradient(90deg,var(--t-line-strong)_0_6px,transparent_6px_11px)]" />
      <p className="mt-3 text-[11.5px] text-fg-3">Not charged if the tutor fails.</p>
    </div>
  );
}

/* ── Why tiles: tiny visuals ─────────────────────────────────────────── */

export function NoCardVisual() {
  return (
    <div className="relative grid h-full place-items-center">
      <div className="relative">
        <CreditCard className="size-16 text-fg-4" strokeWidth={1.2} aria-hidden />
        <CircleSlash className="absolute -right-3 -top-3 size-8 text-danger" strokeWidth={1.6} aria-hidden />
      </div>
      <div className="absolute bottom-3 flex gap-1.5">
        {["₱0.29", "₱0.29", "₱0.29"].map((t, i) => (
          <span key={i} className="metal-fill rounded-full px-2 py-0.5 tabular text-[11px] font-semibold" style={{ opacity: 1 - i * 0.25 }}>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

export function TaglishVisual() {
  return (
    <div className="grid h-full content-center gap-2 px-2">
      <span className="ml-auto rounded-2xl rounded-br-md bg-[color-mix(in_srgb,var(--t-fg)_10%,transparent)] px-3 py-1.5 text-[12.5px] text-fg">
        Paano i-solve to?
      </span>
      <span className="glass max-w-[85%] rounded-2xl rounded-bl-md px-3 py-1.5 text-[12.5px] text-fg-2">
        Sige! Step 1, i-factor natin…
      </span>
    </div>
  );
}

export function ModelsVisual() {
  const rows = [
    { l: "Auto", pro: false, on: true },
    { l: "Gemini Flash", pro: false, on: false },
    { l: "GPT-5.4", pro: true, on: false },
  ];
  return (
    <div className="glass-float mx-auto grid w-[86%] gap-1 rounded-xl p-1.5">
      {rows.map((r) => (
        <span
          key={r.l}
          className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12px] ${r.on ? "bg-[color-mix(in_srgb,var(--t-fg)_8%,transparent)] text-fg" : "text-fg-2"}`}
        >
          <Sparkles className="size-3" aria-hidden />
          {r.l}
          {r.pro && <span className="metal-fill rounded-full px-1.5 text-[9px] font-semibold">PRO</span>}
          {r.on && <Check className="ml-auto size-3.5" aria-hidden />}
        </span>
      ))}
    </div>
  );
}

export function SafeVisual() {
  return (
    <div className="grid h-full place-items-center">
      <div className="glass-float w-[86%] rounded-xl p-3">
        <p className="text-[12px] font-medium text-fg">Tutor is busy</p>
        <p className="mt-1.5 inline-flex items-center gap-1.5 text-[12px] font-medium text-success">
          <ShieldCheck className="size-3.5" aria-hidden /> You were not charged
        </p>
      </div>
    </div>
  );
}

export function PoolVisual({ allowancePhp }: { allowancePhp: string }) {
  return (
    <div className="grid h-full content-center gap-3 px-3">
      <div className="flex items-center gap-2 text-[12px] text-fg-2">
        <Users className="size-3.5" aria-hidden /> Scholarship Pool
        <span className="ml-auto tabular font-semibold text-fg">{allowancePhp}/wk</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--t-fg)_8%,transparent)]">
        <div className="metal-fill h-full w-[68%] rounded-full" />
      </div>
      <div className="flex -space-x-2">
        {["FEU", "UP", "AL", "+9"].map((s) => (
          <span key={s} className="grid size-7 place-items-center rounded-full bg-[var(--t-surface-2)] text-[9px] font-semibold text-fg-2 shadow-[0_0_0_2px_var(--t-bg)]">
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}
