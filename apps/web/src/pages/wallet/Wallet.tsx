import { ArrowRight, Clock, Gift, Smartphone } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useId, useState } from "react";
import { ActivityList } from "../../components/Activity";
import { MetalCard } from "../../components/MetalCard";
import { DisplayPeso } from "../../components/Money";
import { Page, PageHeader } from "../../components/Page";
import { Badge, Button, Card, LinkButton, Row } from "../../components/ui";
import { useConfig } from "../../contexts/ConfigContext";
import { useToast } from "../../contexts/ToastContext";
import { useWallet } from "../../contexts/WalletContext";
import { activity, useActivity } from "../../lib/activity";
import { api, errorMessage, isApiError } from "../../lib/api";
import { countdown, formatDayLabel, php, questionsLeftFor } from "../../lib/format";
import { useNow } from "../../lib/hooks/useNow";
import { usePool } from "../../lib/hooks/usePool";
import { loadKit } from "../../lib/kit";

function Ring({ fraction, label }: { fraction: number; label: string }) {
  const id = useId().replace(/:/g, "");
  const r = 30;
  const c = 2 * Math.PI * r;
  const f = Math.min(1, Math.max(0, fraction));
  return (
    <div className="relative grid size-[76px] shrink-0 place-items-center">
      <svg viewBox="0 0 72 72" className="absolute inset-0 -rotate-90" aria-hidden>
        <defs>
          <linearGradient id={`${id}-g`} x1="0" y1="0" x2="72" y2="72" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="var(--color-silver-50)" />
            <stop offset="0.5" stopColor="var(--color-silver-400)" />
            <stop offset="1" stopColor="var(--color-silver-100)" />
          </linearGradient>
        </defs>
        <circle cx="36" cy="36" r={r} fill="none" stroke="var(--t-line-strong)" strokeWidth="3" />
        <motion.circle
          cx="36"
          cy="36"
          r={r}
          fill="none"
          stroke={`url(#${id}-g)`}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - f) }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <span className="tabular font-medium text-[12px] text-fg">{label}</span>
    </div>
  );
}

function initials(name: string) {
  const words = name.trim().split(/\s+/);
  return `${words[0]?.[0] ?? ""}${words.length > 1 ? (words[words.length - 1]?.[0] ?? "") : ""}`.toUpperCase();
}

/** Freighter accounts already exist, so they join with a code here instead of the setup flow. */
function JoinPoolForm({ onJoined }: { onJoined: () => void }) {
  const wallet = useWallet();
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 4) {
      setError("Enter the code from your school, org or sponsor.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const token = await wallet.session();
      await api.joinPool(token, code);
      toast({ title: "You're in", description: "Your weekly allowance is ready to claim.", tone: "success" });
      onJoined();
    } catch (err) {
      setError(isApiError(err) && err.code === "DECLINED" ? "Sign-in was cancelled in Freighter." : errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-5" noValidate>
      <label htmlFor="join-code" className="text-[14px] font-medium text-fg">
        Invite code
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id="join-code"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 16));
            setError(null);
          }}
          autoComplete="one-time-code"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="FEU-7Q2K"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "join-error" : undefined}
          className={`h-11 min-w-0 flex-1 rounded-full bg-[color-mix(in_srgb,var(--t-surface-2)_70%,transparent)] px-5 font-mono text-[15px] uppercase tracking-[0.18em] text-fg outline-none placeholder:text-fg-4 focus:shadow-[inset_0_0_0_1px_var(--t-accent)] ${error ? "shadow-[inset_0_0_0_1px_var(--t-danger)]" : "shadow-[inset_0_0_0_1px_var(--t-line-strong)]"}`}
        />
        <Button type="submit" variant="metal" size="sm" loading={busy}>
          Join
        </Button>
      </div>
      {error && (
        <p id="join-error" role="alert" className="mt-2 text-[13.5px] text-danger">
          {error}
        </p>
      )}
      <p className="mt-2 text-[12.5px] text-fg-3">Freighter will ask you to sign in once. Nothing is charged.</p>
    </form>
  );
}

