import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { BUBBLE_PATH, QUESTION_PATH } from "./Logo";
import "./splash.css";

const SEEN = "t402.splash";
const LENGTH_MS = 4100;

function shouldPlay() {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  if (new URLSearchParams(window.location.search).has("shot")) return false;
  try {
    return !sessionStorage.getItem(SEEN);
  } catch {
    return false;
  }
}

/** Stars of the ring that links up round the bubble: [x, y, r, delay]. */
const STARS = [
  [70, 96, 2.2, 1.3], [118, 52, 1.6, 1.42], [196, 46, 2, 1.54], [256, 92, 1.5, 1.66], [268, 170, 2.3, 1.78],
  [54, 172, 1.5, 1.5], [92, 244, 1.9, 1.7], [232, 246, 1.6, 1.9], [160, 276, 2.1, 2.02],
] as const;

/**
 * First-visit intro, about 4 s: a silver dot inflates into the ask bubble, typing dots bounce,
 * the third drops into the dot of a "?" that draws itself, a constellation links up round it,
 * the wordmark rises, then the bubble flies into the real nav logo and the page shows.
 * Once per session; tap or Esc skips; never runs with reduced motion.
 */
export function Splash() {
  const [on, setOn] = useState(shouldPlay);
  const [leaving, setLeaving] = useState(false);
  const [target, setTarget] = useState<CSSProperties>({});
  const timers = useRef<number[]>([]);

  useEffect(() => {
    if (!on) return;
    try {
      sessionStorage.setItem(SEEN, "1");
    } catch {
      /* private mode: plays every load, harmless */
    }
    const logo = document.querySelector("header [data-logo-mark]")?.getBoundingClientRect();
    if (logo) {
      setTarget({
        "--sp-fx": `${logo.left + logo.width / 2}px`,
        "--sp-fy": `${logo.top + logo.height / 2}px`,
        "--sp-fs": `${logo.width}px`,
      } as CSSProperties);
    }
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    timers.current.push(window.setTimeout(() => setOn(false), LENGTH_MS));
    const skip = (e: KeyboardEvent) => e.key === "Escape" && setLeaving(true);
    window.addEventListener("keydown", skip);
    return () => {
      document.documentElement.style.overflow = prev;
      window.removeEventListener("keydown", skip);
      timers.current.forEach(clearTimeout);
    };
  }, [on]);

  useEffect(() => {
    if (!leaving) return;
    const t = window.setTimeout(() => setOn(false), 320);
    return () => clearTimeout(t);
  }, [leaving]);

  if (!on) return null;
  // Portalled to <body>: the page wrapper is transformed, which would pin a fixed overlay to it.
  return createPortal(
    <div className={`sp ${leaving ? "sp-leave" : ""}`} style={target} onClick={() => setLeaving(true)} aria-hidden>
      <div className="sp-halo" />
      <svg className="sp-sky" viewBox="0 0 320 320">
        <path className="sp-ln" pathLength={1} d="M70 96 L118 52 L196 46 L256 92 L268 170 M70 96 L54 172 L92 244 M268 170 L232 246 L160 276" />
        {STARS.map(([x, y, r, d]) => (
          <circle key={`${x}-${y}`} className="sp-st" cx={x} cy={y} r={r} style={{ animationDelay: `${d}s, 2.9s` }} />
        ))}
      </svg>
      <div className="sp-seed" />
      <svg className="sp-mark" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="sp-silver" x1="10" y1="12" x2="90" y2="92" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F5F7FA" />
            <stop offset=".3" stopColor="#C9CFD8" />
            <stop offset=".55" stopColor="#8E97A6" />
            <stop offset=".8" stopColor="#E6E9EE" />
            <stop offset="1" stopColor="#AEB6C2" />
          </linearGradient>
          <linearGradient id="sp-gloss" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#fff" stopOpacity=".55" />
            <stop offset=".5" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="sp-shine" x1="0" x2="1">
            <stop stopColor="#fff" stopOpacity="0" />
            <stop offset=".5" stopColor="#fff" stopOpacity=".85" />
            <stop offset="1" stopColor="#c9d6ff" stopOpacity="0" />
          </linearGradient>
          <clipPath id="sp-clip">
            <path d={BUBBLE_PATH} />
          </clipPath>
        </defs>
        <g className="sp-bubble">
          <path d={BUBBLE_PATH} fill="url(#sp-silver)" />
          <path className="sp-gloss" d="M18 14h64a9 9 0 0 1 9 9v12H9V23a9 9 0 0 1 9-9Z" fill="url(#sp-gloss)" />
          <path className="sp-q" pathLength={1} d={QUESTION_PATH} />
          <circle className="sp-dot sp-d1" cx="38" cy="47" r="3.8" />
          <circle className="sp-dot sp-d2" cx="50" cy="47" r="3.8" />
          <circle className="sp-dot sp-d3" cx="62" cy="47" r="3.8" />
          <g className="sp-shine" clipPath="url(#sp-clip)">
            <rect x="0" y="0" width="28" height="100" fill="url(#sp-shine)" />
          </g>
        </g>
      </svg>
      <div className="sp-word">
        <strong>Tanong</strong>
        <small>402</small>
        <i>Ask anything</i>
      </div>
    </div>,
    document.body,
  );
}
