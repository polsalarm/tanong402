import { ShieldCheck, type LucideIcon } from "lucide-react";
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import { Mascot, type MascotPose } from "../../components/Mascot";
import { Constellations, Grain, SilkGlow } from "./Patterns";

export interface RailStep {
  n: string;
  icon: LucideIcon;
  title: string;
  line: string;
  check: string;
  scene: ReactNode;
  pose: MascotPose;
  tone: "glass" | "metal" | "ink";
}

/** How far a neighbour sits (share of card width), how far it turns and how much it shrinks. */
const SHIFT = 0.82;
const TURN_DEG = 28;
const SHRINK = 0.12;

/**
 * Each step is its own surface: a base gradient with a glow in one corner, wandering silk light,
 * grain, a glare that follows the cursor and a band of light that keeps crossing.
 * Pearl, then brushed blue-silver, then obsidian: three cards from one wallet.
 */
const LOOK: Record<
  RailStep["tone"],
  { theme: "silver" | "midnight"; bg: string; card: string; glare: string; shine: string; tile: string; check: string; rule: string; soft: string; holo: number; gloss: number }
> = {
  glass: {
    theme: "silver",
    bg: "radial-gradient(120% 90% at 100% 0%, #dfe7fb 0%, rgb(223 231 251 / 0) 55%), linear-gradient(180deg, #ffffff 0%, #eef1f6 100%)",
    card: "shadow-[inset_0_0_0_1px_rgb(10_14_25/0.07),inset_0_1px_0_#ffffff,0_40px_80px_-48px_rgb(20_30_70/0.55)]",
    glare: "rgb(143 179 255 / 0.25)",
    shine: "rgb(255 255 255 / 0.7)",
    tile: "bg-white text-accent shadow-[inset_0_0_0_1px_rgb(47_85_196/0.16),0_8px_20px_-10px_rgb(47_85_196/0.45)]",
    check: "text-accent shadow-[inset_0_0_0_1px_rgb(47_85_196/0.25)]",
    rule: "bg-accent",
    soft: "text-fg-2",
    holo: 0.55,
    gloss: 0.9,
  },
  metal: {
    theme: "midnight",
    bg: "radial-gradient(90% 70% at 88% 6%, rgb(255 255 255 / 0.30) 0%, rgb(255 255 255 / 0) 60%), linear-gradient(150deg, #9fb6ec 0%, #4a64ad 46%, #1b2650 100%)",
    card: "shadow-[inset_0_0_0_1px_rgb(255_255_255/0.18),inset_0_1px_0_rgb(255_255_255/0.5),0_40px_80px_-40px_rgb(27_38_80/0.85)]",
    glare: "rgb(255 255 255 / 0.22)",
    shine: "rgb(255 255 255 / 0.22)",
    tile: "bg-white/15 text-white shadow-[inset_0_0_0_1px_rgb(255_255_255/0.35)]",
    check: "text-white shadow-[inset_0_0_0_1px_rgb(255_255_255/0.4)]",
    rule: "bg-white",
    soft: "text-white/85",
    holo: 0.6,
    gloss: 0.28,
  },
  ink: {
    theme: "midnight",
    bg: "radial-gradient(80% 65% at 92% 0%, rgb(143 179 255 / 0.30) 0%, rgb(143 179 255 / 0) 62%), linear-gradient(160deg, #1a1f2b 0%, #07090f 62%)",
    card: "shadow-[inset_0_0_0_1px_rgb(255_255_255/0.09),inset_0_1px_0_rgb(255_255_255/0.18),0_40px_80px_-40px_rgb(0_0_0/0.85)]",
    glare: "rgb(143 179 255 / 0.16)",
    shine: "rgb(255 255 255 / 0.1)",
    tile: "bg-white/[0.06] text-accent shadow-[inset_0_0_0_1px_rgb(255_255_255/0.14)]",
    check: "text-fg shadow-[inset_0_0_0_1px_rgb(255_255_255/0.22)]",
    rule: "bg-accent",
    soft: "text-fg-2",
    holo: 0.4,
    gloss: 0.1,
  },
};

