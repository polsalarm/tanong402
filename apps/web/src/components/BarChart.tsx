import { motion, useReducedMotion } from "motion/react";
import { useLayoutEffect, useRef, useState } from "react";

export interface BarDatum {
  key: string;
  label: string;
  value: number;
}

function niceMax(v: number): { max: number; step: number } {
  if (v <= 0) return { max: 4, step: 1 };
  const rough = v / 4;
  const pow = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= rough) ?? 10 * pow;
  return { max: Math.ceil(v / step) * step, step };
}

const compact = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K` : String(n));

/** Rounded data-end (4px), square at the baseline. */
function barPath(x: number, y: number, w: number, base: number): string {
  const h = base - y;
  if (h <= 0.5) return "";
  const r = Math.min(4, w / 2, h);
  return `M${x},${base}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${base}Z`;
}

/**
 * Single-series column chart, pure SVG. Bars ≤24px with leftover band as air, hairline solid
 * gridlines, the last bar (today) in the accent, value labels only on today and the peak,
 * a per-bar hover/tap tooltip and an sr-only table for screen readers.
 */
export function BarChart({ data, height = 220, title }: { data: BarDatum[]; height?: number; title: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const reduce = useReducedMotion();

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry?.contentRect.width ?? 0)));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const padL = 34;
  const padR = 4;
  const padT = 26;
  const padB = 26;
  const plotW = Math.max(0, width - padL - padR);
  const plotH = height - padT - padB;
  const base = padT + plotH;
  const peak = Math.max(0, ...data.map((d) => d.value));
  const { max, step } = niceMax(peak);
  const ticks: number[] = [];
  for (let t = 0; t <= max + 1e-9; t += step) ticks.push(t);
  const band = data.length ? plotW / data.length : 0;
  const barW = Math.max(3, Math.min(24, band * 0.62));
  const y = (v: number) => padT + plotH - (v / max) * plotH;
  const last = data.length - 1;
  const peakIdx = data.findIndex((d) => d.value === peak);
  const hovered = hover !== null ? data[hover] : null;

  return (
    <div ref={wrapRef} className="relative w-full select-none" onMouseLeave={() => setHover(null)}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={title} className="block overflow-visible">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={padL} x2={width - padR} y1={y(t)} y2={y(t)} stroke="var(--t-line)" strokeWidth={1} shapeRendering="crispEdges" />
              <text x={padL - 10} y={y(t)} dy="0.32em" textAnchor="end" className="fill-[var(--t-fg-3)] text-[10.5px] tabular">
                {compact(t)}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const x = padL + i * band + (band - barW) / 2;
            const isLast = i === last;
            const dim = hover !== null && hover !== i;
            return (
              <motion.path
                key={d.key}
                d={barPath(x, y(d.value), barW, base)}
                fill={isLast ? "var(--t-accent)" : "url(#bar-silver)"}
                initial={reduce ? false : { scaleY: 0 }}
                animate={{ scaleY: 1, opacity: dim ? 0.45 : 1 }}
                transition={{ scaleY: { duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.15 + i * 0.012 }, opacity: { duration: 0.15 } }}
                style={{ transformOrigin: "50% 100%", transformBox: "fill-box" }}
              />
            );
          })}
          {[peakIdx, last]
            .filter((i, k, arr) => i >= 0 && arr.indexOf(i) === k && hover === null)
            .map((i) => {
              const d = data[i]!;
              return (
                <text
                  key={`v${i}`}
                  x={padL + i * band + band / 2}
                  y={y(d.value) - 8}
                  textAnchor={i === last ? "end" : "middle"}
                  dx={i === last ? band / 2 : 0}
                  className="fill-[var(--t-fg)] font-medium text-[11px] tabular"
                >
                  {d.value.toLocaleString("en-PH")}
                </text>
              );
            })}
          {data.length > 0 && (
            <>
              <text x={padL} y={height - 6} className="fill-[var(--t-fg-3)] text-[10.5px]">
                {data[0]!.label}
              </text>
              <text x={width - padR} y={height - 6} textAnchor="end" className="fill-[var(--t-fg-2)] text-[10.5px]">
                Today
              </text>
            </>
          )}
          {/* Hit targets: the whole column band, bigger than the mark. */}
          {data.map((d, i) => (
            <rect
              key={`h${d.key}`}
              x={padL + i * band}
              y={padT}
              width={band}
              height={plotH}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onPointerDown={() => setHover(i)}
            />
          ))}
          <defs>
            <linearGradient id="bar-silver" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--color-silver-100)" stopOpacity="0.92" />
              <stop offset="1" stopColor="var(--color-silver-400)" stopOpacity="0.62" />
            </linearGradient>
          </defs>
        </svg>
      )}
      {hovered && hover !== null && width > 0 && (
        <div
          className="glass-float pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-xl px-3 py-2 text-[12.5px]"
          style={{
            left: Math.min(Math.max(padL + hover * band + band / 2, 70), width - 70),
            top: y(hovered.value) - 10,
          }}
          role="status"
        >
          <span className="block text-fg-3">{hover === last ? "Today" : hovered.label}</span>
          <span className="block font-medium text-fg">
            <span className="tabular font-medium">{hovered.value.toLocaleString("en-PH")}</span> paid questions
          </span>
        </div>
      )}
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Paid questions</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.key}>
              <td>{d.label}</td>
              <td>{d.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
