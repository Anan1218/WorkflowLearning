/** Shared UI kit for the Stello-Demos design language. Route all UI through these.
 *  Idioms: square-cornered panels (rounded only on buttons/chips), border-pale
 *  hairlines, navy-tinted directional shadows, Fragment Mono for labels/numbers. */

import { ArrowRight } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { GlossaryText } from "./Term";

export function Button({
  variant = "primary",
  withArrow = false,
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  withArrow?: boolean;
}) {
  const styles = {
    primary:
      "bg-cobalt text-white shadow-sm hover:bg-cobalt-hover disabled:opacity-40 disabled:hover:bg-cobalt",
    secondary:
      "border border-[#cbd5e1] text-ink hover:border-cobalt hover:text-cobalt disabled:opacity-40",
    ghost: "text-cobalt hover:text-cobalt-hover disabled:opacity-40",
  }[variant];
  return (
    <button
      className={`group inline-flex items-center justify-center gap-2 rounded-md px-5 py-2.5 font-schibsted text-[15px] font-normal transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt ${styles} ${className}`}
      {...props}
    >
      {children}
      {withArrow && (
        <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" aria-hidden />
      )}
    </button>
  );
}

/** Square panel. tier: "flat" (hairline only) | "card" | "stage" (hero surfaces). */
export function Card({
  children,
  tier = "card",
  className = "",
}: {
  children: ReactNode;
  tier?: "flat" | "card" | "stage";
  className?: string;
}) {
  const shadow = {
    flat: "",
    card: "shadow-[0_14px_34px_-28px_rgba(5,28,44,0.5)]",
    stage: "shadow-[0_30px_70px_-45px_rgba(30,58,92,0.5)]",
  }[tier];
  return <div className={`border border-pale bg-white p-6 ${shadow} ${className}`}>{children}</div>;
}

/** Square solid chip for the Stello-Demos label idiom. */
export function Chip({
  tone = "cobalt",
  children,
}: {
  tone?: "cobalt" | "navy";
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex w-fit items-center px-2.5 py-1 font-fragment text-[9px] font-semibold uppercase tracking-[0.2em] text-white ${
        tone === "cobalt" ? "bg-cobalt" : "bg-navy"
      }`}
    >
      {children}
    </span>
  );
}

/** Rounded tint pill for statuses. */
export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "cobalt" | "ok" | "flag";
  children: ReactNode;
}) {
  const styles = {
    neutral: "bg-navy/5 text-navy",
    cobalt: "bg-cobalt/10 text-cobalt",
    ok: "bg-ok/10 text-ok",
    flag: "bg-flag/10 text-flag",
  }[tone];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-fragment text-[10px] uppercase tracking-[0.12em] ${styles}`}
    >
      {children}
    </span>
  );
}

/** Thin confidence meter with the 0.75 review-threshold tick. */
export function ConfidenceBar({ value }: { value: number | null }) {
  if (value === null) {
    return (
      <span className="font-fragment text-[10px] uppercase tracking-[0.12em] text-body/60">
        unreported
      </span>
    );
  }
  const pct = Math.round(value * 100);
  const low = value < 0.75;
  return (
    <div className="flex items-center gap-2" aria-label={`confidence ${pct}%`}>
      <div className="relative h-1 w-24 bg-line">
        <div
          className={`absolute inset-y-0 left-0 ${low ? "bg-flag" : "bg-cobalt"}`}
          style={{ width: `${pct}%` }}
        />
        <div className="absolute inset-y-[-2px] left-[75%] w-px bg-body/40" title="Review threshold 0.75" />
      </div>
      <span className={`font-fragment text-[10px] ${low ? "text-flag" : "text-body"}`}>
        {value.toFixed(2)}
      </span>
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="border border-dashed border-pale bg-wash px-8 py-14 text-center">
      <p className="font-schibsted text-[15px] font-medium text-ink">{title}</p>
      {hint && <p className="mt-1.5 text-[14px] text-body">{hint}</p>}
    </div>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      className="flex items-center justify-between gap-4 border border-flag/25 bg-flag/5 px-4 py-3"
      role="alert"
    >
      <p className="text-[14px] text-flag">{message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry} className="!px-3.5 !py-1.5 text-[13px]">
          Retry
        </Button>
      )}
    </div>
  );
}

export function PageHeader({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <header className="mb-8">
      <div className="rise" style={{ animationDelay: "40ms" }}>
        <Chip>
          <GlossaryText text={eyebrow} />
        </Chip>
      </div>
      <h1
        className="rise mt-5 font-newsreader text-[2.4rem] font-normal leading-[1.04] tracking-[-0.01em] text-ink"
        style={{ animationDelay: "120ms" }}
      >
        {title}
      </h1>
      {sub && (
        <p
          className="rise mt-4 max-w-2xl text-[15.5px] leading-[1.6] text-body"
          style={{ animationDelay: "200ms" }}
        >
          <GlossaryText text={sub} />
        </p>
      )}
    </header>
  );
}

export function Spinner() {
  return (
    <span
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-cobalt/30 border-t-cobalt"
      role="status"
      aria-label="loading"
    />
  );
}

export const fmtMoney = (v: unknown): string =>
  typeof v === "number"
    ? v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
    : "–";

export const fmtValue = (v: unknown): string => {
  if (v === null || v === undefined || v === "") return "–";
  if (typeof v === "number") return v >= 1000 ? fmtMoney(v) : String(v);
  return String(v);
};
