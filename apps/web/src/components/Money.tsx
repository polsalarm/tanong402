import { animate, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { phpParts } from "../lib/format";

/** Animates a number towards `value` (tick-up). Skips animation for reduced motion. */
export function useTick(value: number, durationS = 0.9): number {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    if (reduce || from.current === value) {
      from.current = value;
      setShown(value);
      return;
    }
    const controls = animate(from.current, value, {
      duration: durationS,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setShown(v),
    });
    from.current = value;
    return () => controls.stop();
  }, [value, reduce, durationS]);
  return shown;
}

/**
 * The big peso figure: "₱" small and raised, whole pesos in the display serif, cents smaller.
 * Instrument Serif has no ₱ glyph, so the symbol is set in Geist on purpose.
 */
export function BigMoney({
  value,
  className = "",
  metal = true,
  animated = true,
}: {
  value: number;
  className?: string;
  metal?: boolean;
  animated?: boolean;
}) {
  const ticked = useTick(value);
  const parts = phpParts(animated ? ticked : value);
  return (
    <span className={`inline-flex items-start font-display leading-none tracking-[-0.02em] ${className}`} aria-label={`₱${value.toFixed(2)}`}>
      <span aria-hidden className={`mt-[0.12em] mr-[0.06em] font-sans text-[0.42em] font-light ${metal ? "text-fg-2" : ""}`}>
        ₱
      </span>
      <span aria-hidden className={`tabular ${metal ? "text-metal" : ""}`}>
        {parts.whole}
      </span>
      <span aria-hidden className={`mt-[0.1em] ml-[0.04em] text-[0.48em] ${metal ? "text-metal" : ""}`}>
        .{parts.cents}
      </span>
    </span>
  );
}

/** Inline peso amount, tabular digits. */
export function Amount({ value, sign, className = "" }: { value: number; sign?: "+" | "−"; className?: string }) {
  return (
    <span className={`tabular font-medium ${className}`}>
      {sign ?? ""}₱{value.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </span>
  );
}

/**
 * A formatted peso string ("₱15.00", "+₱15.00") for display-serif contexts: the ₱ is set light and
 * raised in Geist (the serif has no ₱), the digits carry the metal gradient.
 */
export function DisplayPeso({ text, className = "", metal = true }: { text: string; className?: string; metal?: boolean }) {
  const m = /^([+−-]?)₱(.*)$/.exec(text);
  if (!m) return <span className={className}>{text}</span>;
  return (
    <span className={`inline-flex items-start ${className}`} aria-label={text}>
      <span aria-hidden className={metal ? "text-metal" : ""}>
        {m[1]}
      </span>
      <span aria-hidden className="mr-[0.05em] mt-[0.14em] font-sans text-[0.46em] font-light leading-none text-fg-2">
        ₱
      </span>
      <span aria-hidden className={`tabular ${metal ? "text-metal" : ""}`}>
        {m[2]}
      </span>
    </span>
  );
}
