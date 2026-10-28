import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "test" ? "silent" : "info"),
  redact: {
    paths: [
      "*.secret",
      "*.TREASURY_SECRET",
      "*.POOL_ADMIN_SECRET",
      "*.GEMINI_API_KEY",
      "*.OPENAI_API_KEY",
      "*.ANTHROPIC_API_KEY",
      "*.GROQ_API_KEY",
      "*.DATABASE_URL",
      "*.JWT_SECRET",
      "*.FACILITATOR_API_KEY",
      "req.headers.authorization",
      'req.headers["payment-signature"]',
      'req.headers["x-payment"]',
      "*.question",
      "*.answer",
    ],
    censor: "[redacted]",
  },
  ...(process.env.NODE_ENV === "development"
    ? { transport: { target: "pino-pretty", options: { colorize: true, singleLine: true } } }
    : {}),
});
