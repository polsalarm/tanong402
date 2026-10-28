import "@fontsource-variable/inter";
import "@fontsource-variable/inter-tight";
import "@fontsource-variable/geist-mono";
import "./index.css";
import { MotionGlobalConfig } from "motion/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

async function boot() {
  // Demo builds only: `?seed=demo` prepares a lived-in account (see lib/mock/seed.ts).
  if (import.meta.env.VITE_MOCK_API === "true") {
    const params = new URLSearchParams(window.location.search);
    // `?shot=1`: still frames for screenshots (headless virtual time doesn't drive animation frames).
    if (params.has("shot")) {
      MotionGlobalConfig.skipAnimations = true;
      MotionGlobalConfig.instantAnimations = true;
    }
    const seed = params.get("seed");
    if (seed) {
      try {
        const { seedDemo } = await import("./lib/mock/seed");
        await seedDemo(seed);
        params.delete("seed");
        const qs = params.toString();
        history.replaceState(null, "", window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash);
      } catch (err) {
        console.warn("mock seed failed", err);
      }
    }
  }
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void boot();
