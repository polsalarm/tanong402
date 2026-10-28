import { ArrowRight, Check, KeyRound, Minus, ShieldCheck, Sparkles, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { Page } from "../../components/Page";
import { Button, LinkButton, Spinner } from "../../components/ui";
import { useConfig } from "../../contexts/ConfigContext";
import { useWallet } from "../../contexts/WalletContext";
import { activity } from "../../lib/activity";
import { api, errorMessage, isApiError } from "../../lib/api";
import { php, questionsLabel, questionsLeftFor } from "../../lib/format";
import { MOCK_API } from "../../lib/env";
import { loadKit } from "../../lib/kit";
import { FreighterPanel } from "./FreighterPanel";

type StepId = "account" | "secure" | "pool" | "allowance";
type StepState = "pending" | "active" | "done" | "skipped" | "error";
const EASE = [0.16, 1, 0.3, 1] as const;
const ORDER: StepId[] = ["account", "secure", "pool", "allowance"];
const minDelay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function StepIcon({ state }: { state: StepState }) {
  const reduce = useReducedMotion();
  return (
    <span className="relative grid size-10 shrink-0 place-items-center">
      <AnimatePresence mode="wait" initial={false}>
        {state === "done" ? (
          <motion.span
            key="done"
            initial={{ scale: reduce ? 1 : 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 24 }}
            className="metal-fill grid size-9 place-items-center rounded-full"
          >
            <Check className="size-[18px]" strokeWidth={2.6} aria-hidden />
          </motion.span>
        ) : state === "active" ? (
          <motion.span key="active" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid size-9 place-items-center">
            <span className="absolute inset-0.5 rounded-full shadow-[inset_0_0_0_1px_var(--t-line-strong)]" />
            <Spinner className="size-[22px] !text-fg" />
          </motion.span>
        ) : state === "error" ? (
          <motion.span key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid size-9 place-items-center rounded-full bg-[color-mix(in_srgb,var(--t-danger)_12%,transparent)] text-danger">
            <X className="size-4" aria-hidden />
          </motion.span>
        ) : state === "skipped" ? (
          <motion.span key="skipped" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid size-9 place-items-center rounded-full text-fg-3 shadow-[inset_0_0_0_1px_var(--t-line)]">
            <Minus className="size-4" aria-hidden />
          </motion.span>
        ) : (
          <motion.span key="pending" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="size-9 rounded-full shadow-[inset_0_0_0_1px_var(--t-line-strong)]" />
        )}
      </AnimatePresence>
    </span>
  );
}

export default function Start() {
  const { config, phpPerUsd, priceUsdc } = useConfig();
  const wallet = useWallet();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [stage, setStage] = useState<"code" | "creating" | "done">("code");
  const [steps, setSteps] = useState<Record<StepId, StepState>>({
    account: "pending",
    secure: "pending",
    pool: "pending",
    allowance: "pending",
  });
  const [note, setNote] = useState<string | null>(null);
  const [fatal, setFatal] = useState<string | null>(null);
  const [claimed, setClaimed] = useState<string | null>(null);

  const freighter = wallet.kind === "freighter";
  const allowancePhp = php(0.25, phpPerUsd);
  const labels: Record<StepId, { title: string; detail: string }> = freighter
    ? {
        account: { title: "Connecting your Freighter account", detail: "Your keys stay in Freighter" },
        secure: { title: "Approving the setup in Freighter", detail: "Tanong402 covers the account reserve" },
        pool: { title: "Joining the Scholarship Pool", detail: "Sponsors fund your weekly allowance" },
        allowance: { title: "Adding your first allowance", detail: "Freighter asks you to approve the claim" },
      }
    : {
        account: { title: "Making your account", detail: "No email, no password, no card" },
        secure: { title: "Securing it on this phone", detail: "Encrypted with a key only this phone holds" },
        pool: { title: "Joining the Scholarship Pool", detail: "Sponsors fund your weekly allowance" },
        allowance: { title: `Adding your first allowance: ${claimed ?? allowancePhp}`, detail: "Ready to spend on questions" },
      };

  const set = (id: StepId, state: StepState) => setSteps((s) => ({ ...s, [id]: state }));
  const skipRest = (from: StepId) =>
    setSteps((s) => {
      const next = { ...s };
      for (const id of ORDER.slice(ORDER.indexOf(from))) if (next[id] !== "done") next[id] = "skipped";
      return next;
    });

  const run = async (inviteCode: string) => {
    if (!config) return;
    setStage("creating");
    setFatal(null);
    setNote(null);
    setSteps({ account: "pending", secure: "pending", pool: "pending", allowance: "pending" });
    const network = config.network;
    let current: StepId = "account";
    try {
      // 1 — account
      set("account", "active");
      const address = freighter && wallet.address ? wallet.address : await wallet.create();
      await minDelay(700);
      set("account", "done");

      // 2 — prepare + sign the sponsored setup
      current = "secure";
      set("secure", "active");
      const kit = await loadKit();
      let prepared: { xdr: string } | null = null;
      let alreadySetUp = false;
      try {
        prepared = await api.onboard(address, inviteCode);
      } catch (err) {
        if (isApiError(err) && (err.code === "INVITE_INVALID" || (err.code === "INVALID_INPUT" && /invite/i.test(err.message)))) {
          setStage("code");
          setCodeError(err.code === "INVITE_INVALID" ? "That invite code isn't valid or was already used." : errorMessage(err));
          return;
        }
        if (isApiError(err) && err.code === "NOT_CONFIGURED") {
          await minDelay(500);
          set("secure", freighter ? "skipped" : "done");
          skipRest("pool");
          setNote("Your account is ready. Allowances aren't switched on yet, so you'll get yours as soon as they are.");
          setStage("done");
          return;
        }
        if (isApiError(err) && err.code === "INVALID_INPUT" && /already set up/i.test(err.message)) alreadySetUp = true;
        else throw err;
      }
      if (prepared) {
        const signed = await wallet.withSigner((s) => kit.signOnboarding(s, prepared!.xdr, network));
        set("secure", "done");
        current = "pool";
        set("pool", "active");
        await api.onboardSubmit(address, signed);
        set("pool", "done");
      } else if (alreadySetUp) {
        set("secure", "done");
        set("pool", "done");
      }

      // 4 — first allowance (never fatal)
      current = "allowance";
      set("allowance", "active");
      try {
        const p = await api.claimPrepare(address);
        const signedClaim = await wallet.withSigner((s) => kit.signClaim(s, p.xdr, network, config.poolContractId));
        const out = await api.claimSubmit(address, signedClaim);
        const amount = out.amountUsdc ?? p.allowanceUsdc;
        activity.add({
          id: out.txHash,
          kind: "claim",
          amountUsdc: amount,
          title: "Scholarship allowance",
          at: new Date().toISOString(),
          txHash: out.txHash,
          network,
        });
        wallet.nudgeBalance(Number(amount));
        setClaimed(php(amount, phpPerUsd));
        set("allowance", "done");
      } catch (err) {
        set("allowance", "skipped");
        const code = isApiError(err) ? err.code : null;
        setNote(
          code === "CLAIM_TOO_EARLY"
            ? "You already claimed this week's allowance. The next one shows up in Wallet."
            : code === "POOL_EMPTY"
              ? "The Scholarship Pool is being topped up. Claim your allowance from Wallet soon."
              : code === "DECLINED" || (err instanceof Error && err.name === "SignatureDeclinedError")
                ? "You skipped the allowance claim. You can claim it any time from Wallet."
                : "Your account is ready. Claim your first allowance from Wallet.",
        );
      }
      setStage("done");
    } catch (err) {
      set(current, "error");
      const declined = err instanceof Error && err.name === "SignatureDeclinedError";
      const unsafe = err instanceof Error && err.name === "UnsafeRequestError";
      setFatal(
        declined
          ? "You cancelled the approval, so nothing changed. Try again when you're ready."
          : unsafe
            ? "The setup request looked unusual, so we stopped before signing anything."
            : errorMessage(err),
      );
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    if (clean.length < 4) {
      setCodeError("Enter the code from your school, org or sponsor.");
      return;
    }
    setCodeError(null);
    void run(clean);
  };

  const welcomeBalance = questionsLeftFor(0.25, priceUsdc);

  return (
    <Page className="mx-auto max-w-5xl">
      <AnimatePresence mode="wait">
        {stage === "code" ? (
          <motion.div
            key="code"
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 gap-10 pt-4 lg:grid-cols-[1fr_440px] lg:gap-16 lg:pt-14"
          >
            <div className="lg:pt-6">
              <p className="eyebrow">Welcome</p>
              <h1 className="mt-4 font-display text-display-lg tracking-[-0.025em] text-fg">
                Let's get you <span className="em-metal">asking.</span>
              </h1>
              <p className="mt-4 max-w-md text-[16.5px] leading-relaxed text-fg-2">
                Your invite comes with a weekly allowance from the Scholarship Pool, about{" "}
                <span className="text-fg">{questionsLabel(welcomeBalance).replace(" left", "")}</span> a week. Setup takes
                ten seconds.
              </p>
              <ul className="mt-8 hidden gap-4 text-[14.5px] text-fg-2 lg:grid">
                {[
                  { icon: KeyRound, t: "No email, no password. Your account lives on this phone." },
                  { icon: ShieldCheck, t: "Nothing is ever charged without a receipt." },
                  { icon: Sparkles, t: "Back it up anytime from Settings." },
                ].map(({ icon: Icon, t }) => (
                  <li key={t} className="flex items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[color-mix(in_srgb,var(--t-fg)_6%,transparent)] shadow-[inset_0_0_0_1px_var(--t-line)]">
                      <Icon className="size-4" aria-hidden />
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <form onSubmit={submit} className="glass relative rounded-[28px] p-6 sm:p-7" noValidate>
                <label htmlFor="invite" className="text-[17px] font-medium text-fg">
                  Got an invite code?
                </label>
                <p className="mt-1 text-[14px] text-fg-2">From your school, org or a sponsor.</p>
                <input
                  ref={inputRef}
                  id="invite"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 16));
                    setCodeError(null);
                  }}
                  autoComplete="one-time-code"
                  autoCapitalize="characters"
                  spellCheck={false}
                  inputMode="text"
                  placeholder="FEU-7Q2K"
                  aria-invalid={codeError ? true : undefined}
                  aria-describedby={codeError ? "invite-error" : undefined}
                  className={`mt-5 h-16 w-full rounded-2xl bg-[color-mix(in_srgb,var(--t-surface-2)_70%,transparent)] px-5 text-center font-mono text-[24px] uppercase tracking-[0.28em] text-fg outline-none transition-shadow duration-200 placeholder:text-fg-4 focus:shadow-[inset_0_0_0_1px_var(--t-accent),0_0_0_4px_color-mix(in_srgb,var(--t-accent)_16%,transparent)] ${codeError ? "shadow-[inset_0_0_0_1px_var(--t-danger)]" : "shadow-[inset_0_0_0_1px_var(--t-line-strong)]"}`}
                />
                <AnimatePresence>
                  {codeError && (
                    <motion.p
                      id="invite-error"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-2.5 text-[13.5px] text-danger"
                      role="alert"
                    >
                      {codeError}
                    </motion.p>
                  )}
                </AnimatePresence>
                <Button type="submit" variant="metal" size="lg" className="mt-5 w-full" disabled={!config}>
                  Continue
                  <ArrowRight className="size-[18px]" aria-hidden />
                </Button>
                {MOCK_API && (
                  <Button
                    type="button"
                    variant="glass"
                    size="lg"
                    className="mt-3 w-full"
                    disabled={!config}
                    onClick={() => {
                      setCode("DEMO-2026");
                      void run("DEMO-2026");
                    }}
                  >
                    Skip, use a demo code
                  </Button>
                )}
                <p className="mt-4 text-center text-[13px] text-fg-3">
                  Moving from another phone?{" "}
                  <Link to="/settings?restore=1" className="text-fg-2 underline decoration-[var(--t-line-strong)] underline-offset-[3px] hover:text-fg">
                    Restore your backup
                  </Link>
                </p>
              </form>

              <div className="flex items-center gap-4 px-2" aria-hidden>
                <span className="h-px flex-1 bg-[var(--t-line)]" />
                <span className="eyebrow !text-[10px]">or</span>
                <span className="h-px flex-1 bg-[var(--t-line)]" />
              </div>

              <FreighterPanel onUseInvite={() => inputRef.current?.focus()} />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="creating"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="mx-auto max-w-[480px] pt-6 lg:pt-16"
          >
            <div className="glass relative overflow-hidden rounded-[30px] p-6 sm:p-8">
              {stage === "done" && (
                <motion.div
                  aria-hidden
                  initial={{ x: "-120%" }}
                  animate={{ x: "220%" }}
                  transition={{ duration: 1.6, ease: EASE, delay: 0.1 }}
                  className="pointer-events-none absolute inset-y-0 left-0 w-1/2 -skew-x-12 bg-[linear-gradient(90deg,transparent,color-mix(in_srgb,var(--t-sheen)_35%,transparent),transparent)]"
                />
              )}
              <p className="eyebrow">{stage === "done" ? "All set" : "Setting things up"}</p>
              <h1 className="mt-3 font-display text-[40px] leading-[1.02] tracking-[-0.02em] text-fg">
                {stage === "done" ? (
                  <>
                    You're <span className="em-metal">in.</span>
                  </>
                ) : (
                  "One moment…"
                )}
              </h1>
              <ol className="mt-7 grid grid-cols-1 gap-1" aria-live="polite">
                {ORDER.map((id) => {
                  const st = steps[id];
                  return (
                    <li key={id} className="flex items-center gap-3.5 py-2">
                      <StepIcon state={st} />
                      <div className="min-w-0">
                        <p
                          className={`text-[15.5px] font-medium leading-snug ${st === "active" ? "text-shimmer" : st === "pending" || st === "skipped" ? "text-fg-3" : st === "error" ? "text-danger" : "text-fg"}`}
                        >
                          {labels[id].title}
                        </p>
                        <p className="mt-0.5 text-[13px] text-fg-3">{st === "skipped" ? "Skipped for now" : labels[id].detail}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>

              {fatal && (
                <div className="mt-6 rounded-2xl bg-[color-mix(in_srgb,var(--t-danger)_8%,transparent)] p-4 text-[14px] text-fg-2 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--t-danger)_22%,transparent)]" role="alert">
                  <p className="font-medium text-fg">That didn't finish.</p>
                  <p className="mt-1">{fatal}</p>
                  <div className="mt-3 flex gap-2">
                    <Button variant="glass" size="sm" onClick={() => void run(code.trim().toUpperCase())}>
                      Try again
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setStage("code")}>
                      Change code
                    </Button>
                  </div>
                </div>
              )}

              {stage === "done" && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.6, ease: EASE }}>
                  {note && <p className="mt-5 text-[14px] leading-relaxed text-fg-2">{note}</p>}
                  <Button variant="metal" size="lg" className="mt-7 w-full" onClick={() => navigate("/ask")}>
                    Start asking
                    <ArrowRight className="size-[18px]" aria-hidden />
                  </Button>
                  <LinkButton to="/settings" variant="ghost" size="sm" className="mt-2 w-full">
                    Back up this account
                  </LinkButton>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Page>
  );
}
