import { ArrowUpRight, MessageCircle, Moon, ReceiptText, Settings2, Sun, WalletCards } from "lucide-react";
import { motion } from "motion/react";
import { Link, NavLink, Outlet, useLocation } from "react-router";
import { useConfig } from "../contexts/ConfigContext";
import { useTheme } from "../contexts/ThemeContext";
import { useWallet } from "../contexts/WalletContext";
import { useActivity } from "../lib/activity";
import { cardId, countdown, php } from "../lib/format";
import { useNow } from "../lib/hooks/useNow";
import { usePool } from "../lib/hooks/usePool";
import { ActivityList } from "./Activity";
import { Logo, LogoMark } from "./Logo";
import { MetalCard } from "./MetalCard";
import { DisplayPeso } from "./Money";
import { QuestionsPill } from "./QuestionsPill";
import { SiteNav } from "./SiteNav";
import { StatusBanner } from "./StatusBanner";
import { Badge, LinkButton, buttonClass } from "./ui";

const NAV = [
  { to: "/ask", label: "Ask", icon: MessageCircle },
  { to: "/receipts", label: "Receipts", icon: ReceiptText },
  { to: "/wallet", label: "Wallet", icon: WalletCards },
  { to: "/settings", label: "Settings", icon: Settings2 },
] as const;

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { resolved, setPref } = useTheme();
  const next = resolved === "midnight" ? "silver" : "midnight";
  return (
    <button
      type="button"
      onClick={() => setPref(next)}
      aria-label={`Switch to ${next === "silver" ? "Silver (light)" : "Midnight (dark)"} theme`}
      className={`grid size-10 place-items-center rounded-full text-fg-2 transition-colors hover:bg-[color-mix(in_srgb,var(--t-fg)_7%,transparent)] hover:text-fg ${className}`}
    >
      {resolved === "midnight" ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
    </button>
  );
}

// ─── mobile chrome ────────────────────────────────────────────────────────────

function MobileHeader() {
  return (
    <div className="pt-safe sticky top-0 z-40 px-3 before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-[84px] before:bg-[linear-gradient(180deg,var(--t-bg)_35%,transparent)] before:content-[''] lg:hidden">
      <header className="glass-float relative mt-2 flex h-14 items-center justify-between rounded-full pl-3 pr-2">
        <Logo to="/ask" size={28} />
        <QuestionsPill />
      </header>
    </div>
  );
}

