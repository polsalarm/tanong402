import { AI_CHOICES, type AiChoice, type Subject } from "@tanong/shared";
import { Check } from "lucide-react";
import { useState } from "react";
import { Card } from "../../components/ui";
import { useConfig } from "../../contexts/ConfigContext";
import { php } from "../../lib/format";
import { KEYS, readString, writeString } from "../../lib/storage";
import { SUBJECT_ICON, SUBJECT_ORDER, subjectName } from "../ask/subjects";

function readModel(): AiChoice {
  const m = readString(KEYS.model);
  return m && (AI_CHOICES as readonly string[]).includes(m) ? (m as AiChoice) : "auto";
}

function readSubject(): Subject | null {
  const s = readString(KEYS.subject);
  return s && (SUBJECT_ORDER as string[]).includes(s) ? (s as Subject) : null;
}

/**
 * Default model and subject for new questions. Uses the same saved values as the pickers in the
 * chat box, so changing either place changes both.
 */
export function TutorSettings() {
  const { config } = useConfig();
  const models = config?.models ?? [];
  const [model, setModel] = useState<AiChoice>(readModel);
  const [subject, setSubject] = useState<Subject | null>(readSubject);
  const current: AiChoice = models.some((m) => m.id === model) ? model : "auto";

  const pickModel = (m: AiChoice) => {
    setModel(m);
    writeString(KEYS.model, m);
  };
  const pickSubject = (s: Subject | null) => {
    setSubject(s);
    writeString(KEYS.subject, s ?? "");
  };
  const price = (usdc?: string) => (usdc && config ? php(usdc, config.phpPerUsd) : null);

  return (
    <div className="grid grid-cols-1 gap-3">
      <Card className="p-2">
        <p className="px-3 pb-1 pt-2 text-[13px] font-medium text-fg-2">Default model</p>
        {models.length === 0 ? (
          <p className="px-3 pb-3 text-[14px] text-fg-3">
            The tutor is in demo mode, so there's only one model for now.
          </p>
        ) : (
          (["standard", "pro"] as const).map((tier) => {
            const group = models.filter((m) => m.tier === tier);
            if (!group.length) return null;
            return (
              <div key={tier} role="radiogroup" aria-label={tier === "pro" ? "Pro models" : "Standard models"}>
                <p className="flex items-center justify-between px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-3">
                  <span>{tier === "pro" ? "Pro" : "Standard"}</span>
                  {price(group[0]?.priceUsdc) && (
                    <span className="tabular normal-case tracking-normal">{price(group[0]?.priceUsdc)} / question</span>
                  )}
                </p>
                {group.map((m) => {
                  const active = m.id === current;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => pickModel(m.id)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--t-fg)_6%,transparent)] ${active ? "bg-[color-mix(in_srgb,var(--t-fg)_5%,transparent)]" : ""}`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 text-[15px] text-fg">
                          {m.label}
                          {m.tier === "pro" && (
                            <span className="metal-fill rounded-full px-1.5 py-px text-[10px] font-semibold tracking-wider">PRO</span>
                          )}
                        </span>
                        <span className="block text-[13px] text-fg-3">{m.hint}</span>
                      </span>
                      {active && <Check className="size-4 shrink-0 text-fg" aria-hidden />}
                    </button>
                  );
                })}
              </div>
            );
          })
        )}
        {models.some((m) => m.tier === "pro") && (
          <p className="px-3 pb-2 pt-3 text-[12.5px] leading-snug text-fg-4">
            Pro questions cost more. The Ask button always shows the price before you pay. If a model is busy,
            another model in the same tier answers; if none can, you're not charged.
          </p>
        )}
      </Card>

      <Card className="p-4">
        <p className="text-[13px] font-medium text-fg-2">Default subject</p>
        <p className="mt-0.5 text-[13px] text-fg-3">A hint that helps the tutor. You can still change it for each question.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {[null, ...SUBJECT_ORDER].map((s) => {
            const Icon = s ? SUBJECT_ICON[s] : null;
            const active = s === subject;
            return (
              <button
                key={s ?? "any"}
                type="button"
                aria-pressed={active}
                onClick={() => pickSubject(s)}
                className={`inline-flex h-10 items-center gap-1.5 rounded-full px-3.5 text-[14px] transition-colors ${
                  active
                    ? "bg-fg text-bg"
                    : "text-fg-2 shadow-[inset_0_0_0_1px_var(--t-line)] hover:text-fg"
                }`}
              >
                {Icon && <Icon className="size-3.5" aria-hidden />}
                {s ? subjectName(s) : "Any subject"}
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
