import { ArrowRight, ArrowUpRight, CircleAlert, Plug, RefreshCw } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { BigMoney } from "../../components/Money";
import { Button, LinkButton, Spinner } from "../../components/ui";
import { useConfig } from "../../contexts/ConfigContext";
import { useToast } from "../../contexts/ToastContext";
import { useWallet } from "../../contexts/WalletContext";
import { transport } from "../../lib/api";
import { questionsLabel, shortHash } from "../../lib/format";
import { FREIGHTER_INSTALL_URL, FreighterError, networkLabel } from "../../lib/freighter";
import { loadKit } from "../../lib/kit";

type Problem = { code: FreighterError["code"] | "trustline"; message: string } | null;

/**
 * "Connect with Freighter" on /start. Crypto words are allowed here (connect screen), so this panel
 * speaks plainly about Testnet and trustlines.
 */
export function FreighterPanel({ onUseInvite }: { onUseInvite: () => void }) {
  const { config } = useConfig();
  const { toast } = useToast();
  const wallet = useWallet();
  const [busy, setBusy] = useState<"connect" | "trustline" | "recheck" | null>(null);
  const [problem, setProblem] = useState<Problem>(null);
  const net = config ? networkLabel(config.network) : "Testnet";
  const connected = wallet.kind === "freighter" && wallet.address;

  const connect = async () => {
    setBusy("connect");
    setProblem(null);
    try {
      await wallet.connectFreighter();
    } catch (err) {
      const e = err instanceof FreighterError ? err : new FreighterError("failed", "Couldn't connect to Freighter.");
      setProblem({ code: e.code, message: e.message });
    } finally {
      setBusy(null);
    }
  };

  const recheck = async () => {
    setBusy("recheck");
    try {
      await wallet.recheckFreighter();
      await wallet.refreshBalance();
    } finally {
      setBusy(null);
    }
  };

  const addTrustline = async () => {
    if (!config || !wallet.address) return;
    setBusy("trustline");
    setProblem(null);
    try {
      const kit = await loadKit();
      const fetchImpl = await transport();
      const xdr = await kit.buildTrustlineTx(wallet.address, config.horizonUrl, config.network, fetchImpl);
      const signed = await wallet.withSigner((s) => kit.signTrustline(s, xdr, config.network));
      const hash = await kit.submitToHorizon(signed, config.horizonUrl, fetchImpl);
      toast({ title: "USDC trustline added", description: `Transaction ${shortHash(hash)}`, tone: "success" });
      await wallet.refreshBalance();
    } catch (err) {
      const kit = await loadKit();
      const message =
        err instanceof kit.SignatureDeclinedError
          ? "You cancelled it in Freighter. Nothing was sent."
          : err instanceof kit.UnsafeRequestError
            ? "That transaction didn't look right, so we stopped before signing."
            : err instanceof Error
              ? err.message
              : "Couldn't add the trustline.";
      setProblem({ code: "trustline", message });
    } finally {
      setBusy(null);
    }
  };

  const b = wallet.balance;
  const issue = connected && wallet.freighterIssue === "wrong_network";

  return (
    <section className="glass relative rounded-[28px] p-6 sm:p-7" aria-labelledby="freighter-title">
      <div className="flex items-start gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[color-mix(in_srgb,var(--t-fg)_6%,transparent)] text-fg shadow-[inset_0_0_0_1px_var(--t-line-strong)]">
          <Plug className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="freighter-title" className="text-[17px] font-medium text-fg">
            {connected ? "Connected with Freighter" : "Already use Freighter?"}
          </h2>
          <p className="mt-1 text-[14px] leading-relaxed text-fg-2">
            {connected ? (
              <span className="tabular font-mono text-[13px] text-fg-2">{shortHash(wallet.address!, 6, 6)}</span>
            ) : (
              <>Sign in with your Freighter browser wallet on {net}. Your keys stay in Freighter; it asks before every signature.</>
            )}
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={`${connected ? "c" : "n"}-${issue ? "i" : ""}-${b ? `${b.exists}${b.hasTrustline}` : "x"}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="mt-5"
        >
          {!connected && (
            <Button variant="outline" className="w-full" onClick={connect} loading={busy === "connect"}>
              {busy !== "connect" && <Plug className="size-4" aria-hidden />}
              Connect with Freighter
            </Button>
          )}

          {connected && issue && (
            <Notice
              title={`Switch Freighter to ${net}`}
              body={`Open Freighter, tap the network name at the top and choose ${net}. Then check again.`}
              action={
                <Button variant="glass" size="sm" onClick={recheck} loading={busy === "recheck"}>
                  {busy !== "recheck" && <RefreshCw className="size-3.5" aria-hidden />}
                  Check again
                </Button>
              }
            />
          )}

          {connected && !issue && !b && (
            <p className="flex items-center gap-2.5 text-[14px] text-fg-2">
              <Spinner className="size-4" /> Checking your {net} account…
            </p>
          )}

          {connected && !issue && b && !b.exists && (
            <div className="grid grid-cols-1 gap-3">
              <p className="text-[14px] leading-relaxed text-fg-2">
                This account isn't on {net} yet. Use an invite code and Tanong402 sets it up for you (Freighter will ask
                you to approve), or fund it yourself with Friendbot.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="metal" size="sm" onClick={onUseInvite}>
                  Use an invite code
                </Button>
                {config?.network === "stellar:testnet" && (
                  <a
                    href={`https://friendbot.stellar.org/?addr=${wallet.address}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[14px] text-fg-2 shadow-[inset_0_0_0_1px_var(--t-line-strong)] hover:text-fg"
                  >
                    Friendbot <ArrowUpRight className="size-3.5" aria-hidden />
                  </a>
                )}
                <Button variant="ghost" size="sm" onClick={recheck} loading={busy === "recheck"}>
                  Check again
                </Button>
              </div>
            </div>
          )}

          {connected && !issue && b?.exists && !b.hasTrustline && (
            <div className="grid grid-cols-1 gap-3">
              <p className="text-[14px] leading-relaxed text-fg-2">
                Your account can't hold USDC yet. Add the USDC trustline once (one transaction, a tiny XLM fee) and
                you're ready.
              </p>
              <Button variant="metal" onClick={addTrustline} loading={busy === "trustline"}>
                Add USDC trustline
              </Button>
            </div>
          )}

          {connected && !issue && b?.exists && b.hasTrustline && (
            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-end justify-between gap-3 rounded-2xl bg-[color-mix(in_srgb,var(--t-fg)_4%,transparent)] px-4 py-3.5 shadow-[inset_0_0_0_1px_var(--t-line)]">
                <div>
                  <p className="eyebrow !text-[10px]">Ready to ask</p>
                  <BigMoney value={wallet.balancePhp} className="mt-1.5 text-[34px]" />
                </div>
                <p className="pb-1 text-[13.5px] text-fg-2">{questionsLabel(wallet.questionsLeft)}</p>
              </div>
              {wallet.questionsLeft === 0 && config?.network === "stellar:testnet" && (
                <p className="text-[13.5px] leading-relaxed text-fg-3">
                  No testnet USDC yet. Get some from{" "}
                  <a className="text-accent underline underline-offset-[3px]" href="https://faucet.circle.com/" target="_blank" rel="noreferrer">
                    Circle's faucet
                  </a>{" "}
                  (choose Stellar Testnet), then check again.
                </p>
              )}
              <LinkButton to="/ask" variant="metal">
                Start asking <ArrowRight className="size-[18px]" aria-hidden />
              </LinkButton>
            </div>
          )}

          {problem && (
            <div className="mt-4">
              <Notice
                title={problem.code === "wrong_network" ? problem.message : problem.code === "not_installed" ? "Freighter isn't installed" : "That didn't work"}
                body={
                  problem.code === "wrong_network"
                    ? `Open Freighter, switch the network to ${net}, then connect again.`
                    : problem.code === "not_installed"
                      ? "Install the Freighter extension for Chrome, Brave or Firefox, then reload this page."
                      : problem.message
                }
                action={
                  problem.code === "not_installed" ? (
                    <a
                      href={FREIGHTER_INSTALL_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[14px] font-medium text-fg shadow-[inset_0_0_0_1px_var(--t-line-strong)]"
                    >
                      Get Freighter <ArrowUpRight className="size-3.5" aria-hidden />
                    </a>
                  ) : problem.code === "wrong_network" ? (
                    <Button variant="glass" size="sm" onClick={connect} loading={busy === "connect"}>
                      Check again
                    </Button>
                  ) : null
                }
              />
            </div>
          )}

          {connected && (
            <button
              type="button"
              onClick={() => void wallet.disconnectFreighter()}
              className="mt-4 text-[13px] text-fg-3 underline decoration-[var(--t-line-strong)] underline-offset-[3px] hover:text-fg"
            >
              Disconnect Freighter
            </button>
          )}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}

function Notice({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-[color-mix(in_srgb,var(--t-warn)_7%,transparent)] p-4 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--t-warn)_22%,transparent)]">
      <div className="flex gap-3">
        <CircleAlert className="mt-0.5 size-[18px] shrink-0 text-warn" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-[14.5px] font-medium text-fg">{title}</p>
          <p className="mt-1 text-[13.5px] leading-relaxed text-fg-2">{body}</p>
          {action && <div className="mt-3">{action}</div>}
        </div>
      </div>
    </div>
  );
}
