export type Evidence = { start: number; end: number };

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const isEmpty = (value: unknown): boolean => value === null || value === undefined || value === "";

const toNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;

  const cleaned = value.trim().replace(/[$,\s]/g, "");
  if (!cleaned) return null;

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
};

const withCommas = (value: string): string => value.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

const findPattern = (doc: string, source: string): Evidence | null => {
  const match = new RegExp(`(^|\\D)(${source})(?!\\d)`, "i").exec(doc);
  if (!match || match.index === undefined) return null;

  const start = match.index + match[1].length;
  const end = start + match[2].length;
  return { start, end };
};

export function findEvidence(value: unknown, doc: string): Evidence | null {
  if (isEmpty(value) || !doc) return null;

  const numeric = toNumber(value);
  if (numeric !== null) {
    const integerPart = String(Math.trunc(Math.abs(numeric)));
    const commaPattern = `\\$?${escapeRegex(withCommas(integerPart))}(?:\\.\\d+)?`;
    const plainPattern = `${escapeRegex(integerPart)}(?:\\.\\d+)?`;

    return findPattern(doc, commaPattern) ?? findPattern(doc, plainPattern);
  }

  const text = String(value).trim();
  if (!text) return null;

  const index = doc.toLowerCase().indexOf(text.toLowerCase());
  return index === -1 ? null : { start: index, end: index + text.length };
}

export function snippet(
  doc: string,
  ev: Evidence,
  radius = 45,
): { before: string; match: string; after: string } {
  let beforeStart = Math.max(0, ev.start - radius);
  let afterEnd = Math.min(doc.length, ev.end + radius);

  if (beforeStart > 0) {
    const boundary = doc.slice(beforeStart, ev.start).search(/\s/);
    if (boundary >= 0) beforeStart += boundary + 1;
  }

  if (afterEnd < doc.length) {
    const lastBoundary = doc.slice(ev.end, afterEnd).search(/\s\S*$/);
    if (lastBoundary > 0) afterEnd = ev.end + lastBoundary;
  }

  return {
    before: doc.slice(beforeStart, ev.start),
    match: doc.slice(ev.start, ev.end),
    after: doc.slice(ev.end, afterEnd),
  };
}
