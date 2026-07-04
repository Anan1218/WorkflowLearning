import { useMutation, useQuery } from "@tanstack/react-query";
import { Eye, FileUp } from "lucide-react";
import { useRef, useState } from "react";

import { api, type SampleMeta } from "../../lib/api";
import { Badge, Spinner } from "../../components/ui";
import { SamplePreviewModal } from "./SamplePreviewModal";

type Tab = "doc" | "sample";

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
  const [tab, setTab] = useState<Tab>("doc");
  const [preview, setPreview] = useState<{ id: string; title: string; text: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
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

  const openPreview = async (sample: SampleMeta) => {
    const result = await api.sample(sample.id);
    setPreview({ id: sample.id, title: sample.title, text: result.text });
  };

  const loadFile = (file: File | undefined) => {
    if (!file || disabled) return;
    upload.mutate(file);
  };

  return (
    <div className="flex flex-col border border-pale bg-white shadow-[0_14px_34px_-28px_rgba(5,28,44,0.5)]">
      <div className="flex gap-1 border-b border-line bg-wash px-3 pt-2.5" role="tablist" aria-label="Document source">
        {(["doc", "sample"] as Tab[]).map((t) => (
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
            {t === "doc" ? "Document" : "Sample documents"}
          </button>
        ))}
      </div>

      <div className="h-[360px] p-4">
        {tab === "doc" && (
          <div className="flex h-full flex-col gap-2">
            <div
              className="relative flex-1 min-h-0"
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                loadFile(e.dataTransfer.files[0]);
              }}
            >
              <textarea
                value={text}
                onChange={(e) => onText(e.target.value)}
                disabled={disabled}
                placeholder="Paste a broker submission email, WIP schedule, financial summary… or drop a file here"
                className="h-full w-full resize-none border border-line bg-wash p-3.5 font-fragment text-[12.5px] leading-relaxed text-ink placeholder:text-body/50 focus:border-cobalt focus:outline-none"
                aria-label="Document text"
              />
              {isDragging && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center border-2 border-dashed border-cobalt bg-cobalt/5">
                  <span className="font-schibsted text-[14px] text-cobalt">Drop .txt or .pdf</span>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".txt,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    loadFile(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={disabled || upload.isPending}
                  className="inline-flex items-center gap-1.5 font-schibsted text-[13px] text-body underline decoration-dotted underline-offset-2 transition-colors hover:text-cobalt disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <FileUp size={13} aria-hidden />
                  Browse a file
                </button>
              </div>
              <div className="min-w-0 text-right">
                {upload.isPending && <Spinner />}
                {upload.isError && (
                  <p className="truncate text-[12.5px] text-red-600">{(upload.error as Error).message}</p>
                )}
                {upload.isSuccess && (
                  <p className="truncate text-[12.5px] text-ok">Loaded "{upload.data.filename}"</p>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === "sample" && (
          <ul
            className="thin-scroll grid h-full grid-cols-1 content-start gap-px overflow-y-auto border border-pale bg-pale md:grid-cols-2"
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
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label={"Preview " + s.title}
                      className="shrink-0 cursor-pointer text-body/60 hover:text-cobalt focus-visible:outline-1 focus-visible:outline-cobalt"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        void openPreview(s);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.stopPropagation();
                          e.preventDefault();
                          void openPreview(s);
                        }
                      }}
                    >
                      <Eye size={13} aria-hidden />
                    </span>
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

      <div className="border-t border-line bg-wash px-4 py-2.5">
        <p className="truncate text-[13px] text-body">
          {sampleId ? (
            <>
              Sample <span className="font-fragment text-[11px]">{sampleId}</span> selected. Result will be
              scored against its ground truth.
            </>
          ) : (
            <span className="text-body/60">
              Paste, upload, or pick a labeled sample; samples score against ground truth.
            </span>
          )}
        </p>
      </div>
      {preview && (
        <SamplePreviewModal
          sample={preview}
          onClose={() => setPreview(null)}
          onUse={() => {
            pickSample.mutate(preview.id);
            setPreview(null);
          }}
        />
      )}
    </div>
  );
}
