import { toUnits } from "@tanong/shared";
import { ArrowRight, ArrowUpRight, Bot, Check, Copy, CreditCard, FileJson, Send } from "lucide-react";
import { motion } from "motion/react";
import { useState, type ReactNode } from "react";
import { Page } from "../../components/Page";
import { Badge, Card } from "../../components/ui";
import { useConfig } from "../../contexts/ConfigContext";
import { copyText } from "../../lib/clipboard";
import { API_URL } from "../../lib/env";
import { shortHash } from "../../lib/format";

const TOKEN =
  /((?<![:\w"'])\/\/.*$|^\s*#.*$)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`)|\b(import|from|const|await|new|export|async|return|if)\b|(PAYMENT-(?:REQUIRED|RESPONSE|SIGNATURE)|HTTP\/1\.1 \d{3}[^\n]*)/gm;

/** Tiny, dependency-free highlighter: comments, strings, keywords, x402 headers. */
function highlight(code: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let k = 0;
  for (const m of code.matchAll(TOKEN)) {
    const i = m.index ?? 0;
    if (i > last) out.push(code.slice(last, i));
    const cls = m[1] ? "tok-c" : m[2] ? "tok-s" : m[3] ? "tok-k" : "tok-h";
    out.push(
      <span key={k++} className={cls}>
        {m[0]}
      </span>,
    );
    last = i + m[0].length;
  }
  if (last < code.length) out.push(code.slice(last));
  return out;
}

function CodeCard({ title, code, lang }: { title: string; code: string; lang: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--t-line)] py-2 pl-5 pr-2">
        <div className="flex items-center gap-3">
          <span className="flex gap-1.5" aria-hidden>
            <span className="size-2.5 rounded-full bg-[var(--t-line-strong)]" />
            <span className="size-2.5 rounded-full bg-[var(--t-line-strong)]" />
            <span className="size-2.5 rounded-full bg-[var(--t-line-strong)]" />
          </span>
          <span className="text-[13px] text-fg-2">{title}</span>
          <Badge>{lang}</Badge>
        </div>
        <button
          type="button"
          onClick={async () => {
            if (await copyText(code)) {
              setCopied(true);
              setTimeout(() => setCopied(false), 1400);
            }
          }}
          className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[12.5px] text-fg-3 hover:bg-[color-mix(in_srgb,var(--t-fg)_6%,transparent)] hover:text-fg"
        >
          {copied ? <Check className="size-3.5 text-success" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="code overflow-x-auto px-5 py-4">
        <code>{highlight(code)}</code>
      </pre>
    </Card>
  );
}

const FLOW = [
  { icon: Send, title: "Ask", body: "POST /ask with your question as JSON. No API key, no account." },
  { icon: FileJson, title: "402 + price", body: "The API answers 402 Payment Required with a PAYMENT-REQUIRED header: exact scheme, amount, asset, payee." },
  { icon: CreditCard, title: "Pay", body: "Your client signs a USDC transfer authorization and retries with PAYMENT-SIGNATURE. The facilitator verifies it." },
  { icon: Bot, title: "Answer", body: "The tutor answers, then the payment settles. You get 200 plus PAYMENT-RESPONSE with the transaction hash." },
];

export default function Developers() {
  const { config, priceUsdc, pricePhp } = useConfig();
  const network = config?.network ?? "stellar:testnet";
  const payTo = config?.payTo ?? "G…RECEIVER";
  const asset = config?.usdcAddress ?? "C…USDC";
  let units = "50000";
  try {
    units = toUnits(priceUsdc).toString();
  } catch {
    /* keep default */
  }

  const curl = `curl -i -X POST ${API_URL}/ask \\
  -H 'content-type: application/json' \\
  -d '{"question":"Solve 2x^2 - 8x + 6 = 0 step by step","subject":"math"}'

HTTP/1.1 402 Payment Required
PAYMENT-REQUIRED: eyJ4NDAyVmVyc2lvbiI6Miwi…

# base64-decoded PAYMENT-REQUIRED
{
  "x402Version": 2,
  "accepts": [{
    "scheme": "exact",
    "network": "${network}",
    "amount": "${units}",
    "asset": "${asset}",
    "payTo": "${payTo}",
    "maxTimeoutSeconds": 120,
    "extra": { "areFeesSponsored": true }
  }]
}`;

  const ts = `import { decodePaymentResponseHeader, wrapFetchWithPayment, x402Client } from "@x402/fetch";
import { createEd25519Signer } from "@x402/stellar";
import { ExactStellarScheme } from "@x402/stellar/exact/client";

// A funded ${network === "stellar:pubnet" ? "mainnet" : "testnet"} account with a USDC trustline.
const signer = createEd25519Signer(process.env.STELLAR_SECRET!, "${network}");
const client = new x402Client().register("${network}", new ExactStellarScheme(signer));
const paidFetch = wrapFetchWithPayment(fetch, client);

const res = await paidFetch("${API_URL}/ask", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ question: "Explain Newton's second law", subject: "physics" }),
});

const { answer } = await res.json();
const receipt = decodePaymentResponseHeader(res.headers.get("PAYMENT-RESPONSE")!);
console.log(answer);
console.log("paid:", receipt.transaction); // look it up on stellar.expert`;

  return (
    <Page className="mx-auto max-w-6xl px-5 pb-8 pt-6 sm:px-8 sm:pt-12">
      <header className="grid grid-cols-1 gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-end">
        <div>
          <p className="eyebrow">Developers · AI agents</p>
          <h1 className="mt-5 font-display text-display-lg tracking-[-0.025em] text-fg">
            Any agent can pay <span className="em-metal">per question.</span>
          </h1>
          <p className="mt-4 max-w-xl text-[16.5px] leading-relaxed text-fg-2">
            No API key, no sign-up, no monthly plan. Tanong402 speaks x402: ask, receive a 402 with the price, pay{" "}
            {priceUsdc} USDC on Stellar, get the answer. Settlement happens only if the tutor actually answers.
          </p>
        </div>
        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-[color-mix(in_srgb,var(--t-accent)_14%,transparent)] px-2 py-1 font-mono text-[12px] font-medium text-accent">POST</span>
            <span className="font-mono text-[15px] text-fg">/ask</span>
            <span className="ml-auto inline-flex items-center gap-1.5 text-[12.5px] text-fg-3">
              <span className="live-dot" aria-hidden /> {config?.paymentsEnabled === false ? "Payments off" : "Live"}
            </span>
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3.5 text-[13.5px]">
            {[
              ["Price", `${priceUsdc} USDC (${pricePhp})`],
              ["Scheme", "x402 exact"],
              ["Network", network],
              ["Pay to", shortHash(payTo, 6, 6)],
              ["Fees", "Sponsored by facilitator"],
              ["Charge", "Only on a 2xx answer"],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-fg-3">{k}</dt>
                <dd className="tabular mt-0.5 font-mono text-[12.5px] text-fg">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </header>

      <section className="mt-16" aria-labelledby="flow-title">
        <h2 id="flow-title" className="eyebrow">
          How x402 works
        </h2>
        <ol className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-4">
          {FLOW.map((f, i) => (
            <motion.li
              key={f.title}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.1 + i * 0.07 }}
              className="glass relative rounded-[22px] p-5"
            >
              <div className="flex items-center justify-between">
                <span className="grid size-10 place-items-center rounded-full bg-[color-mix(in_srgb,var(--t-fg)_6%,transparent)] text-fg shadow-[inset_0_0_0_1px_var(--t-line-strong)]">
                  <f.icon className="size-[18px]" aria-hidden />
                </span>
                <span className="tabular font-medium text-[12px] text-fg-3">0{i + 1}</span>
              </div>
              <h3 className="mt-6 font-display text-[26px] leading-none text-fg">{f.title}</h3>
              <p className="mt-2.5 text-[14px] leading-relaxed text-fg-2">{f.body}</p>
              {i < FLOW.length - 1 && (
                <ArrowRight className="absolute -right-3 top-1/2 z-10 hidden size-5 -translate-y-1/2 rounded-full bg-[var(--t-bg)] p-0.5 text-fg-3 md:block" aria-hidden />
              )}
            </motion.li>
          ))}
        </ol>
      </section>

      <section className="mt-14 grid grid-cols-1 gap-4 lg:grid-cols-2" aria-label="Examples">
        <div>
          <h2 className="mb-3 text-[15px] font-medium text-fg">See the 402 yourself</h2>
          <CodeCard title="Terminal" code={curl} lang="curl" />
        </div>
        <div>
          <h2 className="mb-3 text-[15px] font-medium text-fg">Pay and ask from TypeScript</h2>
          <CodeCard title="agent.ts" code={ts} lang="ts" />
        </div>
      </section>

      <section className="mt-14 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Discovery">
        {[
          { href: `${API_URL}/.well-known/x402`, title: "/.well-known/x402", body: "Discovery document listing the paid resources." },
          { href: `${API_URL}/openapi.json`, title: "/openapi.json", body: "OpenAPI 3.1 description of the API." },
          { href: `${API_URL}/price`, title: "/price", body: "Current price, asset, network and payee as JSON." },
        ].map((l) => (
          <a
            key={l.title}
            href={l.href}
            target="_blank"
            rel="noreferrer"
            className="glass group relative flex items-start justify-between gap-4 rounded-[22px] p-5 transition-transform duration-300 hover:-translate-y-0.5"
          >
            <span>
              <span className="block font-mono text-[14px] text-fg">{l.title}</span>
              <span className="mt-1.5 block text-[13.5px] leading-relaxed text-fg-3">{l.body}</span>
            </span>
            <ArrowUpRight className="size-4 shrink-0 text-fg-3 transition-colors group-hover:text-fg" aria-hidden />
          </a>
        ))}
      </section>
    </Page>
  );
}