function BottomNav() {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 lg:hidden"
    >
      <ul className="glass-float relative grid h-[66px] grid-cols-4 rounded-full px-1.5">
        {NAV.map(({ to, label, icon: Icon }) => (
          <li key={to} className="relative">
            <NavLink
              to={to}
              className={({ isActive }) =>
                `relative z-0 flex h-full flex-col items-center justify-center gap-1 text-[11px] font-medium tracking-[0.01em] transition-colors duration-200 ${isActive ? "text-fg" : "text-fg-3"}`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="bottom-nav-pill"
                      className="absolute inset-x-1 inset-y-[7px] -z-10 rounded-full bg-[color-mix(in_srgb,var(--t-fg)_8%,transparent)] shadow-[inset_0_0_0_1px_var(--t-line-strong)]"
                      transition={{ type: "spring", stiffness: 520, damping: 40 }}
                    />
                  )}
                  <Icon className="size-[21px]" strokeWidth={isActive ? 2 : 1.75} aria-hidden />
                  {label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// ─── desktop chrome ───────────────────────────────────────────────────────────

function SideNav() {
  const { status, address } = useWallet();
  const { config } = useConfig();
  return (
    <aside className="sticky top-0 hidden h-dvh flex-col border-r border-[var(--t-line)] px-4 pb-5 pt-7 lg:flex">
      <div className="px-2">
        <Logo to="/" size={30} />
      </div>
      <nav aria-label="Main" className="mt-10">
        <ul className="grid grid-cols-1 gap-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  `relative z-0 flex h-12 items-center gap-3 rounded-2xl px-3.5 text-[15px] font-medium transition-colors duration-200 ${isActive ? "text-fg" : "text-fg-3 hover:text-fg-2"}`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span
                        layoutId="side-nav-pill"
                        className="glass absolute inset-0 -z-10 rounded-2xl"
                        transition={{ type: "spring", stiffness: 520, damping: 42 }}
                      />
                    )}
                    <Icon className="size-[19px]" strokeWidth={isActive ? 2 : 1.75} aria-hidden />
                    {label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-9 px-3.5">
        <p className="eyebrow mb-2 !text-[10px]">Open to everyone</p>
        <ul className="grid grid-cols-1 gap-0.5 text-[14px]">
          {[
            { to: "/proof", label: "Proof" },
            { to: "/developers", label: "Developers" },
          ].map((l) => (
            <li key={l.to}>
              <Link to={l.to} className="group flex h-9 items-center gap-1.5 text-fg-3 transition-colors hover:text-fg">
                {l.label}
                <ArrowUpRight className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-auto grid grid-cols-1 gap-3">
        {config && !config.paymentsEnabled && (
          <Badge tone="warn" className="mx-2 w-fit">
            Demo mode
          </Badge>
        )}
        <div className="flex items-center gap-2 rounded-2xl px-2 py-1.5">
          <span className="grid size-9 place-items-center rounded-full bg-[color-mix(in_srgb,var(--t-fg)_6%,transparent)] shadow-[inset_0_0_0_1px_var(--t-line)]">
            <LogoMark size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium text-fg">{status === "ready" ? "Signed in" : "Not set up"}</p>
            <p className="tabular truncate text-[11px] tracking-[0.08em] text-fg-3">
              {address ? cardId(address) : "Get an invite"}
            </p>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}

function AllowanceMini() {
  const pool = usePool();
  const { phpPerUsd } = useConfig();
  const now = useNow(1000);
  const data = pool.data;
  if (!pool.enabled) return null;
  if (!data) {
    return (
      <div className="glass relative rounded-[22px] p-5">
        <div className="skeleton-line h-3 w-24" />
        <div className="skeleton-line mt-3 h-6 w-36" />
      </div>
    );
  }
  if (!data.enrolled) return null;
  const next = data.nextClaimAt ? new Date(data.nextClaimAt).getTime() : null;
  const ready = data.canClaim || (next !== null && next <= now);
  return (
    <div className="glass relative rounded-[22px] p-5">
      <p className="eyebrow">Scholarship allowance</p>
      <p className="mt-2 flex items-end font-display text-[30px] leading-none text-fg">
        <DisplayPeso text={php(data.allowanceUsdc, phpPerUsd)} />
        <span className="mb-[0.18em] ml-1.5 font-sans text-[13px] text-fg-3">/ week</span>
      </p>
      {ready ? (
        <LinkButton to="/wallet" variant="metal" size="sm" className="mt-4 w-full">
          Claim {php(data.allowanceUsdc, phpPerUsd)}
        </LinkButton>
      ) : (
        <p className="mt-3 text-[13.5px] text-fg-2">
          Next one in <span className="tabular font-medium text-fg">{next ? countdown(next - now) : "a few days"}</span>
        </p>
      )}
    </div>
  );
}

function RightRail() {
  const { status, address, createdAt, balance, balancePhp, questionsLeft } = useWallet();
  const items = useActivity();
  if (status === "none") {
    return (
      <aside className="sticky top-0 hidden h-dvh overflow-y-auto border-l border-[var(--t-line)] p-6 lg:block">
        <div className="glass relative rounded-[24px] p-6">
          <p className="eyebrow">Get started</p>
          <p className="mt-3 font-display text-[28px] leading-[1.05] text-fg">
            Your first questions are <span className="em-metal">on the house.</span>
          </p>
          <p className="mt-3 text-[14px] leading-relaxed text-fg-2">
            Enter the invite code from your school or org to get your weekly allowance.
          </p>
          <LinkButton to="/start" variant="metal" className="mt-5 w-full">
            I have an invite code
          </LinkButton>
        </div>
      </aside>
    );
  }
  return (
    <aside className="sticky top-0 hidden h-dvh overflow-y-auto border-l border-[var(--t-line)] p-6 lg:block">
      <div className="grid grid-cols-1 gap-4">
        <Link to="/wallet" className="block rounded-[26px] transition-transform duration-300 ease-[var(--ease-silk)] hover:-translate-y-0.5">
          <MetalCard
            compact
            balancePhp={balancePhp}
            questionsLeft={questionsLeft}
            address={address}
            since={createdAt}
            loading={status !== "ready" || balance === null}
          />
        </Link>
        <AllowanceMini />
        <section className="glass relative rounded-[22px] p-4 pt-5">
          <div className="mb-2 flex items-center justify-between px-2">
            <p className="eyebrow">Recent activity</p>
            <Link to="/wallet" className="text-[12.5px] text-fg-3 hover:text-fg">
              See all
            </Link>
          </div>
          {items.length === 0 ? (
            <p className="px-2 pb-3 pt-1 text-[13.5px] leading-relaxed text-fg-3">
              Questions and allowances will show up here, each with its receipt.
            </p>
          ) : (
            <ActivityList items={items} limit={5} dense />
          )}
        </section>
        <Link to="/proof" className="flex items-center justify-between rounded-2xl px-3 py-2 text-[12.5px] text-fg-3 hover:text-fg">
          Every payment has a public receipt
          <ArrowUpRight className="size-3.5" aria-hidden />
        </Link>
      </div>
    </aside>
  );
}

// ─── layouts ──────────────────────────────────────────────────────────────────

const WITH_RAIL = new Set(["/ask", "/receipts", "/settings"]);

export function AppLayout() {
  const { pathname } = useLocation();
  const rail = WITH_RAIL.has(pathname);
  return (
    <div
      className={`min-h-dvh lg:grid ${rail ? "lg:grid-cols-[232px_minmax(0,1fr)_300px] xl:grid-cols-[264px_minmax(0,1fr)_360px]" : "lg:grid-cols-[232px_minmax(0,1fr)] xl:grid-cols-[264px_minmax(0,1fr)]"}`}
    >
      <SideNav />
      <div className="min-w-0">
        <MobileHeader />
        <main id="main" className="px-4 pb-[calc(96px+env(safe-area-inset-bottom))] pt-4 sm:px-6 lg:px-10 lg:pb-10 lg:pt-8">
          <StatusBanner app />
          <Outlet />
        </main>
      </div>
      {rail && <RightRail />}
      <BottomNav />
    </div>
  );
}

export function PublicHeader() {
  const { status } = useWallet();
  return (
    <div className="pt-safe sticky top-0 z-40 px-3 before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-[92px] before:bg-[linear-gradient(180deg,var(--t-bg)_30%,transparent)] before:content-[''] sm:px-6">
      <header className="glass-float relative mx-auto mt-2 flex h-14 max-w-6xl items-center justify-between rounded-full pl-3 pr-2 sm:mt-4 sm:h-16 sm:pl-4">
        <Logo size={30} />
        <nav aria-label="Site" className="flex items-center gap-1">
          <Link to="/proof" className="hidden h-10 items-center rounded-full px-4 text-[14px] text-fg-2 transition-colors hover:text-fg sm:inline-flex">
            Proof
          </Link>
          <Link to="/developers" className="hidden h-10 items-center rounded-full px-4 text-[14px] text-fg-2 transition-colors hover:text-fg sm:inline-flex">
            Developers
          </Link>
          <ThemeToggle className="hidden sm:grid" />
          <Link to={status === "ready" ? "/ask" : "/start"} className={buttonClass("glass", "sm", "ml-1")}>
            {status === "ready" ? "Open app" : "Get started"}
          </Link>
        </nav>
      </header>
    </div>
  );
}

export function PublicFooter() {
  return (
    <footer className="mx-auto mt-24 max-w-6xl px-5 pb-12 sm:px-8">
      <div className="h-px bg-[linear-gradient(90deg,transparent,var(--t-line-strong),transparent)]" />
      <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <LogoMark size={26} />
          <p className="text-[13.5px] text-fg-3">Made for Filipino students. Bayad per tanong, not per month.</p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-[13.5px] text-fg-3">
          <Link to="/proof" className="hover:text-fg">
            Every payment, publicly verifiable
          </Link>
          <Link to="/developers" className="hover:text-fg">
            For developers and AI agents
          </Link>
          <Link to="/settings" className="hover:text-fg">
            Settings
          </Link>
        </nav>
      </div>
    </footer>
  );
}

export function PublicLayout() {
  const { pathname } = useLocation();
  // The landing hero runs under the floating nav; every other public page starts below it.
  const underNav = pathname === "/";
  return (
    <div className="min-h-dvh">
      <SiteNav />
      <main id="main" className={underNav ? "px-0" : "px-0 pt-24 sm:pt-28"}>
        <div className={`mx-auto max-w-6xl px-5 sm:px-8 ${underNav ? "absolute inset-x-0 top-24 z-40" : "pt-4"}`}>
          <StatusBanner />
        </div>
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  );
}
