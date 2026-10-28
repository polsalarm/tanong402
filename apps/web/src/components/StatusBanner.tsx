import { CircleAlert, RefreshCw, WifiOff } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Link } from "react-router";
import { useConfig } from "../contexts/ConfigContext";
import { useWallet } from "../contexts/WalletContext";

/** Slim, calm banner for "API unreachable" / "you're offline" / "signing paused". Never blocks. */
export function StatusBanner({ app = false }: { app?: boolean }) {
  const { status, error, retryIn, retry, online } = useConfig();
  const { kind, freighterIssue } = useWallet();

  let content: React.ReactNode = null;
  if (!online) {
    content = (
      <>
        <WifiOff className="size-4 shrink-0 text-warn" aria-hidden />
        <span>You're offline. Your chat and receipts stay on this phone.</span>
      </>
    );
  } else if (status === "error" || (error && status !== "loading")) {
    content = (
      <>
        <CircleAlert className="size-4 shrink-0 text-warn" aria-hidden />
        <span className="min-w-0 flex-1">
          Can't reach Tanong402 right now.
          {retryIn !== null && <span className="text-fg-3"> Retrying in {retryIn}s.</span>}
        </span>
        <button
          type="button"
          onClick={retry}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-fg shadow-[inset_0_0_0_1px_var(--t-line-strong)] hover:bg-[color-mix(in_srgb,var(--t-fg)_6%,transparent)]"
        >
          <RefreshCw className="size-3.5" aria-hidden />
          Retry
        </button>
      </>
    );
  } else if (app && kind === "freighter" && freighterIssue) {
    content = (
      <>
        <CircleAlert className="size-4 shrink-0 text-warn" aria-hidden />
        <span className="min-w-0 flex-1">Payments are paused until your sign-in is fixed.</span>
        <Link to="/settings" className="shrink-0 text-[13px] font-medium text-accent underline underline-offset-[3px]">
          Fix in Settings
        </Link>
      </>
    );
  }

  return (
    <AnimatePresence initial={false}>
      {content && (
        <motion.div
          initial={{ opacity: 0, y: -8, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -8, height: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden"
          role="status"
        >
          <div className="glass relative mx-auto mb-4 flex max-w-3xl items-center gap-3 rounded-2xl px-4 py-2.5 text-[14px] text-fg-2">
            {content}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