function AllowanceCard() {
  const { config, phpPerUsd, priceUsdc } = useConfig();
  const wallet = useWallet();
  const { toast } = useToast();
  const pool = usePool();
  const now = useNow(1000);
  const reduce = useReducedMotion();
  const [claiming, setClaiming] = useState<null | "prepare" | "sign" | "submit">(null);
  const [celebrate, setCelebrate] = useState(0);

  if (!config?.poolEnabled) {
    return (
      <Card className="p-6">
        <p className="eyebrow">Scholarship allowance</p>
        <p className="mt-3 text-[15px] leading-relaxed text-fg-2">
          Weekly allowances aren't switched on yet. Your balance works as usual.
        </p>
      </Card>
    );
  }

  const data = pool.data;
  if (!data) {
    return (
      <Card className="p-6">
        <div className="skeleton-line h-3 w-32" />
        <div className="skeleton-line mt-4 h-10 w-44" />
        <div className="skeleton-line mt-6 h-12 w-full rounded-full" />
        {pool.error != null && (
          <p className="mt-4 text-[13.5px] text-fg-3">
            {errorMessage(pool.error)}{" "}
            <button type="button" className="text-fg underline underline-offset-[3px]" onClick={pool.reload}>
              Retry
            </button>
          </p>
        )}
      </Card>
    );
  }

  const allowance = php(data.allowanceUsdc, phpPerUsd);
  const perWeekQs = questionsLeftFor(data.allowanceUsdc, priceUsdc);

  if (!data.enrolled) {
    return (
      <Card className="p-6">
        <p className="eyebrow">Scholarship allowance</p>
        <p className="mt-3 font-display text-[30px] leading-tight text-fg">
          <DisplayPeso text={allowance} metal={false} /> <span className="font-sans text-[14px] text-fg-3">a week, for invited students</span>
        </p>
        <p className="mt-2 text-[14.5px] leading-relaxed text-fg-2">
          This account isn't in the Scholarship Pool yet. Ask your school, org or sponsor for an invite code.
        </p>
        {wallet.kind === "local" && (
          <LinkButton to="/start" variant="glass" size="sm" className="mt-5">
            Enter an invite code
          </LinkButton>
        )}
        {wallet.kind === "freighter" && <JoinPoolForm onJoined={pool.reload} />}
      </Card>
    );
  }

  const nextAt = data.nextClaimAt ? new Date(data.nextClaimAt).getTime() : null;
  const ready = data.canClaim || (nextAt !== null && nextAt <= now);
  const periodMs = Math.max(1, data.periodSeconds * 1000);
  const fraction = ready || nextAt === null ? 1 : 1 - (nextAt - now) / periodMs;
  const msLeft = nextAt ? nextAt - now : 0;
  const ringLabel = ready ? "Ready" : msLeft > 86_400_000 ? `${Math.ceil(msLeft / 86_400_000)}d` : countdown(msLeft).split(" ")[0] ?? "";

  const claim = async () => {
    if (!wallet.address) return;
    try {
      setClaiming("prepare");
      const prepared = await api.claimPrepare(wallet.address);
      setClaiming("sign");
      const kit = await loadKit();
      const signed = await wallet.withSigner((s) => kit.signClaim(s, prepared.xdr, config.network, config.poolContractId));
      setClaiming("submit");
      const out = await api.claimSubmit(wallet.address, signed);
      const amount = out.amountUsdc ?? prepared.allowanceUsdc;
      wallet.nudgeBalance(Number(amount));
      activity.add({
        id: out.txHash,
        kind: "claim",
        amountUsdc: amount,
        title: "Scholarship allowance",
        at: new Date().toISOString(),
        txHash: out.txHash,
        network: config.network,
      });
      setCelebrate((n) => n + 1);
      toast({ title: `+${php(amount, phpPerUsd)} added`, description: "Your weekly allowance is in. Happy studying.", tone: "success" });
      pool.reload();
    } catch (err) {
      const name = err instanceof Error ? err.name : "";
      const code = isApiError(err) ? err.code : null;
      toast({
        title:
          name === "SignatureDeclinedError"
            ? "Claim cancelled"
            : code === "CLAIM_TOO_EARLY"
              ? "Not yet"
              : code === "POOL_EMPTY"
                ? "The pool is being topped up"
                : "Couldn't claim right now",
        description:
          name === "SignatureDeclinedError"
            ? "Nothing changed. Claim whenever you're ready."
            : name === "UnsafeRequestError"
              ? "The claim request looked unusual, so we stopped before approving it."
              : errorMessage(err),
        tone: "error",
      });
      pool.reload();
    } finally {
      setClaiming(null);
    }
  };

  return (
    <Card className="relative overflow-hidden p-6 sm:p-7">
      {celebrate > 0 && !reduce && (
        <motion.div
          key={celebrate}
          aria-hidden
          initial={{ x: "-120%", opacity: 1 }}
          animate={{ x: "240%", opacity: 0.9 }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
          className="pointer-events-none absolute inset-y-0 left-0 w-1/2 -skew-x-12 bg-[linear-gradient(90deg,transparent,color-mix(in_srgb,var(--t-sheen)_40%,transparent),transparent)]"
        />
      )}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow">Scholarship allowance</p>
          <p className="mt-3 flex items-end font-display text-[42px] leading-none tracking-[-0.02em] text-fg">
            <DisplayPeso text={allowance} />
            <span className="mb-[0.2em] ml-2 font-sans text-[14px] tracking-normal text-fg-3">every week</span>
          </p>
          <p className="mt-2.5 text-[14px] text-fg-2">About {perWeekQs} questions, funded by sponsors.</p>
        </div>
        <Ring fraction={fraction} label={ringLabel} />
      </div>

      <div className="mt-6">
        {ready ? (
          <Button variant="metal" size="lg" className="w-full" onClick={claim} loading={claiming !== null}>
            {claiming === "sign"
              ? wallet.kind === "freighter"
                ? "Approve in the pop-up…"
                : "Securing…"
              : claiming === "submit"
                ? "Adding to your balance…"
                : claiming === "prepare"
                  ? "Preparing…"
                  : (
                    <>
                      <Gift className="size-[18px]" aria-hidden />
                      Claim {allowance}
                    </>
                  )}
          </Button>
        ) : (
          <div className="flex items-center gap-3 rounded-2xl bg-[color-mix(in_srgb,var(--t-fg)_4%,transparent)] px-4 py-3.5 shadow-[inset_0_0_0_1px_var(--t-line)]">
            <Clock className="size-[18px] shrink-0 text-fg-2" aria-hidden />
            <p className="text-[14.5px] text-fg-2">
              Next allowance in <span className="tabular font-medium text-fg">{countdown(msLeft)}</span>
              {nextAt && <span className="text-fg-3"> · {formatDayLabel(nextAt)}</span>}
            </p>
          </div>
        )}
      </div>

      {data.sponsors.length > 0 && (
        <div className="mt-6 flex items-center gap-3 border-t border-[var(--t-line)] pt-5">
          <div className="flex -space-x-2">
            {data.sponsors.slice(0, 3).map((s) => (
              <span
                key={s.name}
                title={s.name}
                className="metal-fill grid size-8 place-items-center rounded-full text-[10px] font-semibold ring-2 ring-[var(--t-bg)]"
              >
                {initials(s.name)}
              </span>
            ))}
          </div>
          <p className="min-w-0 truncate text-[13.5px] text-fg-3">
            Funded by <span className="text-fg-2">{data.sponsors.map((s) => s.name).join(", ")}</span>
          </p>
        </div>
      )}
    </Card>
  );
}

export default function Wallet() {
  const { config } = useConfig();
  const wallet = useWallet();
  const items = useActivity();

  if (wallet.status === "none" && config?.paymentsEnabled !== false) {
    return (
      <Page className="mx-auto max-w-[560px] pt-8">
        <PageHeader eyebrow="Wallet" title={<>Nothing here <span className="em-metal">yet.</span></>} description="Set up your account with an invite code to get your balance and weekly allowance." />
        <LinkButton to="/start" variant="metal" size="lg" className="mt-8">
          I have an invite code <ArrowRight className="size-[18px]" aria-hidden />
        </LinkButton>
      </Page>
    );
  }

  return (
    <Page className="mx-auto max-w-[1080px]">
      <PageHeader
        eyebrow="Wallet"
        title={<>Your <span className="em-metal">balance</span></>}
        actions={config && !config.paymentsEnabled ? <Badge tone="warn">Demo mode</Badge> : undefined}
      />
      <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-6">
        <div className="grid grid-cols-1 content-start gap-5">
          <MetalCard
            balancePhp={wallet.balancePhp}
            questionsLeft={wallet.questionsLeft}
            address={wallet.address}
            since={wallet.createdAt}
            loading={wallet.status !== "ready" || wallet.balance === null}
          />
          {wallet.balanceError && (
            <p className="px-1 text-[13px] text-fg-3">
              Couldn't refresh your balance.{" "}
              <button type="button" className="text-fg underline underline-offset-[3px]" onClick={() => void wallet.refreshBalance()}>
                Retry
              </button>
            </p>
          )}
          <AllowanceCard />
        </div>
        <div className="grid grid-cols-1 content-start gap-5">
          <Card className="p-4 pt-6 sm:p-5 sm:pt-6">
            <div className="mb-3 flex items-center justify-between px-2">
              <h2 className="font-display text-[26px] leading-none text-fg">Activity</h2>
              <span className="eyebrow !text-[10px]">On this phone</span>
            </div>
            {items.length === 0 ? (
              <p className="px-2 pb-4 pt-2 text-[14.5px] leading-relaxed text-fg-3">
                Your questions and allowances will appear here, each with a receipt you can open.
              </p>
            ) : (
              <ActivityList items={items} limit={30} />
            )}
          </Card>
          <Card className="p-2">
            <Row
              icon={<Smartphone className="size-[18px]" aria-hidden />}
              title="Top up with GCash"
              detail="Coming soon. For now, allowances come from sponsors."
              trailing={<Badge>Soon</Badge>}
              disabled
            />
          </Card>
        </div>
      </div>
    </Page>
  );
}
