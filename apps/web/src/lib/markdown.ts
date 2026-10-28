/**
 * remark plugin: finds the tutor's final answer and turns it into an emphasised block.
 *
 * Recognised forms (English and Taglish):
 *   **Final answer:** $x = 1$ or $x = 3$
 *   **Final answer: x = 1 or x = 3**
 *   Final na sagot: …   ·   Sagot: …
 *   ### Final answer  (heading followed by the answer)
 */

interface MdNode {
  type: string;
  value?: string;
  depth?: number;
  children?: MdNode[];
  data?: { hName?: string; hProperties?: Record<string, unknown> };
}

const LABEL = /^\s*(final\s+answer|final\s+na\s+sagot|sagot)\s*[:：.\-–—]?\s*/i;

function el(type: string, className: string, children: MdNode[]): MdNode {
  return { type, data: { hName: "div", hProperties: { className: [className] } }, children };
}

function textOf(node: MdNode): string {
  if (typeof node.value === "string") return node.value;
  return (node.children ?? []).map(textOf).join("");
}

/** Strips the label from the start of a paragraph's inline children. Returns null if absent. */
function stripLabel(children: MdNode[]): MdNode[] | null {
  const [first, ...rest] = children;
  if (!first) return null;

  if (first.type === "text" && LABEL.test(first.value ?? "")) {
    const value = (first.value ?? "").replace(LABEL, "");
    return value ? [{ ...first, value }, ...rest] : trimLeading(rest);
  }

  if ((first.type === "strong" || first.type === "emphasis") && LABEL.test(textOf(first))) {
    const inner = first.children ?? [];
    const whole = textOf(first).trim();
    const labelOnly = whole.replace(LABEL, "") === "";
    if (labelOnly) return trimLeading(rest);
    // The label and the answer are both inside the bold run: keep the answer bold.
    const strippedInner = stripLabel(inner);
    return strippedInner ? [{ ...first, children: strippedInner }, ...rest] : null;
  }
  return null;
}

function trimLeading(nodes: MdNode[]): MdNode[] {
  const [first, ...rest] = nodes;
  if (first?.type === "text") {
    const value = (first.value ?? "").replace(/^[\s:：.\-–—]+/, "");
    return value ? [{ ...first, value }, ...rest] : rest;
  }
  return nodes;
}

function finalBlock(body: MdNode[]): MdNode {
  return el("finalAnswer", "final-answer", [
    el("finalLabel", "final-label", [{ type: "text", value: "Final answer" }]),
    el("finalBody", "final-body", body),
  ]);
}

function transformChildren(parent: MdNode): void {
  const kids = parent.children;
  if (!kids) return;
  for (let i = 0; i < kids.length; i++) {
    const node = kids[i]!;

    if (node.type === "paragraph" && node.children) {
      const stripped = stripLabel(node.children);
      if (stripped && stripped.length > 0) {
        kids[i] = finalBlock([{ type: "paragraph", children: stripped }]);
        continue;
      }
    }

    if (node.type === "heading" && LABEL.test(textOf(node)) && textOf(node).replace(LABEL, "") === "") {
      const next = kids[i + 1];
      if (next && next.type !== "heading") {
        kids.splice(i, 2, finalBlock([next]));
        continue;
      }
    }

    if (node.type === "blockquote" && node.children?.[0]?.type === "paragraph") {
      const stripped = stripLabel(node.children[0].children ?? []);
      if (stripped && stripped.length > 0) {
        kids[i] = finalBlock([{ type: "paragraph", children: stripped }, ...node.children.slice(1)]);
        continue;
      }
    }

    if (node.type === "listItem" || node.type === "list" || node.type === "blockquote") transformChildren(node);
  }
}

export function remarkFinalAnswer() {
  return (tree: unknown) => {
    transformChildren(tree as MdNode);
  };
}

/** Plain-text version of an answer for the clipboard: math stays as TeX, markup is dropped. */
export function answerToPlainText(markdown: string): string {
  return markdown
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
