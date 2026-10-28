import { LoaderCircle } from "lucide-react";
import { motion } from "motion/react";
import {
  forwardRef,
  useId,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { Link, type LinkProps } from "react-router";

// ─── buttons ──────────────────────────────────────────────────────────────────

export type ButtonVariant = "metal" | "glass" | "ghost" | "danger" | "outline";
export type ButtonSize = "sm" | "md" | "lg";

const BASE =
  "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium tracking-[-0.005em] transition-[transform,filter,background-color,color,opacity] duration-200 ease-[var(--ease-silk)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45";

const SIZES: Record<ButtonSize, string> = {
  sm: "h-10 px-4 text-[14px]",
  md: "h-12 px-6 text-[15px]",
  lg: "h-14 px-7 text-[16px]",
};

const VARIANTS: Record<ButtonVariant, string> = {
  metal: "metal-fill sheen hover:brightness-[1.06]",
  glass: "glass text-fg hover:bg-[color-mix(in_srgb,var(--t-fg)_5%,transparent)]",
  outline: "text-fg shadow-[inset_0_0_0_1px_var(--t-line-strong)] hover:bg-[color-mix(in_srgb,var(--t-fg)_5%,transparent)]",
  ghost: "text-fg-2 hover:bg-[color-mix(in_srgb,var(--t-fg)_6%,transparent)] hover:text-fg",
  danger: "glass text-danger hover:bg-[color-mix(in_srgb,var(--t-danger)_8%,transparent)]",
};

export function buttonClass(variant: ButtonVariant = "glass", size: ButtonSize = "md", extra = ""): string {
  return `${BASE} ${SIZES[size]} ${VARIANTS[variant]} ${extra}`;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "glass", size = "md", loading = false, className = "", children, disabled, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClass(variant, size, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <LoaderCircle className="size-[18px] animate-spin" aria-hidden />}
      {children}
    </button>
  );
});

export function LinkButton({
  variant = "glass",
  size = "md",
  className = "",
  ...rest
}: LinkProps & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <Link className={buttonClass(variant, size, className)} {...rest} />;
}

export function IconButton({
  label,
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`relative inline-grid size-11 shrink-0 place-items-center rounded-full text-fg-2 transition-colors duration-200 hover:bg-[color-mix(in_srgb,var(--t-fg)_7%,transparent)] hover:text-fg ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

// ─── surfaces & text ──────────────────────────────────────────────────────────

export function Card({
  className = "",
  children,
  as: Tag = "div",
}: {
  className?: string;
  children: ReactNode;
  as?: "div" | "section" | "article" | "aside";
}) {
  return <Tag className={`glass relative rounded-[24px] ${className}`}>{children}</Tag>;
}

export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`eyebrow ${className}`}>{children}</p>;
}

export function Badge({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warn" | "danger" | "accent";
  className?: string;
}) {
  const tones = {
    neutral: "text-fg-2 bg-[color-mix(in_srgb,var(--t-fg)_6%,transparent)] shadow-[inset_0_0_0_1px_var(--t-line)]",
    success: "text-success bg-[color-mix(in_srgb,var(--t-success)_10%,transparent)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--t-success)_22%,transparent)]",
    warn: "text-warn bg-[color-mix(in_srgb,var(--t-warn)_10%,transparent)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--t-warn)_22%,transparent)]",
    danger: "text-danger bg-[color-mix(in_srgb,var(--t-danger)_10%,transparent)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--t-danger)_22%,transparent)]",
    accent: "text-accent bg-[color-mix(in_srgb,var(--t-accent)_10%,transparent)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--t-accent)_22%,transparent)]",
  } as const;
  return (
    <span
      className={`inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 font-semibold text-[10.5px] uppercase tracking-[0.12em] ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function Hairline({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`h-px w-full bg-[linear-gradient(90deg,transparent,var(--t-line-strong)_18%,var(--t-line-strong)_82%,transparent)] ${className}`}
    />
  );
}

export function Spinner({ className = "size-5" }: { className?: string }) {
  return <LoaderCircle className={`animate-spin text-fg-2 ${className}`} aria-hidden />;
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`skeleton-line h-3 ${className}`} />;
}

// ─── form controls ────────────────────────────────────────────────────────────

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  trailing?: ReactNode;
  hideLabel?: boolean;
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, hint, error, trailing, hideLabel = false, className = "", id, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hintId = `${inputId}-hint`;
  return (
    <div className="grid grid-cols-1 gap-2">
      <label htmlFor={inputId} className={hideLabel ? "sr-only" : "text-[14px] font-medium text-fg-2"}>
        {label}
      </label>
      <div
        className={`relative flex items-center rounded-2xl bg-[color-mix(in_srgb,var(--t-surface-2)_70%,transparent)] shadow-[inset_0_0_0_1px_var(--t-line-strong)] transition-shadow duration-200 focus-within:shadow-[inset_0_0_0_1px_var(--t-accent),0_0_0_4px_color-mix(in_srgb,var(--t-accent)_16%,transparent)] ${error ? "shadow-[inset_0_0_0_1px_var(--t-danger)]" : ""}`}
      >
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={hint || error ? hintId : undefined}
          className={`h-13 w-full min-w-0 bg-transparent px-4 text-[16px] text-fg outline-none placeholder:text-fg-4 ${className}`}
          {...rest}
        />
        {trailing && <div className="flex shrink-0 items-center pr-1.5">{trailing}</div>}
      </div>
      {(error || hint) && (
        <p id={hintId} className={`text-[13.5px] leading-snug ${error ? "text-danger" : "text-fg-3"}`}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
});

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  layoutId,
}: {
  value: T;
  options: { value: T; label: string; icon?: ReactNode }[];
  onChange: (v: T) => void;
  label: string;
  layoutId: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="relative grid auto-cols-fr grid-flow-col rounded-full bg-[color-mix(in_srgb,var(--t-fg)_5%,transparent)] p-1 shadow-[inset_0_0_0_1px_var(--t-line)]"
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`relative z-0 flex h-10 items-center justify-center gap-2 rounded-full px-3 text-[14px] font-medium transition-colors duration-200 ${active ? "text-fg" : "text-fg-3 hover:text-fg-2"}`}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className="glass absolute inset-0 -z-10 rounded-full"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
              />
            )}
            {o.icon}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** A row inside a settings-style list. */
export function Row({
  icon,
  title,
  detail,
  trailing,
  onClick,
  href,
  disabled,
}: {
  icon?: ReactNode;
  title: ReactNode;
  detail?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
}) {
  const inner = (
    <>
      {icon && (
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[color-mix(in_srgb,var(--t-fg)_6%,transparent)] text-fg-2 shadow-[inset_0_0_0_1px_var(--t-line)]">
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-[15.5px] font-medium leading-snug text-fg">{title}</span>
        {detail && <span className="mt-0.5 block text-[13.5px] leading-snug text-fg-3">{detail}</span>}
      </span>
      {trailing}
    </>
  );
  const cls = `flex min-h-16 w-full items-center gap-3.5 rounded-2xl px-3 py-2.5 transition-colors duration-200 ${disabled ? "opacity-50" : onClick || href ? "hover:bg-[color-mix(in_srgb,var(--t-fg)_4%,transparent)]" : ""}`;
  if (href) {
    return (
      <a className={cls} href={href} target="_blank" rel="noreferrer">
        {inner}
      </a>
    );
  }
  if (onClick) {
    return (
      <button type="button" className={cls} onClick={onClick} disabled={disabled}>
        {inner}
      </button>
    );
  }
  return <div className={cls}>{inner}</div>;
}
