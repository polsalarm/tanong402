import { statsResponse } from "@tanong/shared";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  CreditCard,
  Gift,
  Languages,
  MessageCircle,
  Plus,
  Receipt,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Ticket,
  Users,
  Zap,
} from "lucide-react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router";
import type { z } from "zod";
import { Mascot } from "../../components/Mascot";
import { MetalCard } from "../../components/MetalCard";
import { Page } from "../../components/Page";
import { LinkButton } from "../../components/ui";
import { useConfig } from "../../contexts/ConfigContext";
import { useWallet } from "../../contexts/WalletContext";
import { api } from "../../lib/api";
import { MOCK_API } from "../../lib/env";
import { php } from "../../lib/format";
import { useResource } from "../../lib/hooks/useResource";
import { HowRail, type RailStep } from "./HowRail";
import { Backdrop, Constellations, SilkGlow, Sparkles as SparkleField } from "./Patterns";
import { Splash } from "../../components/Splash";
import { Phone } from "./Phone";
import { AskScene, InviteScene, ModelsVisual, NoCardVisual, PoolVisual, ReceiptScene, SafeVisual, TaglishVisual } from "./Scenes";
import "./landing.css";

/** Demo builds skip the invite: `?seed=demo` boots straight into a ready account. */
const firstQuestionHref = (status: string) => (status === "ready" ? "/ask" : MOCK_API ? "/ask?seed=demo" : "/start");
const EASE = [0.16, 1, 0.3, 1] as const;
type Stats = z.infer<typeof statsResponse>;

const reveal = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.9, ease: EASE },
} as const;

function Spark({ x, y, s = 14, d = 3.2, delay = 0 }: { x: string; y: string; s?: number; d?: number; delay?: number }) {
  return <span className="lp-spark" style={{ left: x, top: y, "--s": `${s}px`, "--d": `${d}s`, "--delay": `${delay}s` } as CSSProperties} aria-hidden />;
}

function Chip({ children, className = "", style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div className={`glass-float lp-bob absolute z-30 flex items-center gap-2.5 rounded-2xl py-2.5 pl-2.5 pr-4 ${className}`} style={style}>
      {children}
    </div>
  );
}

/* ── Hero ───────────────────────────────────────────────────────────── */

/** Kept around the phone and in the corners, never over the headline. */
const HERO_SPARKLES = [
  { x: "52%", y: "14%", size: 20, delay: 0 },
  { x: "93%", y: "22%", size: 14, delay: 1.3 },
  { x: "88%", y: "80%", size: 22, delay: 2.4 },
  { x: "60%", y: "86%", size: 12, delay: 0.7 },
  { x: "72%", y: "8%", size: 11, delay: 3.1 },
  { x: "4%", y: "10%", size: 13, delay: 1.9 },
];

