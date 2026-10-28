import type { CSSProperties } from "react";

/**
 * Midnight Silver surfaces: a drifting silk base, satin folds, an inset shadow vignette,
 * wandering pools of light and ink (each on its own path and timing), film grain and a slow
 * shine. All decoration, all hidden from assistive tech. Motion lives in landing.css and
 * stops under reduced motion.
 */

/** Seeded PRNG: the same layout on every load, but irregular to the eye. */
function rng(seed: number) {
  let t = seed >>> 0 || 1;
  return () => {
    t ^= t << 13;
    t ^= t >>> 17;
    t ^= t << 5;
    return ((t >>> 0) % 100000) / 100000;
  };
}

/** Light first, then a couple of ink pools that keep the surface from going flat. */
const GLOW_TONES = [
  "143 179 255", // moonlit blue
  "107 127 208", // indigo
  "169 155 255", // soft violet
  "233 236 241", // pearl
  "120 200 255", // cold cyan
];
const INK = "2 4 10";

export interface GlowBlob {
  x: number;
  y: number;
  size: number;
  rgb: string;
  alpha: number;
  dx: number;
  dy: number;
  dur: number;
  delay: number;
  ink: boolean;
}

export function glowBlobs(seed: number, count: number, inkCount = 2): GlowBlob[] {
  const r = rng(seed);
  return Array.from({ length: count + inkCount }, (_, i) => {
    const ink = i >= count;
    return {
      x: r() * 110 - 5,
      y: r() * 110 - 5,
      size: ink ? 40 + r() * 30 : 18 + r() * 34,
      rgb: ink ? INK : GLOW_TONES[Math.floor(r() * GLOW_TONES.length)]!,
      alpha: ink ? 0.55 + r() * 0.25 : 0.12 + r() * 0.26,
      dx: (r() - 0.5) * 34,
      dy: (r() - 0.5) * 30,
      dur: 14 + r() * 22,
      delay: -r() * 30,
      ink,
    };
  });
}

/**
 * Silk glow: soft pools of light that wander on their own paths and timings, so the surface
 * never repeats in sync. Sizes are in % of the box; drift in % of each blob.
 */
