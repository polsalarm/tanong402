import { useId } from "react";
import { cardId, formatMonthYear, questionsLabel } from "../lib/format";
import { BigMoney } from "./Money";
import { Wordmark } from "./Logo";

/** Faint engraved rosette (banknote-style guilloche). */
function Guilloche({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="-160 -160 320 320" aria-hidden className={className} fill="none">
      {Array.from({ length: 24 }, (_, i) => (
        <ellipse
          key={i}
          rx="150"
          ry="54"
          transform={`rotate(${i * 7.5})`}
          stroke="currentColor"
          strokeWidth="0.55"
        />
      ))}
      {Array.from({ length: 6 }, (_, i) => (
        <circle key={`c${i}`} r={30 + i * 22} stroke="currentColor" strokeWidth="0.4" />
      ))}
    </svg>
  );
}

/** Engraved contact plate, the cue that makes a card read as a card. */
function Plate({ className = "" }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg width="42" height="32" viewBox="0 0 42 32" aria-hidden className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id={`${id}-p`} x1="0" y1="0" x2="42" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#F5F7FA" />
          <stop offset="0.45" stopColor="#9AA3B2" />
          <stop offset="0.7" stopColor="#E6E9EE" />
          <stop offset="1" stopColor="#7C8597" />
        </linearGradient>
      </defs>
      <rect x="0.5" y="0.5" width="41" height="31" rx="7" fill={`url(#${id}-p)`} opacity="0.9" />
      <g stroke="#0B0F1A" strokeOpacity="0.35" strokeWidth="0.8" fill="none">
        <path d="M0.5 11h12M0.5 21h12M29.5 11h12M29.5 21h12M12.5 0.5v31M29.5 0.5v31" />
        <rect x="12.5" y="8" width="17" height="16" rx="4" />
      </g>
    </svg>
  );
}

export function MetalCard({
  balancePhp,
  questionsLeft,
  address,
  since,
  loading = false,
  compact = false,
  label = "Balance",
}: {
  balancePhp: number;
  questionsLeft: number;
  address: string | null;
  since: string | null;
  loading?: boolean;
  compact?: boolean;
  label?: string;
}) {
  // Sizes follow the card's own width (container queries), so the same card fits a 320px phone,
  // the landing composition and the wide Wallet column without clipping.
  return (
    <div className="@container w-full">
      <div
        className={`metal-card sheen hairline-metal w-full rounded-[26px] ${compact ? "p-5" : "aspect-[1.586] max-h-[300px] p-5 @sm:p-6 @md:p-7"}`}
      >
        <Guilloche className="pointer-events-none absolute -right-24 -top-28 -z-10 size-[340px] text-fg opacity-[0.07]" />
        <div className="relative flex h-full flex-col">
          <div className="flex items-start justify-between gap-3">
            <Wordmark className={compact ? "text-[18px]" : "text-[19px] @sm:text-[21px]"} />
            <span className="eyebrow !text-[10px] !tracking-[0.22em]">{label}</span>
          </div>

          {!compact && (
            <div className="mt-3 @sm:mt-4">
              <Plate className="h-auto w-9 @sm:w-[42px]" />
            </div>
          )}

          <div className={compact ? "mt-4" : "mt-auto pt-2"}>
            {loading ? (
              <div className="grid grid-cols-1 gap-2.5 py-2">
                <div className="skeleton-line h-9 w-40" />
                <div className="skeleton-line h-3 w-28" />
              </div>
            ) : (
              <>
                <BigMoney value={balancePhp} className={compact ? "text-[40px]" : "text-[44px] @sm:text-[52px] @md:text-[58px]"} />
                <p className="mt-1 text-[14px] text-fg-2 @sm:mt-1.5 @sm:text-[14.5px]">{questionsLabel(questionsLeft)}</p>
              </>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 tabular font-medium text-[11px] tracking-[0.14em] text-fg-3 @sm:mt-4 @sm:text-[11.5px]">
            <span className="tabular">{address ? cardId(address) : "···· ·· ····"}</span>
            {since && <span className="tabular">SINCE {formatMonthYear(since)}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
