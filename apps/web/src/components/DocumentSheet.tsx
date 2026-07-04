import { useMemo, type ReactNode } from "react";

import { parseSampleDoc, type SampleDocBlock, type SampleDocPair } from "../features/extract/sampleDoc";

type DocumentHighlight = {
  id: string;
  text: string;
};

type TextSegment = {
  key: string;
  text: string;
  marked?: boolean;
  highlightId?: string;
};

function isRightAlignedCell(value: string) {
  const trimmed = value.trim();
  return /^(?:\$|-\$|\d)/.test(trimmed) || trimmed.endsWith("%");
}

export function DocumentSheet({
  text,
  highlights = [],
}: {
  text: string;
  highlights?: DocumentHighlight[];
}) {
  const blocks = useMemo(() => parseSampleDoc(text), [text]);
  const usedHighlightIds = new Set<string>();

  function renderText(value: string): ReactNode {
    let segments: TextSegment[] = [{ key: "text-0", text: value }];

    for (const highlight of highlights) {
      const needle = highlight.text;
      if (!needle || usedHighlightIds.has(highlight.id)) continue;

      const needleLower = needle.toLowerCase();
      let found = false;

      segments = segments.flatMap((segment, segmentIndex) => {
        if (found || segment.marked) return [segment];

        const matchIndex = segment.text.toLowerCase().indexOf(needleLower);
        if (matchIndex === -1) return [segment];

        found = true;
        usedHighlightIds.add(highlight.id);

        const before = segment.text.slice(0, matchIndex);
        const match = segment.text.slice(matchIndex, matchIndex + needle.length);
        const after = segment.text.slice(matchIndex + needle.length);
        const nextSegments: TextSegment[] = [];

        if (before) nextSegments.push({ key: `${segment.key}-${segmentIndex}-before`, text: before });
        nextSegments.push({
          key: `${segment.key}-${segmentIndex}-${highlight.id}`,
          text: match,
          marked: true,
          highlightId: highlight.id,
        });
        if (after) nextSegments.push({ key: `${segment.key}-${segmentIndex}-after`, text: after });

        return nextSegments;
      });
    }

    return segments.map((segment) =>
      segment.marked ? (
        <mark
          key={segment.key}
          id={segment.highlightId}
          className="bg-cobalt/10 border-b-2 border-cobalt text-inherit"
        >
          {segment.text}
        </mark>
      ) : (
        segment.text
      ),
    );
  }

  function renderHeaderRow({ label, value }: SampleDocPair) {
    const isSubject = label.toLowerCase() === "subject";

    return (
      <div key={label} className="grid grid-cols-[64px_1fr] gap-2">
        <div className="pt-[3px] font-fragment text-[9px] uppercase tracking-[0.14em] text-body/60">
          {renderText(label)}
        </div>
        <div className={`font-schibsted text-ink ${isSubject ? "text-[14px] font-medium" : "text-[13px]"}`}>
          {renderText(value)}
        </div>
      </div>
    );
  }

  function renderBlock(block: SampleDocBlock, index: number) {
    if (block.type === "headers") {
      return (
        <div key={`headers-${index}`}>
          <div className="space-y-1.5">{block.headers.map(renderHeaderRow)}</div>
          <div className="mb-5 mt-4 border-t border-line" />
        </div>
      );
    }

    if (block.type === "paragraph") {
      return (
        <p key={`paragraph-${index}`} className="mb-3.5 font-schibsted text-[13.5px] leading-[1.65] text-body">
          {renderText(block.text)}
        </p>
      );
    }

    if (block.type === "fields") {
      return (
        <dl key={`fields-${index}`} className="mb-3.5 border-l-2 border-cobalt/30 pl-3">
          {block.fields.map((field) => (
            <div key={field.label} className="grid grid-cols-[minmax(120px,auto)_1fr] gap-4 py-0.5">
              <dt className="font-schibsted text-[13px] text-body">{renderText(field.label)}</dt>
              <dd className="text-left font-fragment text-[12.5px] text-ink">{renderText(field.value)}</dd>
            </div>
          ))}
        </dl>
      );
    }

    return (
      <div key={`table-${index}`} className="mb-3.5 overflow-x-auto">
        <table className="w-full border border-line text-left">
          <thead>
            <tr>
              {block.headers.map((header) => (
                <th
                  key={header}
                  className="border-b border-line bg-wash px-2.5 py-1.5 font-fragment text-[9px] uppercase tracking-[0.12em] text-body/60"
                >
                  {renderText(header)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, rowIndex) => (
              <tr key={`${row.join("|")}-${rowIndex}`}>
                {row.map((cell, cellIndex) => (
                  <td
                    key={`${cell}-${cellIndex}`}
                    className={`border-b border-line/60 px-2.5 py-1.5 font-fragment text-[11.5px] text-ink ${
                      isRightAlignedCell(cell) ? "text-right" : "text-left"
                    }`}
                  >
                    {renderText(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <article className="mx-auto w-full max-w-[620px] border border-pale bg-white px-8 py-7 shadow-[0_18px_44px_-30px_rgba(30,58,92,0.45)]">
      {blocks.map(renderBlock)}
    </article>
  );
}
