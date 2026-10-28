import type { NewQuestion, QuestionRecord, Stats, Store, WalletRecord } from "./types.js";

/** In-memory store for local dev/tests. Data resets on restart. */
export class MemoryStore implements Store {
  readonly kind = "memory" as const;
  private questions: QuestionRecord[] = [];
  private wallets = new Map<string, WalletRecord>();
  private invites = new Map<string, { cohort: string; usedBy: string | null }>();
  private claims: { txHash: string; student: string; amountUnits: bigint; createdAt: Date }[] = [];

  constructor(seedInvites: string[] = [], cohort = "dev") {
    for (const c of seedInvites) this.invites.set(c.toUpperCase(), { cohort, usedBy: null });
  }

  async insertQuestion(q: NewQuestion) {
    this.questions.push({ ...q, createdAt: new Date() });
  }

  async listQuestions(payer: string, opts: { limit: number; before?: Date }) {
    return this.questions
      .filter((q) => q.payer === payer && (!opts.before || q.createdAt < opts.before))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, opts.limit);
  }

  async deleteQuestionText(payer: string, id: string) {
    const q = this.questions.find((x) => x.id === id && x.payer === payer);
    if (!q) return false;
    q.question = null;
    q.answer = null;
    return true;
  }

  async countQuestionsSince(since: Date) {
    return this.questions.filter((q) => q.createdAt >= since).length;
  }

  async upsertWallet(w: Partial<WalletRecord> & { address: string; kind: WalletRecord["kind"] }) {
    const prev = this.wallets.get(w.address);
    this.wallets.set(w.address, {
      cohort: null,
      inviteCode: null,
      sponsoredTx: null,
      enrolledAt: null,
      createdAt: new Date(),
      ...prev,
      ...Object.fromEntries(Object.entries(w).filter(([, v]) => v !== undefined)),
      // never downgrade a student to agent
      kind: prev?.kind === "student" ? "student" : w.kind,
    } as WalletRecord);
  }

  async getWallet(address: string) {
    return this.wallets.get(address) ?? null;
  }

  async redeemInvite(code: string, address: string) {
    const inv = this.invites.get(code.toUpperCase());
    if (!inv) return null;
    if (inv.usedBy && inv.usedBy !== address) return null;
    inv.usedBy = address;
    return { cohort: inv.cohort };
  }

  async releaseInvite(code: string, address: string) {
    const inv = this.invites.get(code.toUpperCase());
    if (inv?.usedBy === address) inv.usedBy = null;
  }

  async addInvites(codes: string[], cohort: string) {
    let n = 0;
    for (const c of codes) {
      if (!this.invites.has(c.toUpperCase())) {
        this.invites.set(c.toUpperCase(), { cohort, usedBy: null });
        n++;
      }
    }
    return n;
  }

  async recordClaim(c: { txHash: string; student: string; amountUnits: bigint }) {
    this.claims.push({ ...c, createdAt: new Date() });
  }

  async stats(network: string): Promise<Stats> {
    const settled = this.questions.filter((q) => q.status === "settled" && q.network === network && q.txHash);
    const byDay = new Map<string, number>();
    for (const q of settled) {
      const d = q.createdAt.toISOString().slice(0, 10);
      byDay.set(d, (byDay.get(d) ?? 0) + 1);
    }
    return {
      students: [...this.wallets.values()].filter((w) => w.kind === "student").length,
      paidQuestions: settled.length,
      totalPaidUnits: settled.reduce((s, q) => s + q.priceUnits, 0n),
      daily: [...byDay.entries()].sort().slice(-30).map(([day, count]) => ({ day, count })),
      latest: settled
        .slice(-20)
        .reverse()
        .map((q) => ({ txHash: q.txHash!, priceUnits: q.priceUnits, subject: q.subject, createdAt: q.createdAt })),
    };
  }

  async ping() {
    return true;
  }
}
