import { ArrowLeft } from "lucide-react";
import { MotionConfig } from "motion/react";
import { lazy, Suspense, type ReactNode } from "react";
import { BrowserRouter, Link, Outlet, Route, Routes } from "react-router";
import { AppLayout, PublicLayout } from "./components/AppShell";
import { Logo } from "./components/Logo";
import { Page } from "./components/Page";
import { ReceiptHost } from "./components/Receipt";
import { StatusBanner } from "./components/StatusBanner";
import { LinkButton, Spinner } from "./components/ui";
import { ConfigProvider } from "./contexts/ConfigContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ToastProvider } from "./contexts/ToastContext";
import { WalletProvider } from "./contexts/WalletContext";

const Landing = lazy(() => import("./pages/landing/Landing"));
const Start = lazy(() => import("./pages/onboard/Start"));
const Ask = lazy(() => import("./pages/ask/Ask"));
const Receipts = lazy(() => import("./pages/receipts/Receipts"));
const Wallet = lazy(() => import("./pages/wallet/Wallet"));
const Settings = lazy(() => import("./pages/settings/Settings"));
const Proof = lazy(() => import("./pages/proof/Proof"));
const Developers = lazy(() => import("./pages/developers/Developers"));

function Fallback() {
  return (
    <div className="grid min-h-[50dvh] place-items-center" aria-busy="true" aria-label="Loading">
      <Spinner className="size-6" />
    </div>
  );
}

function Lazy({ children }: { children: ReactNode }) {
  return <Suspense fallback={<Fallback />}>{children}</Suspense>;
}

/** Onboarding gets a quiet frame: just the mark and a way back. */
function FocusLayout() {
  return (
    <div className="min-h-dvh">
      <div className="pt-safe mx-auto flex h-20 max-w-5xl items-center justify-between px-5 sm:px-8">
        <Logo size={30} />
        <Link
          to="/"
          className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-[14px] text-fg-2 transition-colors hover:text-fg"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back
        </Link>
      </div>
      <main id="main" className="px-5 pb-16 sm:px-8">
        <div className="mx-auto max-w-5xl">
          <StatusBanner />
        </div>
        <Outlet />
      </main>
    </div>
  );
}

function NotFound() {
  return (
    <Page className="mx-auto flex max-w-xl flex-col items-center px-6 py-28 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-4 font-display text-display-lg text-fg">
        Walang ganyang <span className="em-metal">page.</span>
      </h1>
      <p className="mt-4 text-fg-2">That page doesn't exist. Your questions are safe.</p>
      <LinkButton to="/ask" variant="metal" className="mt-8">
        Back to asking
      </LinkButton>
    </Page>
  );
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <ThemeProvider>
        <ToastProvider>
          <ConfigProvider>
            <BrowserRouter>
              <WalletProvider>
                <div className="ambient" aria-hidden />
                <a
                  href="#main"
                  className="sr-only z-[90] rounded-full bg-[var(--t-surface)] px-4 py-2 focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
                >
                  Skip to content
                </a>
                <Routes>
                  <Route element={<PublicLayout />}>
                    <Route
                      index
                      element={
                        <Lazy>
                          <Landing />
                        </Lazy>
                      }
                    />
                    <Route
                      path="proof"
                      element={
                        <Lazy>
                          <Proof />
                        </Lazy>
                      }
                    />
                    <Route
                      path="developers"
                      element={
                        <Lazy>
                          <Developers />
                        </Lazy>
                      }
                    />
                  </Route>
                  <Route element={<FocusLayout />}>
                    <Route
                      path="start"
                      element={
                        <Lazy>
                          <Start />
                        </Lazy>
                      }
                    />
                  </Route>
                  <Route element={<AppLayout />}>
                    <Route
                      path="ask"
                      element={
                        <Lazy>
                          <Ask />
                        </Lazy>
                      }
                    />
                    <Route
                      path="receipts"
                      element={
                        <Lazy>
                          <Receipts />
                        </Lazy>
                      }
                    />
                    <Route
                      path="wallet"
                      element={
                        <Lazy>
                          <Wallet />
                        </Lazy>
                      }
                    />
                    <Route
                      path="settings"
                      element={
                        <Lazy>
                          <Settings />
                        </Lazy>
                      }
                    />
                  </Route>
                  <Route element={<PublicLayout />}>
                    <Route path="*" element={<NotFound />} />
                  </Route>
                </Routes>
                <ReceiptHost />
                <div className="grain" aria-hidden />
              </WalletProvider>
            </BrowserRouter>
          </ConfigProvider>
        </ToastProvider>
      </ThemeProvider>
    </MotionConfig>
  );
}
