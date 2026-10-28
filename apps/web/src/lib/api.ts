import {
  apiError,
  challengeResponse,
  claimPrepareResponse,
  configResponse,
  onboardResponse,
  poolStatusResponse,
  priceResponse,
  receiptsResponse,
  statsResponse,
  txResponse,
  verifyResponse,
  type ErrorCode,
} from "@tanong/shared";
import { z } from "zod";
import { API_URL } from "./env";

/** Server codes plus the failures only the client can see. */
export type ClientErrorCode =
  | ErrorCode
  | "NETWORK"
  | "TIMEOUT"
  | "BAD_RESPONSE"
  | "PAYMENT_FAILED"
  | "INSUFFICIENT_FUNDS"
  | "SPEND_GUARD"
  | "PRICE_CHANGED"
  | "UNSAFE_REQUEST"
  | "NO_WALLET"
  | "DECLINED"
  | "SESSION_UNSUPPORTED";

/** Was the student charged? "unknown" only when the paid request was sent and the line dropped. */
export type Charged = "no" | "unknown";

export class ApiError extends Error {
  constructor(
    readonly code: ClientErrorCode,
    message: string,
    readonly status = 0,
    readonly charged: Charged = "no",
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}

/** Friendly, student-facing copy for an error. Never shows raw technical text for network trouble. */
export function errorMessage(err: unknown): string {
  if (!isApiError(err)) return "Something went wrong. Please try again.";
  switch (err.code) {
    case "NETWORK":
      return "Can't reach Tanong402 right now. Check your connection.";
    case "TIMEOUT":
      return "That took too long. Please try again.";
    case "BAD_RESPONSE":
    case "INTERNAL":
      return "Something went wrong on our side. Please try again.";
    default:
      return err.message;
  }
}

// ─── transport ────────────────────────────────────────────────────────────────

let transportPromise: Promise<typeof fetch> | null = null;

/**
 * The fetch every request goes through. With VITE_MOCK_API=true it is the in-browser mock;
 * the condition is written inline so production builds drop the mock chunk entirely.
 */
export function transport(): Promise<typeof fetch> {
  if (!transportPromise) {
    transportPromise =
      import.meta.env.VITE_MOCK_API === "true"
        ? import("./mock").then((m) => m.mockFetch)
        : Promise.resolve(globalThis.fetch.bind(globalThis));
  }
  return transportPromise;
}

export function apiUrl(path: string): string {
  return `${API_URL}${path}`;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface RequestOptions {
  method?: "GET" | "POST" | "DELETE";
  body?: unknown;
  token?: string;
  timeoutMs?: number;
  /** Extra attempts for GETs on network failure. POSTs are never retried. */
  retries?: number;
  signal?: AbortSignal;
}

export function toApiError(err: unknown): ApiError {
  if (isApiError(err)) return err;
  if (err instanceof DOMException && (err.name === "TimeoutError" || err.name === "AbortError")) {
    return new ApiError(err.name === "TimeoutError" ? "TIMEOUT" : "NETWORK", err.message);
  }
  if (err instanceof TypeError) return new ApiError("NETWORK", err.message);
  return new ApiError("INTERNAL", err instanceof Error ? err.message : String(err));
}

/** Parses an API response: `{error:{code,message}}` on failure, schema-validated JSON on success. */
export async function readJson<T>(res: Response, schema: z.ZodType<T>): Promise<T> {
  const text = await res.text();
  let json: unknown;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = undefined;
    }
  }
  if (!res.ok) {
    const parsed = apiError.safeParse(json);
    if (parsed.success) throw new ApiError(parsed.data.error.code, parsed.data.error.message, res.status);
    throw new ApiError(res.status >= 500 ? "INTERNAL" : "BAD_RESPONSE", `Request failed (${res.status})`, res.status);
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) throw new ApiError("BAD_RESPONSE", "Unexpected response from the server", res.status);
  return parsed.data;
}

