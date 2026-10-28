import { MAX_QUESTION_CHARS, type AiChoice, type ClientConfig, type Subject } from "@tanong/shared";
import { ArrowUp, Check, ChevronDown, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Spinner } from "../../components/ui";
import { SUBJECT_ICON, SUBJECT_ORDER, subjectName } from "./subjects";

function SubjectPicker({ value, onChange }: { value: Subject | null; onChange: (s: Subject | null) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: globalThis.KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  const Icon = value ? SUBJECT_ICON[value] : null;
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-10 items-center gap-1.5 rounded-full pl-3 pr-2.5 text-[13.5px] text-fg-2 shadow-[inset_0_0_0_1px_var(--t-line)] transition-colors hover:text-fg"
      >
        {Icon && <Icon className="size-3.5" aria-hidden />}
        {value ? subjectName(value) : "Any subject"}
        <ChevronDown className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            aria-label="Subject"
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="glass-float menu-solid absolute bottom-12 left-0 z-50 w-52 origin-bottom-left rounded-2xl p-1.5"
          >
            {[null, ...SUBJECT_ORDER].map((s) => {
              const I = s ? SUBJECT_ICON[s] : null;
              const active = s === value;
              return (
                <li key={s ?? "any"}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      onChange(s);
                      setOpen(false);
                    }}
                    className="flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left text-[14px] text-fg-2 hover:bg-[color-mix(in_srgb,var(--t-fg)_6%,transparent)] hover:text-fg"
                  >
                    <span className="grid size-4 place-items-center">{I && <I className="size-4" aria-hidden />}</span>
                    <span className="flex-1">{s ? subjectName(s) : "Any subject"}</span>
                    {active && <Check className="size-4 text-fg" aria-hidden />}
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

type ModelOption = ClientConfig["models"][number];

function ModelPicker({
  options,
  value,
  onChange,
  formatPrice,
}: {
  options: ModelOption[];
  value: AiChoice;
  onChange: (m: AiChoice) => void;
  formatPrice: (usdc: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: globalThis.KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  const current = options.find((o) => o.id === value) ?? options[0];
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Model: ${current?.label ?? "Auto"}`}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-10 items-center gap-1.5 rounded-full pl-3 pr-2.5 text-[13.5px] text-fg-2 shadow-[inset_0_0_0_1px_var(--t-line)] transition-colors hover:text-fg"
      >
        <Sparkles className="size-3.5" aria-hidden />
        <span className="max-w-[9rem] truncate">{current?.label ?? "Auto"}</span>
        {current?.tier === "pro" && (
          <span className="metal-fill rounded-full px-1.5 py-px text-[10px] font-semibold tracking-wider">PRO</span>
        )}
        <ChevronDown className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            aria-label="Model"
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="glass-float menu-solid absolute bottom-12 left-0 z-50 max-h-[70vh] w-72 origin-bottom-left overflow-y-auto rounded-2xl p-1.5"
          >
            {(["standard", "pro"] as const).map((tier) => {
              const group = options.filter((o) => o.tier === tier);
              if (!group.length) return null;
              const price = group[0]?.priceUsdc;
              return (
                <li key={tier} role="presentation">
                  <p className="flex items-center justify-between px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-3">
                    <span>{tier === "pro" ? "Pro" : "Standard"}</span>
                    {price && <span className="tabular normal-case tracking-normal">{formatPrice(price)} / question</span>}
                  </p>
                  <ul role="group" aria-label={tier === "pro" ? "Pro models" : "Standard models"}>
                    {group.map((o) => {
                      const active = o.id === value;
                      return (
                        <li key={o.id}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={active}
                            onClick={() => {
                              onChange(o.id);
                              setOpen(false);
                            }}
                            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left hover:bg-[color-mix(in_srgb,var(--t-fg)_6%,transparent)]"
                          >
                            <span className="min-w-0 flex-1">
                              <span className="block text-[14px] text-fg">{o.label}</span>
                              <span className="block text-[12.5px] text-fg-3">{o.hint}</span>
                            </span>
                            {active && <Check className="size-4 shrink-0 text-fg" aria-hidden />}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            })}
            <li className="px-3 pb-1 pt-2 text-[11.5px] leading-snug text-fg-4">
              If a model is busy, another model in the same tier answers. If none can, you're not charged.
            </li>
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Composer({
  value,
  onChange,
  onSubmit,
  subject,
  onSubject,
  models = [],
  model = "auto",
  onModel,
  formatPrice = (u) => `$${u}`,
  priceLabel,
  disabled,
  busy,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  subject: Subject | null;
  onSubject: (s: Subject | null) => void;
  models?: ModelOption[];
  model?: AiChoice;
  onModel?: (m: AiChoice) => void;
  formatPrice?: (usdc: string) => string;
  priceLabel: string;
  disabled: boolean;
  busy: boolean;
  placeholder: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 184)}px`;
  }, [value]);

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && window.matchMedia("(pointer: fine)").matches) {
      e.preventDefault();
      if (!disabled && !busy && value.trim()) onSubmit();
    }
  };

  const near = value.length > MAX_QUESTION_CHARS * 0.85;
  const can = !disabled && !busy && value.trim().length > 0 && value.length <= MAX_QUESTION_CHARS;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (can) onSubmit();
      }}
      className="glass-float relative rounded-[28px] p-2"
    >
      <label htmlFor="question" className="sr-only">
        Your question
      </label>
      <textarea
        ref={ref}
        id="question"
        rows={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKey}
        placeholder={placeholder}
        maxLength={MAX_QUESTION_CHARS + 200}
        disabled={disabled}
        className="block max-h-[184px] min-h-[52px] w-full resize-none bg-transparent px-3.5 pb-1 pt-3 text-[16px] leading-relaxed text-fg outline-none placeholder:text-fg-3 disabled:opacity-60"
      />
      <div className="flex items-center gap-2 px-1 pb-0.5 pt-1">
        <SubjectPicker value={subject} onChange={onSubject} />
        {models.length > 1 && onModel && <ModelPicker options={models} value={model} onChange={onModel} formatPrice={formatPrice} />}
        {near && (
          <span className={`tabular text-[11.5px] ${value.length > MAX_QUESTION_CHARS ? "text-danger" : "text-fg-3"}`}>
            {value.length}/{MAX_QUESTION_CHARS}
          </span>
        )}
        <button
          type="submit"
          disabled={!can}
          className="metal-fill sheen relative ml-auto inline-flex h-11 items-center gap-2 rounded-full pl-5 pr-2 text-[15px] font-medium transition-[transform,filter,opacity] duration-200 hover:brightness-[1.06] active:scale-[0.97] disabled:opacity-55 disabled:saturate-50"
        >
          {busy ? <span>Asking</span> : <span>Ask · <span className="tabular">{priceLabel}</span></span>}
          <span className="grid size-8 place-items-center rounded-full bg-[color-mix(in_srgb,var(--t-on-metal)_92%,transparent)] text-[var(--t-fg)]">
            {busy ? <Spinner className="size-4 !text-current" /> : <ArrowUp className="size-4" strokeWidth={2.4} aria-hidden />}
          </span>
        </button>
      </div>
    </form>
  );
}
