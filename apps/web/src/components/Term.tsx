/** Glossary hint primitives: <Term> (dotted-underline + popover) and
 *  <GlossaryText> (auto-linkifies known terms in a prose string). */

import { useState, type ReactNode } from "react";

import { GLOSSARY, MATCHERS } from "../lib/glossary";

export function Term({
  k,
  children,
  focusable = true,
}: {
  k: string;
  children: ReactNode;
  /** false when rendered inside an interactive element (e.g. a filter chip) */
  focusable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const entry = GLOSSARY[k];
  if (!entry) return <>{children}</>;

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <span
        tabIndex={focusable ? 0 : undefined}
        className="cursor-help underline decoration-dotted decoration-1 underline-offset-2 opacity-95 focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-cobalt"
        aria-describedby={open ? `gloss-${k}` : undefined}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
      >
        {children}
      </span>
      {open && (
        <span
          id={`gloss-${k}`}
          role="tooltip"
          className="absolute bottom-full left-1/2 z-50 mb-2 block w-[270px] -translate-x-1/2 border border-pale bg-white p-3.5 text-left shadow-[0_18px_40px_-24px_rgba(30,58,92,0.45)]"
        >
          <span className="mb-1 block font-fragment text-[9px] uppercase tracking-[0.14em] text-cobalt">
            {entry.term}
          </span>
          <span className="block font-sans text-[12.5px] font-normal normal-case leading-[1.55] tracking-normal text-body">
            {entry.def}
          </span>
        </span>
      )}
    </span>
  );
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const BOUNDARY = /[a-zA-Z0-9_]/;

/** Wraps the first occurrence of each known glossary term in a string with <Term>. */
export function GlossaryText({ text }: { text: string }) {
  // Collect non-overlapping matches, longest terms first, one per glossary key.
  const taken: { start: number; end: number; key: string }[] = [];
  const usedKeys = new Set<string>();

  for (const { text: needle, key, cs } of MATCHERS) {
    if (usedKeys.has(key)) continue;
    const re = new RegExp(escapeRe(needle), cs ? "g" : "gi");
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      const start = m.index;
      const end = start + m[0].length;
      const beforeOk = start === 0 || !BOUNDARY.test(text[start - 1]);
      const afterOk = end === text.length || !BOUNDARY.test(text[end]);
      const overlaps = taken.some((t) => start < t.end && end > t.start);
      if (beforeOk && afterOk && !overlaps) {
        taken.push({ start, end, key });
        usedKeys.add(key);
        break;
      }
    }
  }

  if (!taken.length) return <>{text}</>;
  taken.sort((a, b) => a.start - b.start);

  const parts: ReactNode[] = [];
  let cursor = 0;
  taken.forEach(({ start, end, key }, i) => {
    if (start > cursor) parts.push(text.slice(cursor, start));
    parts.push(
      <Term key={`${key}-${i}`} k={key}>
        {text.slice(start, end)}
      </Term>,
    );
    cursor = end;
  });
  if (cursor < text.length) parts.push(text.slice(cursor));
  return <>{parts}</>;
}
