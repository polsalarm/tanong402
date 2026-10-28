import type { ErrorCode } from "@tanong/shared";
import type { ErrorRequestHandler, RequestHandler, Response } from "express";
import { ZodError } from "zod";
import { logger } from "./logger.js";

const STATUS: Record<ErrorCode, number> = {
  RATE_LIMITED: 429,
  INVALID_INPUT: 400,
  MODEL_ERROR: 502,
  NOT_ENROLLED: 403,
  CLAIM_TOO_EARLY: 409,
  POOL_EMPTY: 409,
  INVITE_INVALID: 400,
  UNAUTHORIZED: 401,
  NOT_CONFIGURED: 503,
  NOT_FOUND: 404,
  INTERNAL: 500,
};

export class ApiError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly status = STATUS[code],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function sendError(res: Response, code: ErrorCode, message: string, status = STATUS[code]) {
  res.status(status).json({ error: { code, message } });
}

/** Wrap async handlers so thrown errors reach the error middleware. */
export const ah =
  (fn: (...args: Parameters<RequestHandler>) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (res.headersSent) return;
  if (err instanceof ApiError) return sendError(res, err.code, err.message, err.status);
  if (err instanceof ZodError) {
    const msg = err.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; ");
    return sendError(res, "INVALID_INPUT", msg);
  }
  if (err?.type === "entity.parse.failed") return sendError(res, "INVALID_INPUT", "Malformed JSON");
  logger.error({ err, path: req.path }, "unhandled error");
  sendError(res, "INTERNAL", "Something went wrong");
};
