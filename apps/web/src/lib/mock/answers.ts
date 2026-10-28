import type { HistoryTurn } from "@tanong/shared";

interface Canned {
  id: string;
  match: RegExp;
  hard?: boolean;
  answer: string;
}

const QUADRATIC = `Let's factor it together. We're looking for the values of $x$ that make the equation true.

1. **Factor out the common 2.** Every term is divisible by 2, so pull it out first:

   $$2x^2 - 8x + 6 = 2\\left(x^2 - 4x + 3\\right) = 0$$

2. **Factor the trinomial.** Find two numbers that multiply to $3$ and add to $-4$. Those are $-1$ and $-3$:

   $$2(x - 1)(x - 3) = 0$$

3. **Set each factor to zero.** A product is zero only when one of its factors is zero:

   $$x - 1 = 0 \\quad \\text{or} \\quad x - 3 = 0$$

4. **Check both.** $2(1)^2 - 8(1) + 6 = 0$ and $2(3)^2 - 8(3) + 6 = 0$. Pareho silang tama.

**Final answer:** $x = 1$ or $x = 3$`;

const QUADRATIC_MORE = `Sure! Here's the *why* behind each step, para kaya mo na next time.

1. **Why factor out 2 first?** Smaller numbers are easier to factor. Dividing by a common factor doesn't change the solutions, because $2 \\cdot (\\ldots) = 0$ only when $(\\ldots) = 0$.

2. **How did we find $-1$ and $-3$?** For $x^2 + bx + c$, list the factor pairs of $c = 3$: $(1, 3)$ and $(-1, -3)$. Only $-1 + (-3) = -4 = b$.

3. **Why does setting each factor to zero work?** It's the *zero product property*: if $ab = 0$, then $a = 0$ or $b = 0$.

4. **Another way to check:** the quadratic formula gives the same roots.

   $$x = \\frac{8 \\pm \\sqrt{64 - 48}}{4} = \\frac{8 \\pm 4}{4}$$

Try this one on your own: $x^2 - 5x + 6 = 0$. Hint: anong dalawang numbers ang multiply to $6$ and add to $-5$?

**Final answer:** Same roots, $x = 1$ or $x = 3$, now with the reasoning behind every step.`;

const NEWTON = `Newton's second law says: **the harder you push, the faster something speeds up, and the heavier it is, the slower it speeds up.**

$$F = ma$$

- $F$ is the **net force**, in newtons ($\\text{N}$)
- $m$ is the **mass**, in kilograms ($\\text{kg}$)
- $a$ is the **acceleration**, in $\\text{m/s}^2$

**Example.** You push a 20 kg grocery cart with a net force of 40 N.

1. Write what you know: $F = 40\\ \\text{N}$ and $m = 20\\ \\text{kg}$.
2. Solve for acceleration: $a = \\dfrac{F}{m} = \\dfrac{40}{20}$.
3. Compute: $a = 2\\ \\text{m/s}^2$.

Kung doblehin mo ang force, doble rin ang acceleration. Kung doble naman ang mass, kalahati lang.

**Final answer:** $F = ma$. For the cart, $a = 2\\ \\text{m/s}^2$.`;

const NPE = `Nangyayari ang \`NullPointerException\` kapag gumamit ka ng object na **wala pang laman** (\`null\`), like calling a method on it.

\`\`\`java
String name = null;
System.out.println(name.length()); // throws NullPointerException
\`\`\`

**Paano hanapin:**

1. Tingnan ang **line number** sa stack trace. Doon ginamit ang \`null\`.
2. Sa line na 'yan, alamin kung aling variable ang \`null\`.
3. Trace back: saan dapat siya na-assign? Baka hindi na-initialize, or may method na nag-return ng \`null\`.

**Paano ayusin:**

\`\`\`java
String name = getName();
if (name != null) {
    System.out.println(name.length());
}
\`\`\`

Better pa, siguraduhin na laging may value si \`name\` once it's created.

**Final answer:** May object na \`null\` sa line na nasa stack trace. Find that variable and make sure it has a value before you use it.`;

const THESIS = `Magandang tanong! A clear thesis answers **one question** in **one sentence**, and it's something a reader could disagree with.

**Try this 3-part test:**

1. **Specific topic.** Not "social media," but "TikTok study content."
2. **Clear claim.** What do *you* argue about it?
3. **A reason.** Add a "because…"

> **Before:** Social media affects students.
>
> **After:** TikTok study content helps first-year students review faster because short videos break hard topics into small steps.

Para sa sarili mong thesis, sagutin mo muna: *what is the one thing you want your reader to believe by the end?*

**Final answer:** Make it specific, arguable, and give a "because." Send me your draft and I'll give feedback on it.`;

