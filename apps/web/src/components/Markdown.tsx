import "katex/dist/katex.min.css";
import { Check, Copy } from "lucide-react";
import { memo, useRef, useState, type ComponentPropsWithoutRef } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { copyText } from "../lib/clipboard";
import { remarkFinalAnswer } from "../lib/markdown";

function Pre(props: ComponentPropsWithoutRef<"pre">) {
  const ref = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);
  return (
    <div className="glass relative overflow-hidden rounded-2xl">
      <button
        type="button"
        onClick={async () => {
          const ok = await copyText(ref.current?.innerText ?? "");
          if (ok) {
            setCopied(true);
            setTimeout(() => setCopied(false), 1400);
          }
        }}
        className="absolute right-2 top-2 z-10 inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 font-medium text-[11px] uppercase tracking-[0.12em] text-fg-3 transition-colors hover:bg-[color-mix(in_srgb,var(--t-fg)_7%,transparent)] hover:text-fg"
        aria-label="Copy code"
      >
        {copied ? <Check className="size-3.5 text-success" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
        {copied ? "Copied" : "Copy"}
      </button>
      <pre ref={ref} {...props} className="overflow-x-auto px-4 pb-4 pt-11 font-mono text-[13.5px] leading-relaxed text-fg" />
    </div>
  );
}

const remarkPlugins = [remarkGfm, remarkMath, remarkFinalAnswer];
const rehypePlugins = [[rehypeKatex, { throwOnError: false, strict: false }]] as never;

export const Markdown = memo(function Markdown({ children }: { children: string }) {
  return (
    <div className="md">
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={{
          pre: Pre,
          a: ({ node: _node, ...p }) => <a {...p} target="_blank" rel="noreferrer" />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
});
