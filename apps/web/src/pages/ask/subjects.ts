import { SUBJECT_LABEL, type Subject } from "@tanong/shared";
import { Atom, Calculator, CodeXml, FlaskConical, Languages, PenLine, Sparkles, type LucideIcon } from "lucide-react";

export const SUBJECT_ORDER: Subject[] = ["math", "physics", "chemistry", "programming", "filipino", "writing", "general"];

export const SUBJECT_ICON: Record<Subject, LucideIcon> = {
  math: Calculator,
  physics: Atom,
  chemistry: FlaskConical,
  programming: CodeXml,
  filipino: Languages,
  writing: PenLine,
  general: Sparkles,
};

export const subjectName = (s: Subject) => SUBJECT_LABEL[s];

export const SUGGESTIONS: { subject: Subject; text: string }[] = [
  { subject: "math", text: "Solve 2x² − 8x + 6 = 0 step by step" },
  { subject: "physics", text: "Explain Newton's second law with an example" },
  { subject: "programming", text: "Bakit may NullPointerException ako sa Java?" },
  { subject: "writing", text: "Paano ko gagawing mas malinaw ang thesis ko?" },
];

export const FOLLOW_UP = "Explain that more, step by step.";
