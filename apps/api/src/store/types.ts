export type WalletKind = "student" | "agent" | "sponsor";
export type QuestionStatus = "answered" | "settled" | "settle_failed";

export interface QuestionRecord {
  id: string;
  payer: string | null;
  question: string | null;
  answer: string | null;
  subject: string | null;
  provider: string | null;
  model: string;
  route: string | null;
  /** AI cost of this answer in USD; null when the model isn't in the price table. */
  costUsd: number | null;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
  priceUnits: bigint;
  asset: string;
  network: string;
  status: QuestionStatus;
  txHash: string | null;
  createdAt: Date;
}

export interface NewQuestion extends Omit<QuestionRecord, "createdAt"> {}

export interface WalletRecord {
  address: string;
  kind: WalletKind;
  cohort: string | null;
  inviteCode: string | null;
  sponsoredTx: string | null;
  enrolledAt: Date | null;
  createdAt: Date;
}

export interface Stats {
  students: number;
  paidQuestions: number;
  totalPaidUnits: bigint;
  daily: { day: string; count: number }[];
  latest: { txHash: string; priceUnits: bigint; subject: string | null; createdAt: Date }[];
}

export interface Store {
  readonly kind: "memory" | "neon";
  insertQuestion(q: NewQuestion): Promise<void>;
  listQuestions(payer: string, opts: { limit: number; before?: Date }): Promise<QuestionRecord[]>;
  deleteQuestionText(payer: string, id: string): Promise<boolean>;
  countQuestionsSince(since: Date): Promise<number>;

  upsertWallet(w: Partial<WalletRecord> & { address: string; kind: WalletKind }): Promise<void>;
  getWallet(address: string): Promise<WalletRecord | null>;

  /** Atomically claims an invite code for an address. Returns cohort or null if invalid/used. */
  redeemInvite(code: string, address: string): Promise<{ cohort: string } | null>;
  /** Releases an invite (e.g. onboarding tx failed). */
  releaseInvite(code: string, address: string): Promise<void>;
  addInvites(codes: string[], cohort: string): Promise<number>;

  recordClaim(c: { txHash: string; student: string; amountUnits: bigint }): Promise<void>;
  stats(network: string): Promise<Stats>;
  ping(): Promise<boolean>;
}
