import { useId } from "react";
import { Link } from "react-router";

/** Bubble outline, shared by the mark and the splash. */
export const BUBBLE_PATH =
  "M18 13h64a10 10 0 0 1 10 10v40a10 10 0 0 1-10 10H46L28 87V73H18A10 10 0 0 1 8 63V23a10 10 0 0 1 10-10Z";
export const QUESTION_PATH = "M40 35c0-7 5-11 11-11s10 4 10 9c0 5-3 7-7 10-2 1.5-3 3.5-3 6";

/** The mark: a brushed-silver chat bubble with the question cut in. "Ask", at any size. */
export function LogoMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-hidden data-logo-mark className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id={`${id}-silver`} x1="10" y1="12" x2="90" y2="92" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#F5F7FA" />
          <stop offset="0.3" stopColor="#C9CFD8" />
          <stop offset="0.55" stopColor="#8E97A6" />
          <stop offset="0.8" stopColor="#E6E9EE" />
          <stop offset="1" stopColor="#AEB6C2" />
        </linearGradient>
        <linearGradient id={`${id}-gloss`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={BUBBLE_PATH} fill={`url(#${id}-silver)`} />
      <path d="M18 14h64a9 9 0 0 1 9 9v12H9V23a9 9 0 0 1 9-9Z" fill={`url(#${id}-gloss)`} />
      <path d={QUESTION_PATH} stroke="#0B0F1A" strokeWidth="6" strokeLinecap="round" />
      <circle cx="51" cy="60" r="4.2" fill="#0B0F1A" />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-baseline font-display leading-none tracking-[-0.01em] ${className}`}>
      <span className="text-metal">Tanong</span>
      <span className="ml-[0.08em] text-[0.52em] font-semibold tracking-[0.04em] text-fg-2">402</span>
    </span>
  );
}

export function Logo({ to = "/", size = 30, className = "" }: { to?: string; size?: number; className?: string }) {
  return (
    <Link
      to={to}
      aria-label="Tanong402 home"
      className={`group inline-flex items-center gap-2.5 rounded-full outline-offset-4 ${className}`}
    >
      <LogoMark size={size} className="transition-transform duration-500 ease-[var(--ease-silk)] group-hover:rotate-[-6deg]" />
      <Wordmark className="text-[23px]" />
    </Link>
  );
}
