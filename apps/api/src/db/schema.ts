import { bigint, doublePrecision, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const wallets = pgTable("wallets", {
  address: text("address").primaryKey(),
  kind: text("kind").notNull(), // 'student' | 'agent' | 'sponsor'
  cohort: text("cohort"),
  inviteCode: text("invite_code"),
  sponsoredTx: text("sponsored_tx"),
  enrolledAt: timestamp("enrolled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const questions = pgTable(
  "questions",
  {
    id: uuid("id").primaryKey(),
    payer: text("payer"),
    question: text("question"),
    answer: text("answer"),
    subject: text("subject"),
    provider: text("provider"),
    model: text("model").notNull(),
    route: text("route"),
    costUsd: doublePrecision("cost_usd"),
    tokensIn: integer("tokens_in").notNull().default(0),
    tokensOut: integer("tokens_out").notNull().default(0),
    latencyMs: integer("latency_ms").notNull().default(0),
    priceUnits: bigint("price_units", { mode: "bigint" }).notNull(),
    asset: text("asset").notNull(),
    network: text("network").notNull(),
    status: text("status").notNull(), // 'answered' | 'settled' | 'settle_failed'
    txHash: text("tx_hash").unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("questions_payer_created_idx").on(t.payer, t.createdAt),
    index("questions_network_status_idx").on(t.network, t.status, t.createdAt),
  ],
);

export const invites = pgTable("invites", {
  code: text("code").primaryKey(),
  cohort: text("cohort").notNull(),
  usedBy: text("used_by"),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const claims = pgTable("claims", {
  txHash: text("tx_hash").primaryKey(),
  student: text("student").notNull(),
  amountUnits: bigint("amount_units", { mode: "bigint" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
