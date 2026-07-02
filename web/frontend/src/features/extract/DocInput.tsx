import { useMutation, useQuery } from "@tanstack/react-query";
import { FileUp } from "lucide-react";
import { useRef, useState } from "react";

import { api } from "../../lib/api";
import { Badge, ErrorBanner, Spinner } from "../../components/ui";

type Tab = "paste" | "upload" | "sample";

export function DocInput({
  text,
  sampleId,
  onText,
  onSample,
  disabled,
}: {
  text: string;
  sampleId: string | null;
  onText: (t: string) => void;
  onSample: (id: string, text: string) => void;
  disabled: boolean;
}) {
  const [tab, setTab] = useState<Tab>("paste");
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: samples } = useQuery({ queryKey: ["samples"], queryFn: api.samples });

  const upload = useMutation({
    mutationFn: (f: File) => api.uploadDocument(f),
    onSuccess: (d) => onText(d.text),
  });

  const pickSample = useMutation({
    mutationFn: (id: string) => api.sample(id),
    onSuccess: (d) => onSample(d.id, d.text),
  });

  return (
    <div className="flex flex-col border border-pale bg-white shadow-[0_14px_34px_-28px_rgba(5,28,44,0.5)]">
      <div className="flex gap-1 border-b border-line bg-wash px-3 pt-2.5" role="tablist" aria-label="Document source">
        {(["paste", "upload", "sample"] as Tab[]).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 font-schibsted text-[14px] transition-colors focus-visible:outline-2 focus-visible:outline-cobalt ${
              tab === t
                ? "border-b-2 border-cobalt font-medium text-cobalt"
                : "text-body hover:text-ink"
            }`}
          >
            {t === "paste" ? "Paste text" : t === "upload" ? "Upload file" : "Sample documents"}
          </button>
        ))}
      </div>

      <div className="p-4">
        {tab === "paste" && (
          <textarea
            value={text}
            onChange={(e) => onText(e.target.value)}
            disabled={disabled}
            placeholder="Paste a broker submission email, WIP schedule, financial summary…"
            rows={13}
            className="w-full resize-y border border-line bg-wash p-3.5 font-fragment text-[12.5px] leading-relaxed text-ink placeholder:text-body/50 focus:border-cobalt focus:outline-none"
            aria-label="Document text"
          />
        )}

        {tab === "upload" && (
          <div className="flex flex-col items-center justify-center gap-3 border border-dashed border-pale bg-wash px-6 py-16">
            <FileUp className="text-body" size={22} aria-hidden />
            <p className="text-[14px] text-body">
              .txt or text-layer .pdf — scanned documents are a roadmap item
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.pdf"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && upload.mutate(e.target.files[0])}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={disabled || upload.isPending}
              className="rounded-md border border-[#cbd5e1] px-4 py-2 font-schibsted text-[14px] text-ink transition-colors hover:border-cobalt hover:text-cobalt focus-visible:outline-2 focus-visible:outline-cobalt"
            >
              {upload.isPending ? <Spinner /> : "Choose file"}
            </button>
            {upload.isError && <ErrorBanner message={(upload.error as Error).message} />}
            {upload.isSuccess && (
              <p className="text-[13px] text-ok">
                Loaded “{upload.data.filename}” — text shown under Paste tab.
              </p>
            )}
          </div>
        )}

        {tab === "sample" && (
          <ul
            className="thin-scroll grid max-h-[340px] grid-cols-1 gap-px overflow-y-auto border border-pale bg-pale md:grid-cols-2"
            aria-label="Sample documents"
          >
            {(samples ?? []).map((s) => (
              <li key={s.id} className="min-w-0">
                <button
                  onClick={() => pickSample.mutate(s.id)}
                  disabled={disabled}
                  aria-pressed={sampleId === s.id}
                  className={`group h-full w-full border-t-4 p-4 text-left transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-cobalt ${
                    sampleId === s.id
                      ? "border-t-cobalt bg-wash"
                      : "border-t-transparent bg-white hover:border-t-cobalt hover:bg-wash"
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="truncate font-schibsted text-[13px] font-medium text-ink">{s.title}</span>
                    {s.has_ground_truth && <Badge tone="cobalt">labeled</Badge>}
                  </div>
                  <p className="line-clamp-2 font-fragment text-[10.5px] leading-relaxed text-body">
                    {s.preview}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {sampleId && (
        <div className="border-t border-line bg-wash px-4 py-2.5">
          <p className="text-[13px] text-body">
            Sample <span className="font-fragment text-[11px]">{sampleId}</span> selected — result will be
            scored against its ground truth.
          </p>
        </div>
      )}
    </div>
  );
}
