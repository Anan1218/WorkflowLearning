import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { Button } from "../../components/ui";
import { parseSampleDoc, type SampleDocBlock, type SampleDocPair } from "./sampleDoc";

type PreviewMode = "formatted" | "raw";

function isRightAlignedCell(value: string) {
  const trimmed = value.trim();
  return /^(?:\$|-\$|\d)/.test(trimmed) || trimmed.endsWith("%");
}

function renderHeaderRow({ label, value }: SampleDocPair) {
  const isSubject = label.toLowerCase() === "subject";

  return (
    <div key={label} className="grid grid-cols-[64px_1fr] gap-2">
      <div className="pt-[3px] font-fragment text-[9px] uppercase tracking-[0.14em] text-body/60">
        {label}
      </div>
      <div className={`font-schibsted text-ink ${isSubject ? "text-[14px] font-medium" : "text-[13px]"}`}>
        {value}
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
        {block.text}
      </p>
    );
  }

  if (block.type === "fields") {
    return (
      <dl key={`fields-${index}`} className="mb-3.5 border-l-2 border-cobalt/30 pl-3">
        {block.fields.map((field) => (
          <div key={field.label} className="grid grid-cols-[minmax(120px,auto)_1fr] gap-4 py-0.5">
            <dt className="font-schibsted text-[13px] text-body">{field.label}</dt>
            <dd className="text-left font-fragment text-[12.5px] text-ink">{field.value}</dd>
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
                {header}
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
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SamplePreviewModal({
  sample,
  onClose,
  onUse,
}: {
  sample: { id: string; title: string; text: string };
  onClose: () => void;
  onUse: () => void;
}) {
  const [mode, setMode] = useState<PreviewMode>("formatted");
  const blocks = useMemo(() => parseSampleDoc(sample.text), [sample.text]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center" role="dialog" aria-modal="true" aria-label={sample.title}>
      <div className="absolute inset-0 bg-navy-deep/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="pop-in relative flex max-h-[80vh] w-[min(720px,92vw)] flex-col border border-pale bg-white shadow-[0_30px_70px_-45px_rgba(30,58,92,0.5)]">
        <div className="flex items-start gap-4 border-b border-line bg-wash px-5 py-3">
          <div className="min-w-0 flex-1">
            <div className="eyebrow">Sample document · {sample.id}</div>
            <div className="font-newsreader text-[1.2rem] leading-tight text-ink">{sample.title}</div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="flex gap-1" role="tablist" aria-label="Preview mode">
              {(["formatted", "raw"] as const).map((previewMode) => (
                <button
                  key={previewMode}
                  type="button"
                  role="tab"
                  aria-selected={mode === previewMode}
                  onClick={() => setMode(previewMode)}
                  className={`px-3 py-1 font-schibsted text-[12px] transition-colors focus-visible:outline-2 focus-visible:outline-cobalt ${
                    mode === previewMode ? "bg-white text-cobalt ring-1 ring-pale" : "text-body hover:text-ink"
                  }`}
                >
                  {previewMode === "formatted" ? "Formatted" : "Raw"}
                </button>
              ))}
            </div>
            <button
              type="button"
              aria-label="Close preview"
              onClick={onClose}
              className="text-body transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-cobalt"
            >
              <X size={16} aria-hidden />
            </button>
          </div>
        </div>
        <div className="thin-scroll flex-1 overflow-y-auto bg-wash px-5 py-4">
          {mode === "formatted" ? (
            <article className="mx-auto w-full max-w-[620px] border border-pale bg-white px-8 py-7 shadow-[0_18px_44px_-30px_rgba(30,58,92,0.45)]">
              {blocks.map(renderBlock)}
            </article>
          ) : (
            <pre className="whitespace-pre-wrap font-fragment text-[12px] leading-relaxed text-body">
              {sample.text}
            </pre>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-line px-5 py-3">
          <Button variant="secondary" onClick={onClose} className="!px-4 !py-2 text-[14px]">
            Close
          </Button>
          <Button onClick={onUse} className="!px-4 !py-2 text-[14px]">
            Use this sample
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