function useMedia(query: string) {
  const [ok, setOk] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setOk(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return ok;
}

/** Moves the glow to the pointer by writing two custom properties: no React render per move. */
function followGlare(e: PointerEvent<HTMLElement>) {
  if (e.pointerType !== "mouse") return;
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--lp-mx", `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty("--lp-my", `${e.clientY - r.top}px`);
  e.currentTarget.style.setProperty("--lp-hue", String(Math.round(((e.clientX - r.left) / r.width) * 360)));
}

function StepCard({ s, i, mascot }: { s: RailStep; i: number; mascot?: { y: MotionValue<number>; rotate: MotionValue<number>; opacity: MotionValue<number> } }) {
  const look = LOOK[s.tone];
  const Icon = s.icon;
  return (
    <article
      data-theme={look.theme}
      onPointerMove={followGlare}
      className={`${look.card} relative grid h-full grid-cols-1 content-start items-center gap-5 overflow-hidden rounded-[32px] p-5 text-fg md:min-h-[460px] md:grid-cols-[1fr_1.05fr] md:content-center md:gap-7 md:p-10`}
      style={{ backgroundImage: look.bg, "--lp-glare": look.glare, "--lp-shine": look.shine, "--lp-shine-delay": `${i * 1.5}s`, "--lp-holo": look.holo, "--lp-gloss": look.gloss } as CSSProperties}
    >
      <Grain opacity={0.1} />
      <span className="lp-glare pointer-events-none absolute inset-0" aria-hidden />
      <SilkGlow seed={7 + i * 13} count={4} ink={s.tone === "glass" ? 0 : 1} blur={40} />
      <Constellations
        seed={31 + i * 9}
        clusters={2}
        dust={45}
        region={{ x0: 520, x1: 960, y0: 60, y1: 540 }}
        color={s.tone === "glass" ? "rgb(47 85 196 / 0.35)" : "rgb(233 236 241 / 0.4)"}
        star={s.tone === "glass" ? "#2f55c4" : "#f5f7fa"}
        halo={s.tone === "glass" ? "rgb(47 85 196 / 0.12)" : "rgb(143 179 255 / 0.16)"}
        className="[mask-image:linear-gradient(105deg,rgb(0_0_0/0.25)_20%,#000_60%)]"
      />
      {/* The shine stack: holographic film under the cursor, lacquer gloss on top, a turning foil edge. */}
      <span className="lp-holo" aria-hidden />
      <span className="lp-gloss" aria-hidden />
      <span className="lp-foil-edge" aria-hidden />

      <div className="relative">
        <span className={`hidden size-[52px] place-items-center rounded-[16px] md:grid ${look.tile}`} aria-hidden>
          <Icon className="size-[22px]" />
        </span>
        {/* Kuwago stands across from the icon, out of the layout, so the card keeps its height. */}
        <motion.div className="pointer-events-none absolute -top-4 right-0" style={mascot} aria-hidden>
          <Mascot pose={s.pose} size={100} />
        </motion.div>
        <p className={`mt-1 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.24em] ${look.soft} md:mt-7`}>
          <span className={`h-px w-8 ${look.rule}`} aria-hidden />
          Step {s.n}
        </p>
        <h3 className="mt-3 text-[clamp(28px,3.6vw,44px)] font-semibold leading-[1.02] tracking-[-0.035em]">{s.title}</h3>
        <p className={`mt-2.5 max-w-[32ch] text-[15px] leading-[1.5] ${look.soft} md:mt-3.5 md:text-[16.5px] md:leading-[1.55]`}>{s.line}</p>
        <p className={`mt-4 inline-flex max-w-full items-start gap-2 rounded-2xl px-3 py-1.5 text-[12.5px] font-semibold leading-[1.4] md:mt-6 md:rounded-full md:px-4 md:py-2 md:text-[13.5px] ${look.check}`}>
          <ShieldCheck className="mt-px size-[15px] shrink-0" aria-hidden />
          {s.check}
        </p>
      </div>

      {/* On a phone the scene draws smaller, so the whole card fits under the header. */}
      <div className="relative max-md:[zoom:0.82]">{s.scene}</div>

      {/* The band of light crosses the scene too, the way light crosses glass. */}
      <span className="lp-shine pointer-events-none absolute inset-y-0 left-0 z-10 w-3/5" aria-hidden />
    </article>
  );
}

/** One card on the rail: slides, turns away and shrinks as it leaves the centre. */
function RailCard({ s, i, at }: { s: RailStep; i: number; at: MotionValue<number> }) {
  const d = useTransform(at, (v) => v - i);
  const away = useTransform(d, (v) => Math.min(Math.abs(v), 1));
  const x = useTransform(d, (v) => `${-v * SHIFT * 100}%`);
  const rotateY = useTransform(d, (v) => Math.max(-1, Math.min(1, v)) * TURN_DEG);
  const scale = useTransform(away, (a) => 1 - a * SHRINK);
  const zIndex = useTransform(d, (v) => 10 - Math.round(Math.abs(v) * 3));
  const mascot = {
    y: useTransform(away, (a) => a * 30),
    rotate: useTransform(away, (a) => -a * 12),
    opacity: useTransform(away, (a) => 1 - a),
  };
  return (
    <motion.div className="absolute inset-x-0 top-0 h-full will-change-transform" style={{ x, rotateY, scale, zIndex, transformPerspective: 1400 }}>
      <StepCard s={s} i={i} mascot={mascot} />
    </motion.div>
  );
}

/**
 * How it works: the section holds still while the scroll slides the stacked cards sideways.
 * With reduced motion or a short screen, the cards are plain blocks one under the other.
 */
export function HowRail({ steps, heading }: { steps: RailStep[]; heading: ReactNode }) {
  const reduce = useReducedMotion();
  const tall = useMedia("(min-height: 640px)");
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const last = steps.length - 1;
  const at = useTransform(scrollYProgress, (p) => p * last);
  const [active, setActive] = useState(0);
  useMotionValueEvent(at, "change", (v) => setActive(Math.round(v)));

  if (reduce || !tall) {
    return (
      <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-24 sm:px-8">
        {heading}
        <div className="mx-auto mt-10 grid max-w-[800px] gap-8">
          {steps.map((s, i) => (
            <StepCard key={s.n} s={s} i={i} />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section id="how" ref={ref} className="relative" style={{ height: `calc(100svh + ${last * 60}svh)` }} aria-label="How it works">
      <div className="sticky top-0 flex h-[100svh] flex-col justify-center overflow-x-clip pt-16">
        <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
          {heading}
          <ol aria-label="Steps" className="mt-5 flex gap-1.5">
            {steps.map((s, i) => (
              <li
                key={s.n}
                aria-current={i === active ? "step" : undefined}
                className={`h-1 w-7 rounded-full transition-colors duration-300 ${i <= active ? "metal-fill" : "bg-[color-mix(in_srgb,var(--t-fg)_12%,transparent)]"}`}
              >
                <span className="sr-only">{s.title}</span>
              </li>
            ))}
          </ol>
        </div>
        {/* The neighbours show at the edges; a mask fades them and their shadows out, so no straight edge cuts a shadow. */}
        <div className="mt-8 px-5 [mask-image:linear-gradient(90deg,transparent_0,#000_16px,#000_calc(100%-16px),transparent_100%)] sm:px-8 md:[mask-image:linear-gradient(90deg,transparent_0,#000_48px,#000_calc(100%-48px),transparent_100%)]">
          <div className="relative mx-auto h-[min(560px,62svh)] max-w-[800px] md:h-[min(500px,62svh)]">
            {steps.map((s, i) => (
              <RailCard key={s.n} s={s} i={i} at={at} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
