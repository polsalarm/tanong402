import { createApp } from "./app.js";
import { loadEnv } from "./config/env.js";
import { logger } from "./lib/logger.js";

const env = loadEnv();
const app = createApp(env);

const server = app.listen(env.PORT, () => {
  logger.info(`Tanong402 API listening on http://localhost:${env.PORT}`);
});

for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, () => {
    logger.info({ sig }, "shutting down");
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
  });
}
