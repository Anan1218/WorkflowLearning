/** Shared UI kit — Stello DESIGN.md conformant. Route all UI through these. */

import type { ButtonHTMLAttributes, ReactNode } from "react";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" }) {
  const styles = {
    primary:
      "bg-cobalt text-white shadow-sm hover:bg-cobalt-press disabled:opacity-40 disabled:hover:bg-cobalt",
    secondary:
      "border border-[#cbd5e1] text-ink hover:border-cobalt hover:text-cobalt disabled:opacity-40",
    ghost: "text-cobalt hover:text-cobalt-press disabled:opacity-40",
  }[variant];
  return (
    <button
      className={`rounded-md px-5 py-2.5 font-schibsted text-[15px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt ${styles} ${className}`}
      {...props}
    />
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-hairline bg-white p-6 ${className}`}>{children}</div>
  );
}

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "cobalt" | "pass" | "flag";
  children: ReactNode;
}) {
  const styles = {
    neutral: "bg-cloud text-bodyslate",
    cobalt: "bg-cobalt/10 text-cobalt",
    pass: "bg-pass/10 text-pass",
    flag: "bg-flag-bg text-flag",
  }[tone];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-fragment text-[10px] uppercase tracking-[0.08em] ${styles}`}>
      {children}
    </span>
  );
}

/** Thin confidence meter with the 0.75 review-threshold tick. */
export function ConfidenceBar({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="font-fragment text-[10px] text-bodyslate/70">unreported</span>;
  }
  const pct = Math.round(value * 100);
  const low = value < 0.75;
  return (
    <div className="flex items-center gap-2" aria-label={`confidence ${pct}%`}>
      <div className="relative h-1 w-24 rounded-full bg-hairline">
        <div
          className={`absolute inset-y-0 left-0 rounded-full ${low ? "bg-flag" : "bg-cobalt"}`}
          style={{ width: `${pct}%` }}
        />
        <div className="absolute inset-y-[-2px] left-[75%] w-px bg-bodyslate/40" title="review threshold 0.75" />
      </div>
      <span className={`font-fragment text-[10px] ${low ? "text-flag" : "text-bodyslate"}`}>
        {value.toFixed(2)}
      </span>
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-hairline bg-cloud/40 px-8 py-14 text-center">
      <p className="font-schibsted text-[15px] font-medium text-ink">{title}</p>
      {hint && <p className="mt-1.5 text-[14px] text-bodyslate">{hint}</p>}
    </div>
  );
}

export function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border border-flag/25 bg-flag-bg px-4 py-3" role="alert">
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
      <div className="eyebrow mb-1.5">{eyebrow}</div>
      <h1 className="font-newsreader text-4xl leading-[0.98] tracking-[-0.02em] text-ink">{title}</h1>
      {sub && <p className="mt-3 max-w-2xl text-[17px] leading-[1.6] text-bodyslate">{sub}</p>}
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
    : "—";

export const fmtValue = (v: unknown): string => {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "number") return v >= 1000 ? fmtMoney(v) : String(v);
  return String(v);
};