export function SilkGlow({ seed = 1, count = 7, ink = 2, blur = 60, className = "" }: { seed?: number; count?: number; ink?: number; blur?: number; className?: string }) {
  const blobs = glowBlobs(seed, count, ink);
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {blobs.map((b, i) => (
        <span
          key={i}
          className="lp-blob absolute rounded-full"
          style={
            {
              left: `${b.x}%`,
              top: `${b.y}%`,
              width: `${b.size}%`,
              aspectRatio: "1 / 1",
              translate: "-50% -50%",
              background: `radial-gradient(circle, rgb(${b.rgb} / ${b.alpha.toFixed(2)}) 0%, rgb(${b.rgb} / 0) 68%)`,
              filter: `blur(${b.ink ? blur * 0.6 : blur}px)`,
              "--dx": `${b.dx.toFixed(1)}%`,
              "--dy": `${b.dy.toFixed(1)}%`,
              animationDuration: `${b.dur.toFixed(1)}s`,
              animationDelay: `${b.delay.toFixed(1)}s`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

/* ── Constellations ─────────────────────────────────────────────────── */

const CW = 1000;
const CH = 600;

/** The hero's hidden one: stars along the curve of a question mark, plus its dot. */
const QUESTION_STARS: [number, number][] = [
  [0, 18], [6, 4], [20, -2], [33, 4], [38, 18], [32, 32], [21, 41], [18, 55], [18.5, 74],
];

export interface Constellation {
  stars: { x: number; y: number; r: number; tw: number; delay: number }[];
  lines: string;
}

/** Random clusters: stars scattered round a centre, joined nearest-first into a loose chain with one branch. */
export function constellations(seed: number, clusters: number, region: { x0: number; x1: number; y0: number; y1: number }): Constellation[] {
  const r = rng(seed);
  return Array.from({ length: clusters }, () => {
    const cx = region.x0 + r() * (region.x1 - region.x0);
    const cy = region.y0 + r() * (region.y1 - region.y0);
    const spread = 60 + r() * 90;
    const n = 5 + Math.floor(r() * 3);
    const pts = Array.from({ length: n }, () => ({ x: cx + (r() - 0.5) * spread * 2, y: cy + (r() - 0.5) * spread * 1.4 }));
    // Nearest-neighbour chain from the leftmost star.
    const order = [pts.reduce((m, p, i) => (p.x < pts[m]!.x ? i : m), 0)];
    while (order.length < n) {
      const last = pts[order[order.length - 1]!]!;
      let best = -1;
      let bd = Infinity;
      pts.forEach((p, i) => {
        if (order.includes(i)) return;
        const d = (p.x - last.x) ** 2 + (p.y - last.y) ** 2;
        if (d < bd) {
          bd = d;
          best = i;
        }
      });
      order.push(best);
    }
    let lines = order.map((i, k) => `${k ? "L" : "M"}${pts[i]!.x.toFixed(1)} ${pts[i]!.y.toFixed(1)}`).join("");
    const a = pts[order[1]!]!;
    const b = pts[order[n - 1]!]!;
    if (r() < 0.6) lines += `M${a.x.toFixed(1)} ${a.y.toFixed(1)}L${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
    return {
      stars: pts.map(() => ({ x: 0, y: 0, r: 1.3 + r() * 1.6, tw: 2.5 + r() * 4, delay: -r() * 6 })).map((st, i) => ({ ...st, ...pts[i]! })),
      lines,
    };
  });
}

/**
 * Star dust, a few constellations whose lines draw in, random twinkles and an occasional
 * shooting star. `question` hides a question-mark constellation at that spot (0–1000 × 0–600).
 */
export function Constellations({
  seed = 3,
  clusters = 3,
  dust = 70,
  region = { x0: 80, x1: 920, y0: 60, y1: 540 },
  question,
  color = "rgb(214 224 245 / 0.32)",
  star = "#f5f7fa",
  halo = "rgb(143 179 255 / 0.14)",
  className = "",
}: {
  seed?: number;
  clusters?: number;
  dust?: number;
  region?: { x0: number; x1: number; y0: number; y1: number };
  question?: { x: number; y: number; scale?: number };
  color?: string;
  /** Star and halo colours; darken both on light surfaces. */
  star?: string;
  halo?: string;
  className?: string;
}) {
  const r = rng(seed * 7 + 1);
  const groups = constellations(seed, clusters, region);
  const motes = Array.from({ length: dust }, () => ({ x: r() * CW, y: r() * CH, s: r() < 0.15 ? 1.4 : 0.8, o: 0.15 + r() * 0.4, tw: r() < 0.35, d: 3 + r() * 5, delay: -r() * 8 }));
  const q = question ? QUESTION_STARS.map(([x, y]) => ({ x: question.x + x * (question.scale ?? 2.2), y: question.y + y * (question.scale ?? 2.2) })) : null;
  const shootY = 60 + r() * 200;
  return (
    <svg aria-hidden viewBox={`0 0 ${CW} ${CH}`} preserveAspectRatio="xMidYMid slice" className={`pointer-events-none absolute inset-0 size-full ${className}`}>
      <g className="lp-sky">
        {motes.map((m, i) => (
          <circle key={i} cx={m.x} cy={m.y} r={m.s} fill={star} opacity={m.o} className={m.tw ? "lp-twinkle" : undefined} style={m.tw ? ({ animationDuration: `${m.d}s`, animationDelay: `${m.delay}s` } as CSSProperties) : undefined} />
        ))}
        {groups.map((g, k) => (
          <g key={k}>
            <path d={g.lines} pathLength={1} className="lp-cline" fill="none" stroke={color} strokeWidth={0.8} vectorEffect="non-scaling-stroke" style={{ animationDelay: `${0.4 + k * 0.5}s` }} />
            {g.stars.map((st, i) => (
              <g key={i}>
                <circle cx={st.x} cy={st.y} r={st.r * 3.2} fill={halo} className="lp-halo" />
                <circle cx={st.x} cy={st.y} r={st.r} fill={star} className="lp-twinkle" style={{ animationDuration: `${st.tw}s`, animationDelay: `${st.delay}s` } as CSSProperties} />
              </g>
            ))}
          </g>
        ))}
        {q && (
          <g>
            <path d={q.slice(0, 8).map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join("")} pathLength={1} className="lp-cline" fill="none" stroke={color} strokeWidth={0.9} vectorEffect="non-scaling-stroke" style={{ animationDelay: "1.2s" }} />
            {q.map((p, i) => (
              <g key={i}>
                <circle cx={p.x} cy={p.y} r={i === 8 ? 9 : 6} fill={halo} className="lp-halo" />
                <circle cx={p.x} cy={p.y} r={i === 8 ? 2.6 : 1.8} fill={star} className="lp-twinkle" style={{ animationDuration: `${3 + (i % 4)}s`, animationDelay: `${-i * 0.7}s` } as CSSProperties} />
              </g>
            ))}
          </g>
        )}
      </g>
      <line x1={0} y1={shootY} x2={90} y2={shootY + 34} stroke="url(#lp-shoot)" strokeWidth={1.4} strokeLinecap="round" className="lp-shoot" style={{ animationDelay: `${2 + r() * 6}s` }} />
      <defs>
        <linearGradient id="lp-shoot" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#e9ecf1" stopOpacity="0" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.9" />
        </linearGradient>
      </defs>
    </svg>
  );
}

const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

export function Grain({ opacity = 0.07 }: { opacity?: number }) {
  return <span aria-hidden className="pointer-events-none absolute inset-0 mix-blend-overlay" style={{ backgroundImage: GRAIN, opacity }} />;
}

/** A soft band of light that crosses the surface every few seconds. */
export function Shine({ color = "rgb(233 236 241 / 0.16)", slow = false, delay = 0 }: { color?: string; slow?: boolean; delay?: number }) {
  return (
    <span
      aria-hidden
      className={`lp-shine ${slow ? "lp-shine-slow" : ""} pointer-events-none absolute inset-y-0 left-0 w-[60%]`}
      style={{ "--lp-shine": color, "--lp-shine-delay": `${delay}s` } as CSSProperties}
    />
  );
}

/** Silk bases: radial pools that drift slowly, so the colour shifts the way satin catches light. */
const SILK = {
  /** Hero: ink pools low, blue-silver glow mid-right, pearl highlight top right behind the phone. */
  hero: [
    "radial-gradient(36% 40% at 76% 20%, rgb(233 236 241 / 0.20) 0%, rgb(233 236 241 / 0) 100%)",
    "radial-gradient(46% 52% at 62% 50%, rgb(110 140 220 / 0.30) 0%, rgb(110 140 220 / 0) 100%)",
    "radial-gradient(50% 55% at 6% 94%, rgb(2 4 10 / 0.90) 0%, rgb(2 4 10 / 0) 100%)",
    "radial-gradient(45% 50% at 98% 98%, rgb(2 4 10 / 0.85) 0%, rgb(2 4 10 / 0) 100%)",
    "radial-gradient(40% 45% at 16% 18%, rgb(42 58 107 / 0.55) 0%, rgb(42 58 107 / 0) 100%)",
    "linear-gradient(160deg, #0f1730 0%, #0a0f1f 45%, #05070d 100%)",
  ],
  /** Dark band: almost black, one cold glow. */
  ink: [
    "radial-gradient(40% 50% at 80% 10%, rgb(143 179 255 / 0.16) 0%, rgb(143 179 255 / 0) 100%)",
    "radial-gradient(50% 60% at 0% 100%, rgb(42 58 107 / 0.45) 0%, rgb(42 58 107 / 0) 100%)",
    "linear-gradient(170deg, #070a13 0%, #04060b 100%)",
  ],
  /** Closing section: deep velvet with a pearl bloom behind the card. */
  velvet: [
    "radial-gradient(42% 52% at 74% 50%, rgb(143 179 255 / 0.26) 0%, rgb(143 179 255 / 0) 100%)",
    "radial-gradient(45% 55% at 10% 10%, rgb(42 58 107 / 0.6) 0%, rgb(42 58 107 / 0) 100%)",
    "radial-gradient(50% 50% at 100% 100%, rgb(2 4 10 / 0.8) 0%, rgb(2 4 10 / 0) 100%)",
    "linear-gradient(155deg, #121a33 0%, #0a0f1f 55%, #04060b 100%)",
  ],
} as const;

/**
 * The full layered surface for a dark section. Put it first inside a `relative overflow-hidden`
 * section; content after it sits on top.
 */
export function Backdrop({ variant = "hero" }: { variant?: keyof typeof SILK }) {
  const hero = variant === "hero";
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <span className="lp-silk absolute -inset-[12%]" style={{ backgroundImage: SILK[variant].join(", ") }} />
      {/* Two faint diagonal folds, like light on satin. */}
      <span
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(118deg, rgb(255 255 255 / 0) 34%, rgb(255 255 255 / 0.06) 46%, rgb(255 255 255 / 0) 56%, rgb(255 255 255 / 0.04) 70%, rgb(255 255 255 / 0) 82%)",
        }}
      />
      {/* Darker at the edges, so the eye goes inward and the surface never reads flat. */}
      <span className="absolute inset-0" style={{ boxShadow: "inset 0 0 240px 60px rgb(1 2 6 / 0.65)" }} />
      <SilkGlow seed={variant === "hero" ? 11 : variant === "ink" ? 29 : 47} count={hero ? 8 : 6} ink={hero ? 3 : 2} />
      <Constellations
        seed={variant === "hero" ? 5 : variant === "ink" ? 17 : 23}
        clusters={hero ? 3 : 3}
        dust={hero ? 90 : 70}
        region={hero ? { x0: 520, x1: 960, y0: 60, y1: 560 } : { x0: 60, x1: 940, y0: 50, y1: 550 }}
        question={hero ? { x: 410, y: 60, scale: 2.4 } : undefined}
        className="max-sm:opacity-70 max-sm:[mask-image:linear-gradient(180deg,#000_0%,transparent_20%,transparent_64%,#000_86%)]"
      />
      <Grain opacity={0.08} />
      {hero && <Shine slow color="rgb(233 236 241 / 0.10)" />}
    </div>
  );
}

/** Four-point sparkles that twinkle in turn. */
export function Sparkles({ spots }: { spots: { x: string; y: string; size: number; delay: number }[] }) {
  return (
    <>
      {spots.map((sp, k) => (
        <svg
          key={k}
          aria-hidden
          viewBox="0 0 24 24"
          className="lp-sparkle pointer-events-none absolute text-[#e9ecf1]"
          style={{ left: sp.x, top: sp.y, width: sp.size, height: sp.size, animationDelay: `${sp.delay}s` }}
        >
          <path fill="currentColor" d="M12 0c.7 6.2 5.8 11.3 12 12-6.2.7-11.3 5.8-12 12-.7-6.2-5.8-11.3-12-12C6.2 11.3 11.3.7 12 0Z" />
        </svg>
      ))}
    </>
  );
}
