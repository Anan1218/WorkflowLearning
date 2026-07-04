import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { DocumentSheet } from "../../components/DocumentSheet";
import { Button } from "../../components/ui";

type PreviewMode = "formatted" | "raw";

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
            <DocumentSheet text={sample.text} />
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
