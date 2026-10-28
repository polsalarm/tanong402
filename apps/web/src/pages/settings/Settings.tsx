import { explorerAccountUrl, explorerContractUrl } from "@tanong/shared";
import {
  ArrowUpRight,
  ChevronDown,
  Copy,
  Download,
  Eye,
  EyeOff,
  Monitor,
  Moon,
  Plug,
  RefreshCw,
  ShieldCheck,
  Sun,
  Trash,
  Upload,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Page, PageHeader } from "../../components/Page";
import { Sheet } from "../../components/Sheet";
import { Badge, Button, Card, Field, Row, Segmented } from "../../components/ui";
import { useConfig } from "../../contexts/ConfigContext";
import { useTheme, type ThemePref } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import { useWallet } from "../../contexts/WalletContext";
import { activity } from "../../lib/activity";
import { api, errorMessage } from "../../lib/api";
import { chat } from "../../lib/chat";
import { TutorSettings } from "./TutorSettings";
import { copyText } from "../../lib/clipboard";
import { API_URL, APP_VERSION } from "../../lib/env";
import { cardId, shortHash } from "../../lib/format";
import { FREIGHTER_INSTALL_URL, FreighterError, networkLabel } from "../../lib/freighter";
import { loadKit } from "../../lib/kit";

function Section({ title, description, children, id }: { title: string; description?: ReactNode; children: ReactNode; id?: string }) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="mb-3 px-1">
        <h2 className="font-display text-[26px] leading-none tracking-[-0.01em] text-fg">{title}</h2>
        {description && <p className="mt-2 text-[14px] leading-relaxed text-fg-3">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function download(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function BackupCard() {
  const wallet = useWallet();
  const { toast } = useToast();
  const [pass, setPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [hint, setHint] = useState<{ ok: boolean; hint: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    if (!pass) {
      setHint(null);
      return;
    }
    void loadKit().then((kit) => live && setHint(kit.passphraseStrength(pass)));
    return () => {
      live = false;
    };
  }, [pass]);

  const mismatch = confirm.length > 0 && confirm !== pass;
  const can = Boolean(hint?.ok) && confirm === pass && !busy;

  return (
    <Card className="p-5 sm:p-6">
      <div className="grid grid-cols-1 gap-4">
        <Field
          label="Backup passphrase"
          type={show ? "text" : "password"}
          autoComplete="new-password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          hint={hint ? <span className={hint.ok ? "text-success" : ""}>{hint.hint}</span> : "At least 12 characters. A short sentence works well."}
          trailing={
            <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide passphrase" : "Show passphrase"} className="grid size-10 place-items-center rounded-full text-fg-3 hover:text-fg">
              {show ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
            </button>
          }
        />
        <Field
          label="Type it again"
          type={show ? "text" : "password"}
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={mismatch ? "Those don't match yet." : null}
        />
        <Button
          variant="metal"
          disabled={!can}
          loading={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const file = await wallet.exportBackup(pass);
              const addr = (JSON.parse(file) as { address: string }).address;
              download(`tanong402-backup-${addr.slice(0, 4)}${addr.slice(-4)}.json`, file);
              setPass("");
              setConfirm("");
              toast({ title: "Backup saved", description: "Keep the file and your passphrase somewhere safe.", tone: "success" });
            } catch (err) {
              toast({ title: "Couldn't make the backup", description: err instanceof Error ? err.message : undefined, tone: "error" });
            } finally {
              setBusy(false);
            }
          }}
        >
          {!busy && <Download className="size-[18px]" aria-hidden />}
          Download backup
        </Button>
        <p className="text-[13px] leading-relaxed text-fg-3">
          The file is locked with your passphrase. Without both, nobody (including us) can open it, so don't lose either.
        </p>
      </div>
    </Card>
  );
}

function RestoreCard({ autoFocus }: { autoFocus: boolean }) {
  const wallet = useWallet();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<{ name: string; text: string } | null>(null);
  const [pass, setPass] = useState("");
  const [replace, setReplace] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const needsReplace = wallet.hasLocal;

  useEffect(() => {
    if (autoFocus) fileRef.current?.closest("section")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [autoFocus]);

  return (
    <Card className="p-5 sm:p-6">
      <div className="grid grid-cols-1 gap-4">
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          id="restore-file"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setFile({ name: f.name, text: await f.text() });
            setError(null);
          }}
        />
        <label
          htmlFor="restore-file"
          className="flex min-h-16 cursor-pointer items-center gap-3.5 rounded-2xl px-4 py-3 shadow-[inset_0_0_0_1px_var(--t-line-strong)] transition-colors hover:bg-[color-mix(in_srgb,var(--t-fg)_4%,transparent)]"
        >
          <Upload className="size-[18px] text-fg-2" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] text-fg">{file ? file.name : "Choose your backup file"}</span>
            <span className="block text-[13px] text-fg-3">{file ? "Ready to restore" : "tanong402-backup-….json"}</span>
          </span>
        </label>
        <Field label="Backup passphrase" type="password" autoComplete="current-password" value={pass} onChange={(e) => setPass(e.target.value)} error={error} />
        {needsReplace && (
          <label className="flex items-start gap-3 text-[14px] leading-relaxed text-fg-2">
            <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} className="mt-1 size-[18px] accent-[var(--t-accent)]" />
            This phone already has an account. Replace it with the one in the backup (back that one up first if you still need it).
          </label>
        )}
        <Button
          variant="glass"
          disabled={!file || !pass || busy || (needsReplace && !replace)}
          loading={busy}
          onClick={async () => {
            if (!file) return;
            setBusy(true);
            setError(null);
            try {
              const address = await wallet.restore(file.text, pass, replace);
              toast({ title: "Account restored", description: cardId(address), tone: "success" });
              navigate("/wallet");
            } catch (err) {
              setError(err instanceof Error ? err.message : "Couldn't restore that backup.");
            } finally {
              setBusy(false);
            }
          }}
        >
          Restore account
        </Button>
      </div>
    </Card>
  );
}

