import { Menu, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import { useWallet } from "../contexts/WalletContext";
import { Logo } from "./Logo";
import { ThemeToggle } from "./AppShell";
import { buttonClass } from "./ui";

/** Scroll distance past which the bar lifts into a floating pill. */
const LIFT_AT = 24;

const LINKS = [
  { href: "/#how", label: "How it works" },
  { href: "/#why", label: "Why us" },
  { href: "/#stories", label: "Stories" },
  { href: "/#faq", label: "FAQ" },
];

/**
 * The public header, in the Creator Loans floating-pill pattern. At the top of the page the bar is
 * wide and draws nothing over the moonlit hero. Once the page scrolls it narrows into one frosted
 * midnight pill with a soft shadow. From 900px it holds the section links, Proof and the call to
 * action; below that, the logo, a short call to action and a menu button. Escape, a tap outside and
 * focus leaving the header close the menu.
 */
export function SiteNav() {
  const { status } = useWallet();
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const cta = status === "ready" ? { to: "/ask", label: "Open app", short: "Open" } : { to: "/start", label: "Get started", short: "Start" };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > LIFT_AT);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      menuButtonRef.current?.focus();
    };
    const onPointer = (e: PointerEvent) => {
      if (!headerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  const lifted = scrolled || open;
  const close = () => setOpen(false);

  return (
    <header
      ref={headerRef}
      data-lifted={lifted || undefined}
      onBlur={(e) => {
        const next = e.relatedTarget as Node | null;
        if (next && !e.currentTarget.contains(next)) setOpen(false);
      }}
      className={`pt-safe fixed inset-x-0 top-0 z-50 px-3 transition-[padding] duration-300 ease-out sm:px-4 ${lifted ? "pt-3" : "pt-4"}`}
    >
      <div
        className={`mx-auto flex w-full items-center gap-3 rounded-full transition-[max-width,padding,background-color,box-shadow] duration-300 ease-out min-[900px]:gap-6 ${
          lifted
            ? "max-w-[1180px] bg-[color-mix(in_srgb,var(--t-surface)_78%,transparent)] py-2 pl-3 pr-2 shadow-[inset_0_0_0_1px_var(--t-line),0_1px_2px_rgb(0_0_0/0.2),0_18px_44px_-12px_rgb(0_0_0/0.6)] backdrop-blur-xl backdrop-saturate-150 sm:pl-5"
            : "max-w-[1320px] bg-transparent py-2 pl-2 pr-1"
        }`}
      >
        <span onClick={close} className="flex shrink-0 items-center">
          <Logo size={lifted ? 28 : 32} />
        </span>

        <nav aria-label="Primary" className="hidden flex-1 justify-center min-[900px]:flex">
          <ul className="flex gap-1">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  className="flex h-10 items-center rounded-full px-4 text-[15px] font-medium text-fg-2 transition-colors hover:bg-[color-mix(in_srgb,var(--t-fg)_7%,transparent)] hover:text-fg"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2 min-[900px]:ml-0 min-[900px]:gap-3">
          <Link to="/proof" className="hidden whitespace-nowrap text-[15px] font-medium text-fg-2 transition-colors hover:text-fg min-[900px]:inline">
            Proof
          </Link>
          <ThemeToggle className="hidden min-[900px]:grid" />
          <Link to={cta.to} className={buttonClass("metal", "md", "!hidden whitespace-nowrap min-[900px]:!inline-flex")}>
            {cta.label}
          </Link>
          <Link to={cta.to} onClick={close} className={buttonClass("metal", "sm", "min-[900px]:!hidden")}>
            {cta.short}
          </Link>
          <button
            ref={menuButtonRef}
            type="button"
            aria-expanded={open}
            aria-controls={open ? menuId : undefined}
            onClick={() => setOpen((o) => !o)}
            className="grid size-10 place-items-center rounded-full bg-[color-mix(in_srgb,var(--t-fg)_8%,transparent)] text-fg transition-colors min-[900px]:hidden"
          >
            <span className="sr-only">Menu</span>
            {open ? <X size={19} aria-hidden /> : <Menu size={19} aria-hidden />}
          </button>
        </div>
      </div>

      {open && (
        <nav
          id={menuId}
          aria-label="Menu"
          className="menu-solid mx-auto mt-2 max-w-[1180px] rounded-[28px] p-3 shadow-[inset_0_0_0_1px_var(--t-line),0_24px_60px_-20px_rgb(0_0_0/0.7)] min-[900px]:hidden"
        >
          <ul className="grid gap-1">
            {[...LINKS, { href: "/proof", label: "Proof" }, { href: "/developers", label: "Developers" }].map((l) => (
              <li key={l.href}>
                <a href={l.href} onClick={close} className="flex h-12 items-center rounded-2xl px-4 text-[16px] font-medium text-fg hover:bg-[color-mix(in_srgb,var(--t-fg)_7%,transparent)]">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex items-center justify-between px-2">
            <ThemeToggle />
            <Link to={cta.to} onClick={close} className={buttonClass("metal", "md")}>
              {cta.label}
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