const ESSAY = `Hindi ko maisusulat ang buong essay for you, kasi graded work 'yan and the goal is for **you** to learn. Pero tutulungan kita para mabilis mo itong matapos!

**An outline you can fill in:**

1. **Introduction.** Hook, context, then your thesis in one sentence.
2. **Body 1.** Your strongest reason, plus one example.
3. **Body 2.** A second reason, plus one example.
4. **Body 3.** A counterargument, then your response to it.
5. **Conclusion.** Restate the thesis in new words and answer "so what?"

**Guide questions:**

- What is your stand, in one sentence?
- What are your three strongest reasons?
- Anong example ang pinaka-convincing para sa reader mo?

Write your thesis and first paragraph, then send them to me. I'll tell you what's working and what to tighten.`;

const DERIVATIVE = `Gamitin natin ang **power rule**: bring the exponent down, then subtract 1 from it.

$$\\frac{d}{dx}\\,x^n = n\\,x^{n-1}$$

For $f(x) = x^3 + 2x$, take the derivative of each term separately:

1. $\\dfrac{d}{dx}\\,x^3 = 3x^2$
2. $\\dfrac{d}{dx}\\,2x = 2$, since $2x = 2x^1$ and $1 \\cdot 2x^0 = 2$.
3. Add them up.

**Final answer:** $f'(x) = 3x^2 + 2$`;

const MOLES = `To get moles from grams, divide by the **molar mass**.

$$n = \\frac{m}{M}$$

1. **Molar mass of water.** $\\text{H}_2\\text{O}$ has 2 hydrogens and 1 oxygen:

   $$M = 2(1.008) + 16.00 = 18.02\\ \\text{g/mol}$$

2. **Divide.**

   $$n = \\frac{18\\ \\text{g}}{18.02\\ \\text{g/mol}} \\approx 0.999\\ \\text{mol}$$

Halos eksaktong 1 mole, kaya madalas itong gamitin as an example sa class.

**Final answer:** about $1.0\\ \\text{mol}$ of water`;

const NG_NANG = `Madalas itong mapagpalit! Here's the quick rule.

**Gamitin ang "ng"** bilang *of* or bago ang object ng pandiwa:

- Bumili siya **ng** libro.
- Ang bahay **ng** lola ko.

**Gamitin ang "nang"** bilang *when*, *so that*, *how* (bago ang pang-abay), or kapag inuulit ang pandiwa:

- Umalis siya **nang** maaga. *(how)*
- Nag-aral siya **nang** makapasa. *(so that)*
- Takbo **nang** takbo ang bata. *(repeated verb)*

**Quick test:** kung puwedeng palitan ng "when" o "so that," **nang** ang tama.

**Final answer:** "ng" for objects and possession, "nang" for how, when, so that, and repeated verbs.`;

const GENERIC = (q: string) => `Good question! Let's work through it together.

1. **Pin down what's being asked.** You asked: *"${q.replace(/[*_`$]/g, "").slice(0, 140)}"*. Underline the key term or quantity it's really about.
2. **Recall the rule or definition** that connects to that key term. Isulat mo muna, kahit isang linya lang.
3. **Apply it one step at a time**, writing each step so you can check it later.
4. **Check your answer** against the original question. Does it make sense?

Send me what you've tried so far, kahit hindi pa tapos, and I'll point out the exact next step.`;

const BANK: Canned[] = [
  { id: "quadratic", match: /2x\s*(\^|²)\s*2?\s*[-−–]\s*8x|\bquadratic|\bfactor/i, answer: QUADRATIC },
  { id: "newton", match: /\bnewton|second law|\bf\s*=\s*ma\b|\bforces?\b/i, answer: NEWTON },
  { id: "npe", match: /null\s*pointer|\bnpe\b|\bnull(\s|$)/i, answer: NPE, hard: true },
  { id: "essay", match: /(write|gawin|gawan).{0,40}(essay|sanaysay)|\b\d{3,4}[- ]word/i, answer: ESSAY },
  { id: "thesis", match: /\bthesis|\blinawin|\blilinawin|\bclaim\b/i, answer: THESIS },
  { id: "derivative", match: /\bderivative|\bdifferentiate|d\/dx|power rule/i, answer: DERIVATIVE },
  { id: "moles", match: /\bmoles?\b|\bmolar|grams? of water|\bh2o\b/i, answer: MOLES },
  { id: "ng-nang", match: /\bnang\b|\bng\b.*\bnang\b|ng at nang/i, answer: NG_NANG },
];

export function pickAnswer(question: string, history: HistoryTurn[] = []): { answer: string; hard: boolean } {
  const isFollowUp = /^(explain (that|this|it)? ?more|ipaliwanag|can you explain more)/i.test(question.trim());
  if (isFollowUp) {
    const lastStudent = [...history].reverse().find((t) => t.role === "student" && !/^explain/i.test(t.text));
    if (lastStudent && /2x|quadratic|factor/i.test(lastStudent.text)) return { answer: QUADRATIC_MORE, hard: false };
    const base = lastStudent ? BANK.find((c) => c.match.test(lastStudent.text)) : undefined;
    if (base) {
      return { answer: `Sure, let's go one level deeper.\n\n${base.answer}`, hard: Boolean(base.hard) };
    }
  }
  const hit = BANK.find((c) => c.match.test(question));
  return hit ? { answer: hit.answer, hard: Boolean(hit.hard) } : { answer: GENERIC(question), hard: false };
}