function FreighterCard() {
  const wallet = useWallet();
  const { config } = useConfig();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const net = config ? networkLabel(config.network) : "Testnet";
  const connected = wallet.kind === "freighter";

  return (
    <Card className="p-2">
      <Row
        icon={<Plug className="size-[18px]" aria-hidden />}
        title={connected ? "Connected with Freighter" : "Connect with Freighter"}
        detail={
          connected
            ? wallet.freighterIssue === "wrong_network"
              ? `Switch Freighter to ${net} to keep asking.`
              : wallet.freighterIssue === "unavailable"
                ? "Freighter isn't responding. Unlock it, then check again."
                : `${shortHash(wallet.address ?? "", 6, 6)} · ${net}`
            : `Use your Freighter browser wallet on ${net}. Your keys stay in Freighter.`
        }
        trailing={
          connected ? (
            <div className="flex items-center gap-1">
              {wallet.freighterIssue && (
                <Button variant="ghost" size="sm" onClick={() => void wallet.recheckFreighter()} aria-label="Check again">
                  <RefreshCw className="size-4" />
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => void wallet.disconnectFreighter()}>
                Disconnect
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              loading={busy}
              onClick={async () => {
                setBusy(true);
                setProblem(null);
                try {
                  await wallet.connectFreighter();
                  toast({ title: "Freighter connected", tone: "success" });
                } catch (err) {
                  const e = err instanceof FreighterError ? err : null;
                  setProblem(
                    e?.code === "not_installed"
                      ? "not_installed"
                      : e?.code === "wrong_network"
                        ? `Switch Freighter to ${net}, then try again.`
                        : e?.message ?? "Couldn't connect.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              Connect
            </Button>
          )
        }
      />
      {problem && (
        <p className="px-4 pb-3 text-[13.5px] text-warn">
          {problem === "not_installed" ? (
            <>
              Freighter isn't installed.{" "}
              <a className="underline underline-offset-[3px]" href={FREIGHTER_INSTALL_URL} target="_blank" rel="noreferrer">
                Get Freighter
              </a>
            </>
          ) : (
            problem
          )}
        </p>
      )}
      {connected && wallet.hasLocal && (
        <p className="px-4 pb-3 text-[13px] text-fg-3">Disconnecting switches back to the built-in account on this phone.</p>
      )}
    </Card>
  );
}

function AdvancedRow({ label, value, copy, href }: { label: string; value: string; copy?: string; href?: string }) {
  const { toast } = useToast();
  return (
    <div className="flex min-h-14 items-center justify-between gap-4 px-4 py-2.5">
      <span className="text-[14px] text-fg-3">{label}</span>
      <span className="flex min-w-0 items-center gap-1">
        {href ? (
          <a href={href} target="_blank" rel="noreferrer" className="inline-flex min-w-0 items-center gap-1 truncate font-mono text-[13px] text-accent hover:underline">
            <span className="truncate">{value}</span>
            <ArrowUpRight className="size-3.5 shrink-0" aria-hidden />
          </a>
        ) : (
          <span className="truncate font-mono text-[13px] text-fg">{value}</span>
        )}
        {copy && (
          <button
            type="button"
            aria-label={`Copy ${label}`}
            onClick={async () => {
              const ok = await copyText(copy);
              toast({ title: ok ? "Copied" : "Couldn't copy", tone: ok ? "success" : "error" });
            }}
            className="grid size-9 shrink-0 place-items-center rounded-full text-fg-3 hover:text-fg"
          >
            <Copy className="size-3.5" />
          </button>
        )}
      </span>
    </div>
  );
}

function Advanced() {
  const [open, setOpen] = useState(false);
  const { config, priceUsdc, pricePhp } = useConfig();
  const wallet = useWallet();
  const network = config?.network;
  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-16 w-full items-center justify-between gap-3 px-5 text-left"
      >
        <span>
          <span className="block text-[15.5px] font-medium text-fg">Advanced</span>
          <span className="block text-[13.5px] text-fg-3">Account address, network and public records</span>
        </span>
        <ChevronDown className={`size-[18px] text-fg-2 transition-transform duration-300 ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="divide-y divide-[var(--t-line)] border-t border-[var(--t-line)]">
              {wallet.address && <AdvancedRow label="Stellar address" value={shortHash(wallet.address, 6, 6)} copy={wallet.address} />}
              <AdvancedRow
                label="Signs with"
                value={wallet.kind === "freighter" ? "Freighter extension" : wallet.kind === "local" ? "Built-in key (encrypted here)" : "Not set up"}
              />
              {network && <AdvancedRow label="Network" value={network === "stellar:pubnet" ? "Stellar Mainnet" : "Stellar Testnet"} />}
              {network && wallet.address && (
                <AdvancedRow label="Account on Stellar Expert" value="Open" href={explorerAccountUrl(network, wallet.address)} />
              )}
              <AdvancedRow label="Price per question" value={`${priceUsdc} USDC (${pricePhp})`} />
              {network && config?.payTo && (
                <AdvancedRow label="Payments go to" value={shortHash(config.payTo, 6, 6)} href={explorerAccountUrl(network, config.payTo)} />
              )}
              {network && config?.poolContractId && (
                <AdvancedRow label="Scholarship Pool contract" value={shortHash(config.poolContractId, 6, 6)} href={explorerContractUrl(network, config.poolContractId)} />
              )}
              {wallet.balance && <AdvancedRow label="USDC trustline" value={wallet.balance.hasTrustline ? "Active" : "Not added"} />}
              <AdvancedRow label="Server" value={API_URL.replace(/^https?:\/\//, "")} />
              <AdvancedRow label="App version" value={APP_VERSION} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

export default function Settings() {
  const { pref, setPref } = useTheme();
  const wallet = useWallet();
  const { toast } = useToast();
  const [params] = useSearchParams();
  const restoreParam = params.get("restore") === "1";
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmForget, setConfirmForget] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const deleteHistory = async () => {
    setDeleting("Clearing this phone…");
    chat.clear();
    activity.clear();
    let removed = 0;
    let serverNote = "";
    try {
      if (wallet.status === "ready") {
        const token = await wallet.session();
        let cursor: string | null = null;
        for (let page = 0; page < 8; page++) {
          const res = await api.receipts(token, cursor);
          for (const r of res.items) {
            if (r.question) {
              setDeleting(`Deleting question text… ${removed + 1}`);
              await api.deleteReceipt(token, r.id);
              removed++;
            }
          }
          if (!res.nextCursor) break;
          cursor = res.nextCursor;
        }
      }
    } catch (err) {
      serverNote = err instanceof Error && /isn't available/i.test(err.message) ? "" : ` Server copies: ${errorMessage(err)}`;
    }
    setDeleting(null);
    setConfirmDelete(false);
    toast({
      title: "History deleted",
      description: `Chat and activity cleared${removed ? `, ${removed} question${removed === 1 ? "" : "s"} wiped from receipts` : ""}.${serverNote}`,
      tone: "success",
    });
  };

  return (
    <Page className="mx-auto max-w-[680px]">
      <PageHeader eyebrow="Settings" title={<>Make it <span className="em-metal">yours.</span></>} />

      <div className="mt-9 grid grid-cols-1 gap-10">
        <Section title="Appearance">
          <Card className="p-4">
            <Segmented<ThemePref>
              label="Theme"
              layoutId="theme-seg"
              value={pref}
              onChange={setPref}
              options={[
                { value: "midnight", label: "Midnight", icon: <Moon className="size-4" aria-hidden /> },
                { value: "silver", label: "Silver", icon: <Sun className="size-4" aria-hidden /> },
                { value: "system", label: "Auto", icon: <Monitor className="size-4" aria-hidden /> },
              ]}
            />
          </Card>
        </Section>

        <Section title="Tutor" description="Your default model and subject for new questions. The chat box remembers the same choices.">
          <TutorSettings />
        </Section>

        <Section title="Sign-in" description="Your account is your key. There's no email or password to reset, so keep a backup.">
          <div className="grid grid-cols-1 gap-3">
            {wallet.kind === "local" && wallet.address && (
              <Card className="p-2">
                <Row
                  icon={<ShieldCheck className="size-[18px]" aria-hidden />}
                  title="Account on this phone"
                  detail={<span className="tabular font-medium">{cardId(wallet.address)}</span>}
                  trailing={<Badge tone="success">Active</Badge>}
                />
              </Card>
            )}
            <FreighterCard />
          </div>
        </Section>

        {wallet.hasLocal && (
          <Section title="Back up this account" description="Save an encrypted file so you can move to a new phone or recover after clearing your browser.">
            <BackupCard />
          </Section>
        )}

        <Section id="restore" title="Restore on a new phone" description="Bring your account, balance and receipts over from a backup file.">
          <RestoreCard autoFocus={restoreParam} />
        </Section>

        <Section title="Privacy">
          <Card className="p-2">
            <Row
              icon={<Trash className="size-[18px]" aria-hidden />}
              title="Delete my question history"
              detail="Clears chat and activity here and wipes question text from your receipts. Amounts stay."
              onClick={() => setConfirmDelete(true)}
            />
          </Card>
        </Section>

        <Section title="Advanced">
          <Advanced />
        </Section>

        {wallet.hasLocal && (
          <div className="px-1">
            <button
              type="button"
              onClick={() => setConfirmForget(true)}
              className="text-[13.5px] text-fg-3 underline decoration-[var(--t-line-strong)] underline-offset-[3px] hover:text-danger"
            >
              Remove the account from this phone
            </button>
          </div>
        )}
      </div>

      <Sheet open={confirmDelete} onClose={() => !deleting && setConfirmDelete(false)} title="Delete history">
        <p className="font-display text-[30px] leading-tight text-fg">Delete your question history?</p>
        <p className="mt-3 text-[15px] leading-relaxed text-fg-2">
          This clears the chat and activity on this phone and removes the words of your questions from your receipts. The
          receipts themselves (amount, date, public record) stay, so the books still balance.
        </p>
        <div className="mt-6 grid grid-cols-1 gap-2">
          <Button variant="danger" loading={deleting !== null} onClick={() => void deleteHistory()}>
            {deleting ?? "Delete history"}
          </Button>
          <Button variant="ghost" onClick={() => setConfirmDelete(false)} disabled={deleting !== null}>
            Keep it
          </Button>
        </div>
      </Sheet>

      <Sheet open={confirmForget} onClose={() => setConfirmForget(false)} title="Remove account">
        <p className="font-display text-[30px] leading-tight text-fg">Remove the account from this phone?</p>
        <p className="mt-3 text-[15px] leading-relaxed text-fg-2">
          Without a backup, your balance can't be recovered. If you haven't saved a backup file yet, do that first.
        </p>
        <div className="mt-6 grid grid-cols-1 gap-2">
          <Button
            variant="danger"
            onClick={async () => {
              await wallet.forget();
              setConfirmForget(false);
              toast({ title: "Account removed from this phone", tone: "info" });
            }}
          >
            Remove from this phone
          </Button>
          <Button variant="ghost" onClick={() => setConfirmForget(false)}>
            Cancel
          </Button>
        </div>
      </Sheet>
    </Page>
  );
}
