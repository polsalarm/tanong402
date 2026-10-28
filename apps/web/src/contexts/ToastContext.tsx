import { CircleAlert, CircleCheck, Info } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

type Tone = "success" | "error" | "info";

interface Toast {
  id: number;
  title: string;
  description?: string;
  tone: Tone;
}

interface ToastValue {
  toast: (t: { title: string; description?: string; tone?: Tone; durationMs?: number }) => void;
}

const ToastContext = createContext<ToastValue | null>(null);

const ICON: Record<Tone, typeof Info> = { success: CircleCheck, error: CircleAlert, info: Info };
const TONE_CLASS: Record<Tone, string> = { success: "text-success", error: "text-danger", info: "text-accent" };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((all) => all.filter((t) => t.id !== id)), []);

  const toast = useCallback<ToastValue["toast"]>(
    ({ title, description, tone = "info", durationMs = 3200 }) => {
      const id = nextId.current++;
      setToasts((all) => [...all.slice(-2), { id, title, description, tone }]);
      setTimeout(() => dismiss(id), durationMs);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-0 z-[70] flex flex-col items-center gap-2 px-4 pt-[max(0.75rem,env(safe-area-inset-top))]"
      >
        <AnimatePresence initial={false}>
          {toasts.map((t) => {
            const Icon = ICON[t.tone];
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: -16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
                className="glass-float pointer-events-auto relative flex max-w-sm items-start gap-3 rounded-2xl px-4 py-3"
                role="status"
                onClick={() => dismiss(t.id)}
              >
                <Icon className={`mt-0.5 size-[18px] shrink-0 ${TONE_CLASS[t.tone]}`} aria-hidden />
                <div className="min-w-0">
                  <p className="text-[15px] font-medium leading-snug text-fg">{t.title}</p>
                  {t.description && <p className="mt-0.5 text-sm leading-snug text-fg-2">{t.description}</p>}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
