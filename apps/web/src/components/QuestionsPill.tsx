import { Link } from "react-router";
import { useConfig } from "../contexts/ConfigContext";
import { useWallet } from "../contexts/WalletContext";
import { useTick } from "./Money";

/** "₱9.60 · 32 left" — the signature balance indicator. Links to Wallet. */
export function QuestionsPill({ className = "" }: { className?: string }) {
  const { status, balance, balancePhp, questionsLeft } = useWallet();
  const { demo } = useConfig();
  const shown = useTick(balancePhp, 0.8);

  if (demo) {
    return (
      <span className={`glass relative inline-flex h-10 items-center gap-2 rounded-full px-3.5 text-[13px] text-fg-2 ${className}`}>
        <span className="size-1.5 rounded-full bg-[var(--t-warn)]" aria-hidden />
        Demo mode · free
      </span>
    );
  }
  if (status !== "ready") return null;

  const low = balance !== null && questionsLeft <= 5;
  return (
    <Link
      to="/wallet"
      aria-label={`Balance ₱${balancePhp.toFixed(2)}, ${questionsLeft} questions left`}
      className={`glass relative inline-flex h-10 items-center gap-2.5 rounded-full pl-3.5 pr-3.5 text-[13.5px] transition-transform duration-200 active:scale-[0.97] ${className}`}
    >
      {balance === null ? (
        <span className="skeleton-line h-2.5 w-20" />
      ) : (
        <>
          <span className="tabular font-semibold text-fg">₱{shown.toFixed(2)}</span>
          <span aria-hidden className="h-3.5 w-px bg-[var(--t-line-strong)]" />
          <span className={`tabular ${low ? "text-warn" : "text-fg-2"}`}>
            {questionsLeft.toLocaleString("en-PH")} left
          </span>
        </>
      )}
    </Link>
  );
}
