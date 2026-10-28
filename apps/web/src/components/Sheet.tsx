import { X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useIsDesktop } from "../lib/hooks/useMediaQuery";

/**
 * Bottom sheet on phones, centered dialog on desktop. Focus moves in on open and returns on
 * close; Escape and the scrim close it; drag down to dismiss on touch.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const desktop = useIsDesktop();
  const reduce = useReducedMotion();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const returnTo = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    returnTo.current = document.activeElement;
    const t = setTimeout(() => panelRef.current?.focus(), 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      if (returnTo.current instanceof HTMLElement) returnTo.current.focus();
    };
  }, [open, onClose]);

  const panelMotion = desktop
    ? {
        initial: { opacity: 0, scale: reduce ? 1 : 0.97, y: reduce ? 0 : 10 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: reduce ? 1 : 0.98, y: reduce ? 0 : 6 },
      }
    : {
        initial: { y: reduce ? 0 : "100%", opacity: reduce ? 0 : 1 },
        animate: { y: 0, opacity: 1 },
        exit: { y: reduce ? 0 : "100%", opacity: reduce ? 0 : 1 },
      };

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center lg:items-center lg:p-6">
          <motion.div
            className="absolute inset-0 bg-[var(--t-scrim)] backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            {...panelMotion}
            transition={{ type: "spring", stiffness: 380, damping: 38, mass: 0.9 }}
            drag={desktop || reduce ? false : "y"}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 700) onClose();
            }}
            className={`glass-float relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[30px] outline-none lg:rounded-[30px] ${wide ? "lg:max-w-2xl" : "lg:max-w-[480px]"}`}
          >
            <div className="flex shrink-0 items-center justify-between px-5 pt-3 lg:px-6 lg:pt-5">
              <span aria-hidden className="absolute left-1/2 top-2.5 h-1 w-10 -translate-x-1/2 rounded-full bg-[var(--t-line-strong)] lg:hidden" />
              <h2 id={titleId} className="eyebrow pt-4 lg:pt-0">
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="mt-3 grid size-10 place-items-center rounded-full text-fg-2 transition-colors hover:bg-[color-mix(in_srgb,var(--t-fg)_7%,transparent)] hover:text-fg lg:mt-0"
              >
                <X className="size-[18px]" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2 lg:px-6 lg:pb-6">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
