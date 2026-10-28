import type { StellarNetwork } from "@tanong/shared";

const env = import.meta.env;

/** API origin, no trailing slash. */
export const API_URL = (env.VITE_API_URL || "http://localhost:3001").replace(/\/+$/, "");

/** Standalone demo: every request is answered by the in-browser mock (lib/mock). */
export const MOCK_API = env.VITE_MOCK_API === "true";

/**
 * Optional build-time pins. When set, the app refuses to pay if GET /config disagrees, so a
 * compromised or misconfigured API can't redirect a student's payments.
 */
export const PIN_NETWORK = (env.VITE_NETWORK || undefined) as StellarNetwork | undefined;
export const PIN_RECEIVER = env.VITE_RECEIVER_ADDRESS || undefined;
export const PIN_MAX_PRICE_USDC = env.VITE_MAX_PRICE_USDC || undefined;

export const APP_VERSION = "0.1.0";
