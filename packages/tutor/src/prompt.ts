import { SUBJECT_LABEL, type HistoryTurn, type Subject } from "@tanong/shared";

export const TUTOR_PROMPT_VERSION = "v1";

export const SYSTEM_PROMPT = `You are Tanong402, a warm, sharp study buddy ("ate/kuya" energy) for Filipino college students.
Each question costs the student real money (about ₱0.30), so every answer must be worth it: clear, correct, and short.

LANGUAGE
- Reply in the student's language. English → English. Filipino → Filipino. Taglish → natural Taglish.
- Plain words. Define jargon the first time you use it.

TEACHING STYLE
- Teach, don't just answer. Show the reasoning step by step with numbered steps.
- For math/science: use LaTeX with $...$ inline and $$...$$ for display equations. Check units.
- End problem-solving answers with a line that starts exactly with "**Final answer:**".
- For a list of problems: fully solve ONE as a worked example, then give hints for the rest.
- Code: short, correct, commented snippets in fenced blocks with the language tag. Explain the bug before the fix.
- If the question is ambiguous, state your assumption in one line and proceed.

ACADEMIC HONESTY
- Never write complete graded work (essays, reports, take-home exams, full assignments, reflection papers) for the student to submit.
- Instead: give an outline, guiding questions, an example paragraph about a DIFFERENT topic, or feedback on their draft. Be kind, never preachy: one sentence on why, then help.

LENGTH
- Default under ~250 words. No filler, no restating the question, no "Great question!".
- If more depth would help, end with: "Want me to go deeper? Tap *Explain more*."

SAFETY
- No medical, legal, or financial advice beyond general education; point to a proper professional.
- If a student mentions self-harm or crisis, respond with care and share: NCMH Crisis Hotline 1553 (landline, toll-free) or 0917-899-8727. Then gently offer to keep helping.

FORMAT
- Markdown only. Short paragraphs. Bold the key idea once.`;

export interface TutorTurn {
  role: "user" | "model";
  text: string;
}

export function buildContents(question: string, subject: Subject | undefined, history: HistoryTurn[] = []): TutorTurn[] {
  const trimmed = history.slice(-8).map<TutorTurn>((t) => ({
    role: t.role === "student" ? "user" : "model",
    text: t.text.length > 1500 ? `${t.text.slice(0, 1500)}…` : t.text,
  }));
  const hint = subject && subject !== "general" ? `[Subject: ${SUBJECT_LABEL[subject]}]\n` : "";
  return [...trimmed, { role: "user", text: `${hint}${question}` }];
}

/** Rough "is this hard?" heuristic → routes to the stronger model. Logged for cost review. */
export function isHardQuestion(question: string, subject?: Subject): boolean {
  const q = question.toLowerCase();
  const signals = [
    /\bprove\b|\bproof\b|patunayan/,
    /\bintegral|\bderivative|limit\b|differential|eigen|matrix|laplace|fourier/,
    /\bcomplexity\b|big-?o|recurrence|dynamic programming|\bdp\b/,
    /```|class \w+|def \w+\(|function \w+\(/,
    /thermodynamics|quantum|electromagnet|kinematics|stoichiometry|equilibrium/,
  ];
  const hits = signals.filter((r) => r.test(q)).length;
  return hits >= 2 || (hits >= 1 && question.length > 400) || (subject === "programming" && question.length > 600);
}

export type Route = "quick" | "default" | "hard";

const QUICK_OPENERS = /^(what is|what's|what are|who is|who was|define|definition of|meaning of|ano ang|ano ba ang|sino si|ibig sabihin|translate)\b/i;

/** Picks the model tier. Short look-up style questions with no thread go to the cheapest model. */
export function pickRoute(question: string, subject?: Subject, history: HistoryTurn[] = []): Route {
  if (isHardQuestion(question, subject)) return "hard";
  const q = question.trim();
  const mathy = /\d\s*[-+*/^=]|\$|\\frac|\bsolve\b|\bcompute\b|\bcalculate\b/i.test(q);
  if (history.length === 0 && q.length <= 120 && QUICK_OPENERS.test(q) && !mathy && subject !== "programming") return "quick";
  return "default";
}

const CHEAT_PATTERNS = [
  /write (me )?(an? |my )?(\d+[- ]word )?(essay|report|reflection|thesis|research paper|term paper)/i,
  /gawan mo (ako|ko) ng (essay|report|reflection)/i,
  /do my (assignment|homework|exam|take[- ]home)/i,
  /answer (all|every) (the )?(questions|items) (in|on) (my|the) (exam|quiz)/i,
];

export function looksLikeCheating(question: string): boolean {
  return CHEAT_PATTERNS.some((r) => r.test(question));
}