function Hero({ pricePhp, allowancePhp, status, stats }: { pricePhp: string; allowancePhp: string; status: string; stats: Stats | undefined }) {
  const words = ["Bayad", "per"];
  return (
    <section id="top" data-theme="midnight" className="relative overflow-hidden text-fg">
      <Backdrop variant="hero" />
      <SparkleField spots={HERO_SPARKLES} />
      <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-4 px-5 pb-12 pt-28 sm:grid-cols-[1fr_0.9fr] sm:gap-2 sm:px-8 sm:pt-32 lg:grid-cols-[1.05fr_1fr] lg:gap-6 lg:pb-10 lg:pt-36">
        <div className="relative z-10">
          <h1 className="lp-rise mt-7 text-[56px] font-semibold leading-[0.92] tracking-[-0.055em] text-fg sm:text-[60px] md:text-[76px] lg:text-[104px]">
            {words.map((w, i) => (
              <span key={w} style={{ animationDelay: `${i * 90}ms` }}>
                {w}&nbsp;
              </span>
            ))}
            <br />
            <span className="lp-gleam-metal pb-[0.14em]" style={{ animationDelay: "180ms" }}>
              tanong.
            </span>
          </h1>
          <p className="mt-6 text-[19px] text-fg-2 sm:text-[21px]">
            <span className="tabular font-semibold text-fg">{pricePhp}</span> a question. Not ₱1,100 a month.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <LinkButton to={firstQuestionHref(status)} reloadDocument={MOCK_API && status !== "ready"} variant="metal" size="lg" className="sm:min-w-[220px]">
              Ask a question
              <ArrowRight className="size-[18px]" aria-hidden />
            </LinkButton>
            <LinkButton to="/start" variant="glass" size="lg">
              I have an invite
            </LinkButton>
          </div>
          <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-[13.5px] text-fg-3">
            {["No card", "Taglish OK", "Receipt every time"].map((t) => (
              <li key={t} className="inline-flex items-center gap-1.5">
                <Check className="size-4 text-success" aria-hidden />
                {t}
              </li>
            ))}
          </ul>
        </div>

        {/* phone + floating proof */}
        <div className="relative mx-auto h-[640px] w-full max-w-[460px] origin-top sm:max-lg:-mb-[170px] sm:max-lg:scale-[0.76] sm:h-[690px] lg:h-[720px]">
          {/* Light pooling behind the phone, so the silver frame catches it. */}
          <div className="pointer-events-none absolute left-1/2 top-[8%] size-[440px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgb(143_179_255/0.28)_0%,rgb(143_179_255/0.08)_40%,transparent_68%)] blur-2xl" aria-hidden />
          <Spark x="8%" y="10%" s={18} />
          <Spark x="88%" y="6%" s={12} delay={1.1} />
          <Spark x="94%" y="58%" s={16} delay={2} />
          <Spark x="2%" y="70%" s={11} delay={0.6} />
          <motion.div
            initial={{ opacity: 0, y: 60, rotate: -4 }}
            animate={{ opacity: 1, y: 0, rotate: -2 }}
            transition={{ duration: 1.2, ease: EASE, delay: 0.2 }}
            className="absolute left-1/2 top-2 z-20 -translate-x-1/2"
          >
            <Phone pricePhp={pricePhp} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40, rotate: 10 }}
            animate={{ opacity: 1, x: 0, rotate: 8 }}
            transition={{ duration: 1.2, ease: EASE, delay: 0.55 }}
            className="absolute -right-6 bottom-24 z-10 hidden w-[250px] sm:block lg:-right-16"
          >
            <MetalCard balancePhp={14.5} questionsLeft={50} address="GDX4SAMPLE7QKP" since="2026-10-01" compact />
          </motion.div>

          <Chip className="-left-3 top-[118px] sm:-left-10" style={{ "--d": "6.5s" } as CSSProperties}>
            <span className="grid size-8 place-items-center rounded-full bg-[color-mix(in_srgb,var(--t-success)_16%,transparent)] text-success">
              <Gift className="size-4" aria-hidden />
            </span>
            <span className="text-[13px] text-fg">
              Allowance <span className="tabular font-semibold text-success">+{allowancePhp}</span>
            </span>
          </Chip>
          <Chip className="-right-2 top-[60px] sm:-right-8" style={{ "--d": "7s", "--delay": "1s" } as CSSProperties}>
            <Sparkles className="ml-1 size-4 text-accent" aria-hidden />
            <span className="text-[13px] text-fg">GPT-5.4</span>
            <span className="metal-fill rounded-full px-1.5 text-[10px] font-semibold">PRO</span>
          </Chip>
          <Chip className="-left-2 bottom-[150px] sm:-left-12" style={{ "--d": "5.5s", "--delay": "0.5s" } as CSSProperties}>
            <span className="grid size-8 place-items-center rounded-full bg-[color-mix(in_srgb,var(--t-accent)_16%,transparent)] text-accent">
              <Receipt className="size-4" aria-hidden />
            </span>
            <span className="text-[13px] text-fg">
              Settled <span className="tabular font-semibold">4.8s</span>
            </span>
          </Chip>
          <Mascot pose="peek" size={150} className="lp-bob absolute -left-10 bottom-4 z-30 hidden sm:block" />
        </div>
      </div>
    </section>
  );
}

