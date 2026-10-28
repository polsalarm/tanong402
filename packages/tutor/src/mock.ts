import type { Subject } from "@tanong/shared";
import { looksLikeCheating } from "./prompt.js";

const QUADRATIC = `Let's factor it together.

**Idea:** find two numbers that multiply to $ac$ and add to $b$.

1. Pull out the common factor $2$:
$$2x^2 - 8x + 6 = 2(x^2 - 4x + 3)$$
2. Find two numbers that multiply to $3$ and add to $-4$: those are $-1$ and $-3$.
$$2(x-1)(x-3) = 0$$
3. Set each factor to zero: $x - 1 = 0$ or $x - 3 = 0$.

**Quick check:** $2(1)^2 - 8(1) + 6 = 0$ ✓

**Final answer:** $x = 1$ or $x = 3$`;

const NEWTON = `**Newton's second law:** the net force on an object equals its mass times its acceleration.

$$F_{\\text{net}} = m a$$

1. **Net force** means *all* forces added together (with direction). Push 10 N right and friction 4 N left → $F_{\\text{net}} = 6$ N right.
2. **Same force, bigger mass → smaller acceleration.** Pushing an empty cart vs. a full one.
3. Solve for what you need: $a = F_{\\text{net}} / m$.

*Example:* a $2\\,\\text{kg}$ box with $6\\,\\text{N}$ net force → $a = 6/2 = 3\\,\\text{m/s}^2$.

**Final answer:** acceleration is proportional to net force and inversely proportional to mass.`;

const NULLPOINTER = `Ang \`NullPointerException\` ay nangyayari kapag gumamit ka ng object reference na **\`null\`** pa, ibig sabihin wala pang laman.

Common na sanhi:

\`\`\`java
String name = null;
System.out.println(name.length()); // 💥 NPE: name is null
\`\`\`

**Paano i-fix:**
1. Hanapin ang line number sa stack trace, iyon ang variable na \`null\`.
2. Siguraduhing na-*initialize* mo bago gamitin:
\`\`\`java
String name = "Tanong";
\`\`\`
3. Kung puwedeng \`null\`, i-check muna:
\`\`\`java
if (name != null) System.out.println(name.length());
\`\`\`

Want me to go deeper? Tap *Explain more*.`;

const ESSAY = `I can't write the whole essay for you to submit, since that wouldn't be fair to you or your classmates. But I can get you 80% of the way there:

**Outline you can fill in**
1. **Hook:** one surprising fact or short story.
2. **Thesis:** your main claim in one sentence.
3. **Body 1–3:** one reason each + one piece of evidence + why it matters.
4. **Counterpoint:** the strongest objection, and your reply.
5. **Conclusion:** restate the thesis in new words + "so what?"

**Guiding questions:** What do *you* actually believe about this topic? What example from your own life or barangay shows it?

Paste your first draft and I'll give you specific feedback.`;

const GENERIC = `Here's how I'd approach this, step by step:

1. **Restate the goal** in your own words: what exactly is being asked?
2. **List what you know** (given values, definitions, constraints).
3. **Pick a method** that connects the knowns to the goal.
4. **Work it out** carefully, one step per line.
5. **Check** that the answer makes sense (units, signs, edge cases).

*This is a demo answer: the live tutor isn't connected yet.* Want me to go deeper? Tap *Explain more*.`;

export function mockAnswer(question: string, subject?: Subject): string {
  const q = question.toLowerCase();
  if (looksLikeCheating(question)) return ESSAY;
  if (/x\^?2|x²|quadratic|factor/.test(q)) return QUADRATIC;
  if (/newton|f\s*=\s*ma|second law/.test(q)) return NEWTON;
  if (/null ?pointer|npe/.test(q) || subject === "programming") return NULLPOINTER;
  if (/essay|thesis/.test(q) || subject === "writing") return ESSAY;
  return GENERIC;
}