async function request<T>(path: string, schema: z.ZodType<T>, opts: RequestOptions = {}): Promise<T> {
  const method = opts.method ?? "GET";
  const attempts = method === "GET" ? 1 + (opts.retries ?? 2) : 1;
  const doFetch = await transport();
  let last: ApiError = new ApiError("NETWORK", "No attempt made");

  for (let attempt = 0; attempt < attempts; attempt++) {
    if (attempt > 0) await sleep(450 * 2 ** (attempt - 1));
    const ctrl = new AbortController();
    const timer = setTimeout(
      () => ctrl.abort(new DOMException("Request timed out", "TimeoutError")),
      opts.timeoutMs ?? 15_000,
    );
    const onAbort = () => ctrl.abort(opts.signal?.reason);
    opts.signal?.addEventListener("abort", onAbort, { once: true });
    try {
      const headers: Record<string, string> = { accept: "application/json" };
      if (opts.body !== undefined) headers["content-type"] = "application/json";
      if (opts.token) headers.authorization = `Bearer ${opts.token}`;
      const res = await doFetch(apiUrl(path), {
        method,
        headers,
        body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
        signal: ctrl.signal,
      });
      return await readJson(res, schema);
    } catch (err) {
      const reason = ctrl.signal.reason;
      last = toApiError(reason instanceof DOMException && reason.name === "TimeoutError" ? reason : err);
      if (opts.signal?.aborted) throw last;
      const retryable = last.code === "NETWORK" || last.code === "TIMEOUT" || last.status >= 502;
      if (!retryable) throw last;
    } finally {
      clearTimeout(timer);
      opts.signal?.removeEventListener("abort", onAbort);
    }
  }
  throw last;
}

/** `xdr` from /pool/claim/prepare is itself JSON: the auth entries the student signs. */
export const claimPayload = z.object({
  entries: z.array(z.string()).min(1).max(4),
  validUntilLedger: z.number().int().positive(),
});
export type ClaimPayload = z.infer<typeof claimPayload>;

const okResponse = z.unknown();

export const api = {
  config: (signal?: AbortSignal) => request("/config", configResponse, { timeoutMs: 8_000, signal }),
  price: () => request("/price", priceResponse),
  stats: (signal?: AbortSignal) => request("/stats", statsResponse, { signal }),

  onboard: (address: string, inviteCode: string) =>
    request("/onboard", onboardResponse, { method: "POST", body: { address, inviteCode }, timeoutMs: 30_000 }),
  onboardSubmit: (address: string, signedXdr: string) =>
    request("/onboard/submit", txResponse, { method: "POST", body: { address, signedXdr }, timeoutMs: 60_000 }),

  poolStatus: (address: string, signal?: AbortSignal) =>
    request(`/pool/status?address=${encodeURIComponent(address)}`, poolStatusResponse, { signal }),
  joinPool: (token: string, inviteCode: string) =>
    request("/pool/join", txResponse, { method: "POST", body: { inviteCode }, token, timeoutMs: 60_000 }),
  claimPrepare: (address: string) =>
    request("/pool/claim/prepare", claimPrepareResponse, { method: "POST", body: { address }, timeoutMs: 30_000 }),
  claimSubmit: (address: string, signedXdr: string) =>
    request("/pool/claim/submit", txResponse, { method: "POST", body: { address, signedXdr }, timeoutMs: 60_000 }),

  challenge: (address: string) => request("/auth/challenge", challengeResponse, { method: "POST", body: { address } }),
  verify: (address: string, nonce: string, signature: string) =>
    request("/auth/verify", verifyResponse, { method: "POST", body: { address, nonce, signature } }),

  receipts: (token: string, cursor?: string | null, signal?: AbortSignal) =>
    request(`/receipts${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`, receiptsResponse, {
      token,
      signal,
    }),
  deleteReceipt: (token: string, id: string) =>
    request(`/receipts/${encodeURIComponent(id)}`, okResponse, { method: "DELETE", token }),
};
