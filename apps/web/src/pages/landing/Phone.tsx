import { ArrowUp, Check, Sparkles } from "lucide-react";
import { LogoMark } from "../../components/Logo";

/** A still frame of the real Ask screen inside a brushed-silver phone. Drawn by hand, no data. */
export function Phone({ pricePhp, className = "" }: { pricePhp: string; className?: string }) {
  return (
    <div className={`lp-phone w-[300px] sm:w-[320px] ${className}`}>
      <div className="lp-screen h-[620px] sm:h-[660px]">
        <span className="lp-island" aria-hidden />
        {/* status bar */}
        <div className="flex items-center justify-between px-7 pt-3.5 text-[12px] font-semibold text-fg">
          <span className="tabular">9:41</span>
          <span className="flex items-center gap-1" aria-hidden>
            <span className="h-2.5 w-4 rounded-[3px] border border-fg/70" />
          </span>
        </div>

        {/* app header */}
        <div className="mt-5 flex items-center justify-between px-4">
          <span className="flex items-center gap-2">
            <LogoMark size={26} />
            <span className="text-[15px] font-semibold tracking-tight text-fg">Tanong</span>
          </span>
          <span className="glass rounded-full px-2.5 py-1 text-[11px] leading-tight text-fg-2">
            <span className="tabular font-semibold text-fg">₱14.50</span> · 50 left
          </span>
        </div>

        <div className="mt-4 grid gap-3 px-4">
          {/* student bubble */}
          <div className="ml-auto max-w-[82%] rounded-[18px] rounded-br-md bg-[color-mix(in_srgb,var(--t-fg)_10%,transparent)] px-3.5 py-2 text-[13px] text-fg shadow-[inset_0_0_0_1px_var(--t-line)]">
            Solve <span className="tabular font-medium">2x² − 8x + 6 = 0</span>
          </div>

          {/* tutor answer */}
          <div className="glass rounded-[20px] p-3.5">
            <div className="flex items-center gap-2">
              <LogoMark size={18} />
              <span className="text-[11.5px] font-medium text-fg">Tutor</span>
              <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--t-accent)_14%,transparent)] px-2 py-0.5 text-[10px] font-medium text-accent">
                <Sparkles className="size-2.5" aria-hidden /> GPT-5
              </span>
            </div>
            <ol className="mt-3 grid gap-2.5">
              {["2(x² − 4x + 3) = 0", "2(x − 1)(x − 3) = 0", "x − 1 = 0  or  x − 3 = 0"].map((m, i) => (
                <li key={m} className="flex items-center gap-2.5">
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[var(--t-surface-2)] tabular text-[10px] font-semibold text-fg shadow-[inset_0_0_0_1px_var(--t-line-strong)]">
                    {i + 1}
                  </span>
                  <span className="tabular text-[13.5px] font-medium text-fg">{m}</span>
                </li>
              ))}
            </ol>
            <div className="hairline-metal relative mt-3 rounded-xl bg-[color-mix(in_srgb,var(--t-fg)_5%,transparent)] px-3 py-2">
              <p className="eyebrow !text-[9px]">Final answer</p>
              <p className="mt-0.5 text-[19px] font-semibold leading-none tracking-tight text-fg">
                x = 1 <span className="text-[12px] font-normal text-fg-3">or</span> x = 3
              </p>
            </div>
            <span className="mt-3 inline-flex h-7 items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--t-success)_10%,transparent)] pl-1 pr-2.5 text-[11.5px] text-fg-2 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--t-success)_26%,transparent)]">
              <span className="grid size-5 place-items-center rounded-full bg-[var(--t-success)] text-[var(--t-bg)]">
                <Check className="size-3" strokeWidth={3} aria-hidden />
              </span>
              Paid <span className="tabular font-semibold text-fg">{pricePhp}</span> · Receipt
            </span>
          </div>

          {/* typing next question */}
          <div className="ml-auto max-w-[70%] rounded-[18px] rounded-br-md bg-[color-mix(in_srgb,var(--t-fg)_10%,transparent)] px-3.5 py-2 text-[13px] text-fg shadow-[inset_0_0_0_1px_var(--t-line)]">
            Bakit may NullPointer ako?
          </div>
          <div className="flex items-center gap-1.5 pl-1" aria-hidden>
            {[0, 1, 2].map((i) => (
              <span key={i} className="size-1.5 animate-pulse rounded-full bg-fg-3" style={{ animationDelay: `${i * 160}ms` }} />
            ))}
          </div>
        </div>

        {/* composer */}
        <div className="absolute inset-x-3 bottom-4">
          <div className="glass-float flex items-center gap-2 rounded-[22px] p-1.5 pl-4">
            <span className="flex-1 text-[13px] text-fg-3">Ano'ng tanong mo?</span>
            <span className="metal-fill inline-flex h-9 items-center gap-1.5 rounded-full pl-3 pr-1 text-[12.5px] font-medium">
              Ask · <span className="tabular">{pricePhp}</span>
              <span className="grid size-7 place-items-center rounded-full bg-[color-mix(in_srgb,var(--t-on-metal)_92%,transparent)] text-[var(--t-fg)]">
                <ArrowUp className="size-3.5" strokeWidth={2.4} aria-hidden />
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
