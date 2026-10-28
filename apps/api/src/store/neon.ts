import { neon } from "@neondatabase/serverless";
import { and, desc, eq, gte, isNull, lt, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { claims, invites, questions, wallets } from "../db/schema.js";
import type { NewQuestion, QuestionRecord, Stats, Store, WalletRecord } from "./types.js";

export class NeonStore implements Store {
  readonly kind = "neon" as const;
  private db;

  constructor(databaseUrl: string) {
    this.db = drizzle(neon(databaseUrl));
  }

  async insertQuestion(q: NewQuestion) {
    await this.db.insert(questions).values(q).onConflictDoNothing();
  }

  async listQuestions(payer: string, opts: { limit: number; before?: Date }): Promise<QuestionRecord[]> {
    const rows = await this.db
      .select()
      .from(questions)
      .where(and(eq(questions.payer, payer), opts.before ? lt(questions.createdAt, opts.before) : undefined))
      .orderBy(desc(questions.createdAt))
      .limit(opts.limit);
    return rows as QuestionRecord[];
  }

  async deleteQuestionText(payer: string, id: string) {
    const rows = await this.db
      .update(questions)
      .set({ question: null, answer: null })
      .where(and(eq(questions.id, id), eq(questions.payer, payer)))
      .returning({ id: questions.id });
    return rows.length > 0;
  }

  async countQuestionsSince(since: Date) {
    const [row] = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(questions)
      .where(gte(questions.createdAt, since));
    return row?.n ?? 0;
  }

  async upsertWallet(w: Partial<WalletRecord> & { address: string; kind: WalletRecord["kind"] }) {
    const set = Object.fromEntries(
      Object.entries({
        cohort: w.cohort,
        inviteCode: w.inviteCode,
        sponsoredTx: w.sponsoredTx,
        enrolledAt: w.enrolledAt,
      }).filter(([, v]) => v !== undefined),
    );
    await this.db
      .insert(wallets)
      .values({ address: w.address, kind: w.kind, ...set })
      .onConflictDoUpdate({
        target: wallets.address,
        set: {
          ...set,
          // students stay students
          kind: sql`case when ${wallets.kind} = 'student' then 'student' else ${w.kind} end`,
        },
      });
  }

  async getWallet(address: string) {
    const [row] = await this.db.select().from(wallets).where(eq(wallets.address, address)).limit(1);
    return (row as WalletRecord | undefined) ?? null;
  }

  async redeemInvite(code: string, address: string) {
    const rows = await this.db
      .update(invites)
      .set({ usedBy: address, usedAt: new Date() })
      .where(and(eq(invites.code, code.toUpperCase()), or(isNull(invites.usedBy), eq(invites.usedBy, address))))
      .returning({ cohort: invites.cohort });
    return rows[0] ?? null;
  }

  async releaseInvite(code: string, address: string) {
    await this.db
      .update(invites)
      .set({ usedBy: null, usedAt: null })
      .where(and(eq(invites.code, code.toUpperCase()), eq(invites.usedBy, address)));
  }

  async addInvites(codes: string[], cohort: string) {
    if (codes.length === 0) return 0;
    const rows = await this.db
      .insert(invites)
      .values(codes.map((code) => ({ code: code.toUpperCase(), cohort })))
      .onConflictDoNothing()
      .returning({ code: invites.code });
    return rows.length;
  }

  async recordClaim(c: { txHash: string; student: string; amountUnits: bigint }) {
    await this.db.insert(claims).values(c).onConflictDoNothing();
  }

  async stats(network: string): Promise<Stats> {
    const settled = and(eq(questions.network, network), eq(questions.status, "settled"));
    const [[students], [totals], daily, latest] = await Promise.all([
      this.db.select({ n: sql<number>`count(*)::int` }).from(wallets).where(eq(wallets.kind, "student")),
      this.db
        .select({ n: sql<number>`count(*)::int`, sum: sql<string>`coalesce(sum(${questions.priceUnits}), 0)::text` })
        .from(questions)
        .where(settled),
      this.db
        .select({ day: sql<string>`to_char(${questions.createdAt}, 'YYYY-MM-DD')`, count: sql<number>`count(*)::int` })
        .from(questions)
        .where(and(settled, gte(questions.createdAt, sql`now() - interval '30 days'`)))
        .groupBy(sql`1`)
        .orderBy(sql`1`),
      this.db
        .select({
          txHash: questions.txHash,
          priceUnits: questions.priceUnits,
          subject: questions.subject,
          createdAt: questions.createdAt,
        })
        .from(questions)
        .where(settled)
        .orderBy(desc(questions.createdAt))
        .limit(20),
    ]);
    return {
      students: students?.n ?? 0,
      paidQuestions: totals?.n ?? 0,
      totalPaidUnits: BigInt(totals?.sum ?? "0"),
      daily,
      latest: latest.filter((l) => l.txHash).map((l) => ({ ...l, txHash: l.txHash! })),
    };
  }

  async ping() {
    await this.db.execute(sql`select 1`);
    return true;
  }
}