/* ── Marquee + wordmarks ────────────────────────────────────────────── */

const PROMISES = [
  { icon: Zap, t: "₱0.29 per tanong" },
  { icon: CreditCard, t: "No card needed" },
  { icon: Languages, t: "English or Taglish" },
  { icon: Receipt, t: "A receipt every time" },
  { icon: ShieldCheck, t: "Not charged if it fails" },
  { icon: Sparkles, t: "Pick your model" },
  { icon: Users, t: "Sponsors fund students" },
  { icon: BadgeCheck, t: "Settled on Stellar" },
];

function Marquee() {
  const row = PROMISES.map(({ icon: Icon, t }) => (
    <span key={t} className="mx-7 inline-flex items-center gap-2.5 whitespace-nowrap text-[15px] text-fg-2">
      <Icon className="size-4 text-fg-3" aria-hidden />
      {t}
      <span className="ml-7 size-1 rounded-full bg-fg-4" aria-hidden />
    </span>
  ));
  return (
    <div className="lp-marquee mt-8 overflow-hidden py-4">
      <div className="lp-marquee-track">
        <div className="flex">{row}</div>
        <div className="flex" aria-hidden>
          {row}
        </div>
      </div>
    </div>
  );
}

/** A soft band of drifting light between sections. */
function PhaseDivider() {
  return (
    <div className="relative mx-auto my-6 h-16 max-w-6xl overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_15%,#000_85%,transparent)]" aria-hidden>
      <SilkGlow seed={83} count={5} ink={0} blur={24} />
    </div>
  );
}

function Wordmarks() {
  const marks = [
    { t: "OpenAI", c: "font-semibold tracking-[-0.03em]" },
    { t: "Gemini", c: "font-medium tracking-[-0.02em]" },
    { t: "groq", c: "font-bold tracking-[-0.04em]" },
    { t: "Claude", c: "font-serif italic" },
    { t: "Stellar", c: "font-semibold uppercase tracking-[0.1em] !text-[17px] sm:tracking-[0.18em] sm:!text-[21px]" },
    { t: "x402", c: "font-mono font-semibold" },
  ];
  return (
    <section className="mx-auto max-w-5xl px-5 pt-6 sm:px-8">
      <p className="text-center text-[12px] font-medium uppercase tracking-[0.22em] text-fg-4">Answers by · Paid on</p>
      <div className="mt-6 grid grid-cols-3 items-center gap-x-4 gap-y-6 sm:grid-cols-6">
        {marks.map((m) => (
          <span key={m.t} className={`lp-wordmark text-center text-[26px] ${m.c}`}>
            {m.t}
          </span>
        ))}
      </div>
    </section>
  );
}

/* ── Price bars ─────────────────────────────────────────────────────── */

function PriceBars({ twentyQs }: { twentyQs: string }) {
  return (
    <section className="mx-auto max-w-6xl px-5 py-24 sm:px-8 sm:py-32">
      <div className="grid grid-cols-1 items-end gap-12 lg:grid-cols-[1fr_1.1fr]">
        <motion.div {...reveal}>
          <p className="eyebrow">The math</p>
          <h2 className="mt-4 text-[44px] font-semibold leading-[0.95] tracking-[-0.045em] text-fg sm:text-[64px]">
            Same month.
            <br />
            <span className="lp-gleam-metal pb-[0.1em]">Way less.</span>
          </h2>
        </motion.div>
        <motion.div {...reveal} className="glass relative flex h-[380px] items-end justify-center gap-10 rounded-[32px] px-8 pb-8 sm:gap-16">
          <div className="flex h-full flex-col items-center justify-end">
            <span className="tabular text-[28px] font-semibold tracking-tight text-fg-3">₱1,100</span>
            <motion.div
              className="lp-bar mt-3 w-24 rounded-t-2xl bg-[color-mix(in_srgb,var(--t-fg)_12%,transparent)] shadow-[inset_0_0_0_1px_var(--t-line)] sm:w-28"
              initial={{ height: 0 }}
              whileInView={{ height: 250 }}
              viewport={{ once: true }}
              transition={{ duration: 1.4, ease: EASE }}
            />
            <span className="mt-3 text-[13px] text-fg-3">Monthly AI plan</span>
          </div>
          <div className="flex h-full flex-col items-center justify-end">
            <span className="tabular text-[28px] font-semibold tracking-tight text-fg">{twentyQs}</span>
            <motion.div
              className="lp-bar metal-fill sheen mt-3 w-24 rounded-t-2xl sm:w-28"
              initial={{ height: 0 }}
              whileInView={{ height: 14 }}
              viewport={{ once: true }}
              transition={{ duration: 1.4, ease: EASE, delay: 0.3 }}
            />
            <span className="mt-3 text-[13px] text-fg">20 questions here</span>
          </div>
          <Mascot pose="celebrate" size={96} className="lp-bob absolute -right-3 -top-10" />
        </motion.div>
      </div>
    </section>
  );
}

