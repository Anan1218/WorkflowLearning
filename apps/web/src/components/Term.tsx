/** Glossary hint primitives: <Term> (dotted-underline + popover) and
 *  <GlossaryText> (auto-linkifies known terms in a prose string).
 *  The popover renders in a portal at document.body with viewport coordinates,
 *  so it floats above everything and is never clipped by scroll containers. */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { GLOSSARY, MATCHERS } from "../lib/glossary";

const POP_W = 280;

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
  const [pos, setPos] = useState<{ left: number; top: number; below: boolean } | null>(null);
  const anchorRef = useRef<HTMLSpanElement>(null);
  const entry = GLOSSARY[k];

  const open = () => {
    const r = anchorRef.current?.getBoundingClientRect();
    if (!r) return;
    const below = r.top < 170;
    setPos({
      left: Math.min(Math.max(r.left + r.width / 2 - POP_W / 2, 8), window.innerWidth - POP_W - 8),
      top: below ? r.bottom + 8 : r.top - 8,
      below,
    });
  };
  const close = () => setPos(null);

  useEffect(() => {
    if (!pos) return;
    const onScroll = () => close();
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, [pos]);

  if (!entry) return <>{children}</>;

  return (
    <>
      <span
        ref={anchorRef}
        tabIndex={focusable ? 0 : undefined}
        className="cursor-help underline decoration-dotted decoration-1 underline-offset-2 opacity-95 focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-cobalt"
        aria-describedby={pos ? `gloss-${k}` : undefined}
        onMouseEnter={open}
        onMouseLeave={close}
        onFocus={open}
        onBlur={close}
        onKeyDown={(e) => e.key === "Escape" && close()}
      >
        {children}
      </span>
      {pos &&
        createPortal(
          <span
            id={`gloss-${k}`}
            role="tooltip"
            className="pointer-events-none fixed z-[100] block border border-pale bg-white p-3.5 text-left shadow-[0_18px_40px_-24px_rgba(30,58,92,0.45)]"
            style={{
              width: POP_W,
              left: pos.left,
              top: pos.top,
              transform: pos.below ? undefined : "translateY(-100%)",
            }}
          >
            <span className="mb-1 block font-fragment text-[9px] uppercase tracking-[0.14em] text-cobalt">
              {entry.term}
            </span>
            <span className="block font-sans text-[12.5px] font-normal normal-case leading-[1.55] tracking-normal text-body">
              {entry.def}
            </span>
          </span>,
          document.body,
        )}
    </>
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