/* ── Why (the one ink section) ──────────────────────────────────────── */

function Why({ allowancePhp }: { allowancePhp: string }) {
  const tiles = [
    { t: "No card", v: <NoCardVisual /> },
    { t: "Taglish OK", v: <TaglishVisual /> },
    { t: "Pick your model", v: <ModelsVisual /> },
    { t: "Never charged for errors", v: <SafeVisual /> },
    { t: "Sponsors pay for you", v: <PoolVisual allowancePhp={allowancePhp} /> },
  ];
  return (
    <section id="why" data-theme="midnight" className="relative scroll-mt-20 overflow-hidden px-5 py-24 sm:px-8 sm:py-32">
      <Backdrop variant="ink" />
      <div className="relative mx-auto max-w-6xl">
        <motion.h2 {...reveal} className="text-[44px] font-semibold leading-[0.95] tracking-[-0.045em] text-[#e9ecf1] sm:text-[64px]">
          Built for <span className="lp-gleam-metal pb-[0.1em]">tonight.</span>
        </motion.h2>
        <div className="no-scrollbar -mx-5 mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-5">
          {tiles.map((x, i) => (
            <motion.div
              key={x.t}
              {...reveal}
              transition={{ ...reveal.transition, delay: i * 0.06 }}
              className="w-[74vw] max-w-[300px] shrink-0 snap-center rounded-[26px] bg-[#0b0f1a] p-3 shadow-[inset_0_0_0_1px_#ffffff12] sm:w-auto sm:max-w-none"
            >
              <div className="relative h-[150px] overflow-hidden rounded-[18px] bg-[radial-gradient(120%_90%_at_50%_0%,#1a2340,#0b0f1a)]">{x.v}</div>
              <p className="px-2 pb-2 pt-4 text-[17px] font-semibold tracking-[-0.02em] text-[#e9ecf1]">{x.t}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Example deck ───────────────────────────────────────────────────── */

const STORIES = [
  { q: "Quiz bukas. ₱3 lang nagastos ko, gets ko na factoring.", who: "BS Accountancy, 2nd year", i: "JR" },
  { q: "It explained my Java error in Taglish. Fixed it in 5 minutes.", who: "BS IT, 3rd year", i: "AM" },
  { q: "My org's pool covers my week. I never touched a card.", who: "BS Nursing, 1st year", i: "KC" },
];

function Deck() {
  const [top, setTop] = useState(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setTop((n) => (n + 1) % STORIES.length), 6000);
    return () => clearInterval(t);
  }, [reduce]);
  return (
    <section id="stories" className="mx-auto grid max-w-6xl scroll-mt-20 grid-cols-1 items-center gap-12 px-5 py-24 sm:px-8 sm:py-32 lg:grid-cols-[1fr_1fr]">
      <motion.div {...reveal}>
        <p className="eyebrow">Examples</p>
        <h2 className="mt-4 text-[44px] font-semibold leading-[0.95] tracking-[-0.045em] text-fg sm:text-[64px]">
          One tanong
          <br />
          at a time.
        </h2>
        <p className="mt-4 text-[13px] text-fg-3">Example stories, not real students yet.</p>
      </motion.div>
      <div className="lp-deck relative mx-auto h-[300px] w-full max-w-[460px]" onClick={() => setTop((n) => (n + 1) % STORIES.length)}>
        {STORIES.map((s, i) => {
          const depth = (i - top + STORIES.length) % STORIES.length;
          return (
            <figure
              key={s.i}
              className="metal-card hairline-metal absolute inset-0 flex cursor-pointer flex-col overflow-hidden rounded-[30px] p-7"
              style={{
                transform: `translate(${depth * 18}px, ${depth * 14}px) rotate(${depth * 3}deg) scale(${1 - depth * 0.05})`,
                zIndex: STORIES.length - depth,
                opacity: depth > 1 ? 0.5 : 1,
              }}
            >
              <SilkGlow seed={101 + i * 7} count={3} ink={0} blur={36} />
              <Constellations seed={61 + i * 5} clusters={1} dust={30} region={{ x0: 600, x1: 940, y0: 60, y1: 300 }} />
              <span className="relative self-start rounded-full bg-[color-mix(in_srgb,var(--t-fg)_8%,transparent)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-fg-3">
                Example
              </span>
              <blockquote className="mt-5 text-[24px] font-medium leading-[1.2] tracking-[-0.02em] text-fg">“{s.q}”</blockquote>
              <figcaption className="mt-auto flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-full bg-[var(--t-surface-2)] text-[12px] font-semibold text-fg-2">{s.i}</span>
                <span className="text-[13px] text-fg-3">{s.who}</span>
              </figcaption>
            </figure>
          );
        })}
      </div>
    </section>
  );
}

/* ── FAQ ────────────────────────────────────────────────────────────── */

const FAQ = [
  { q: "Do I need a card?", a: "No. Your weekly allowance or a sponsor covers your questions." },
  { q: "What if the answer fails?", a: "You're not charged. Payment only settles after you get an answer." },
  { q: "Can it do my homework?", a: "It teaches step by step. It won't write graded work for you to submit." },
  { q: "What's Pro?", a: "Stronger models for proofs and code, at a higher price shown before you ask." },
];

function Faq() {
  return (
    <section id="faq" className="mx-auto max-w-3xl scroll-mt-24 px-5 pb-24 sm:px-8">
      <div className="flex flex-col items-center text-center">
        <Mascot pose="thinking" size={104} className="lp-bob" />
        <h2 className="mt-3 text-[40px] font-semibold tracking-[-0.045em] text-fg sm:text-[52px]">Questions?</h2>
      </div>
      <div className="mt-8 grid gap-3">
        {FAQ.map((f, i) => (
          <details key={f.q} name="faq" open={i === 0} className="glass group rounded-[22px] px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[16px] font-medium text-fg">
              {f.q}
              <span className="grid size-8 shrink-0 place-items-center rounded-full shadow-[inset_0_0_0_1px_var(--t-line-strong)] transition-transform duration-300 group-open:rotate-45">
                <Plus className="size-4" aria-hidden />
              </span>
            </summary>
            <p className="pt-3 text-[15px] leading-relaxed text-fg-2">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

/* ── Final CTA: velvet + engraved foil card ─────────────────────────── */

function FoilCard() {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-1, 1], [10, -10]), { stiffness: 120, damping: 14 });
  const ry = useSpring(useTransform(mx, [-1, 1], [-12, 12]), { stiffness: 120, damping: 14 });
  return (
    <div
      className="[perspective:1200px]"
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        mx.set(((e.clientX - r.left) / r.width) * 2 - 1);
        my.set(((e.clientY - r.top) / r.height) * 2 - 1);
      }}
      onPointerLeave={() => {
        mx.set(0);
        my.set(0);
      }}
    >
      <motion.div style={{ rotateX: rx, rotateY: ry }} className="lp-foil mx-auto w-full max-w-[400px] rounded-[26px]">
        <div className="relative overflow-hidden rounded-[25px] bg-[linear-gradient(150deg,#1b2238,#0b0f1a_60%,#141b2e)] p-7">
          <div className="lp-engrave pointer-events-none absolute inset-0" aria-hidden />
          <div className="flex items-center justify-between">
            <span className="text-[17px] font-semibold tracking-tight text-[#e9ecf1]">Tanong402</span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9aa3b2]">Scholarship</span>
          </div>
          <p className="mt-10 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9aa3b2]">Your weekly allowance</p>
          <p className="lp-gleam-metal mt-1 text-[52px] font-semibold leading-none tracking-[-0.04em]">₱ ••.••</p>
          <div className="mt-8 flex items-center justify-between text-[11px] tracking-[0.18em] text-[#5f6878]">
            <span>INVITE ONLY</span>
            <span>EST. 2026</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function FinalCta({ status }: { status: string }) {
  return (
    <section data-theme="midnight" className="relative overflow-hidden px-5 py-24 text-fg sm:px-8 sm:py-32">
      <Backdrop variant="velvet" />
      <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-14 lg:grid-cols-[1.1fr_1fr]">
        <motion.div {...reveal}>
          <Mascot pose="wave" size={110} className="lp-bob -ml-2" />
          <h2 className="mt-3 text-[52px] font-semibold leading-[0.92] tracking-[-0.05em] text-fg sm:text-[80px]">
            Quiz bukas?
            <br />
            <span className="lp-gleam-metal pb-[0.1em]">Ask tonight.</span>
          </h2>
          <LinkButton to={firstQuestionHref(status)} reloadDocument={MOCK_API && status !== "ready"} variant="metal" size="lg" className="mt-9">
            Start asking
            <ArrowRight className="size-[18px]" aria-hidden />
          </LinkButton>
        </motion.div>
        <motion.div {...reveal} transition={{ ...reveal.transition, delay: 0.15 }}>
          <FoilCard />
        </motion.div>
      </div>
    </section>
  );
}

/* ── Page ───────────────────────────────────────────────────────────── */

export default function Landing() {
  const { pricePhp, phpPerUsd } = useConfig();
  const { status } = useWallet();
  const stats = useResource("stats", (signal) => api.stats(signal), { pollMs: 60_000 });
  const allowancePhp = php(0.25, phpPerUsd);
  const twentyQs = php(0.005 * 20, phpPerUsd).replace(".00", "");

  const steps: RailStep[] = [
    {
      n: "01",
      icon: Ticket,
      title: "Get an invite",
      line: `From your school, org or sponsor. ${allowancePhp} lands every week.`,
      check: "No card, no sign-up fee.",
      scene: <InviteScene allowancePhp={allowancePhp} />,
      pose: "invite",
      tone: "glass",
    },
    {
      n: "02",
      icon: MessageCircle,
      title: "Ask anything",
      line: "Math, code, essays, in English or Taglish. Step by step, not just the answer.",
      check: "Not charged if the tutor fails.",
      scene: <AskScene pricePhp={pricePhp} />,
      pose: "reading",
      tone: "metal",
    },
    {
      n: "03",
      icon: ReceiptText,
      title: "Keep the receipt",
      line: "Every answer comes with a receipt anyone can check.",
      check: `${pricePhp} a question. Nothing hidden.`,
      scene: <ReceiptScene pricePhp={pricePhp} />,
      pose: "celebrate",
      tone: "ink",
    },
  ];

  return (
    <Page>
      <Splash />
      <Hero pricePhp={pricePhp} allowancePhp={allowancePhp} status={status} stats={stats.data} />
      <Marquee />
      <Wordmarks />
      <PhaseDivider />
      <HowRail
        steps={steps}
        heading={
          <h2 className="text-[40px] font-semibold leading-[0.95] tracking-[-0.045em] text-fg sm:text-[56px]">
            Three taps to <span className="lp-gleam-metal pb-[0.1em]">an answer.</span>
          </h2>
        }
      />
      <PriceBars twentyQs={twentyQs} />
      <Why allowancePhp={allowancePhp} />
      <Deck />
      <Faq />
      <FinalCta status={status} />
    </Page>
  );
}
