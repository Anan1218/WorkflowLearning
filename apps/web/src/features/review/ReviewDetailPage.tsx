import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { api } from "../../lib/api";
import { DocumentSheet } from "../../components/DocumentSheet";
import { Badge, Button, Card, ConfidenceBar, EmptyState, Spinner, fmtValue } from "../../components/ui";
import { GlossaryText } from "../../components/Term";
import { findEvidence, snippet, type Evidence } from "../../lib/evidence";
import { fieldLabel } from "../../lib/fieldLabels";

type SourceDocumentMode = "formatted" | "raw";

function EvidenceDocument({
  doc,
  evidenceByPath,
}: {
  doc: string;
  evidenceByPath: Record<string, Evidence | null>;
}) {
  const ranges = Object.entries(evidenceByPath)
    .filter((entry): entry is [string, Evidence] => entry[1] !== null)
    .map(([path, evidence]) => ({ path, evidence }))
    .sort((a, b) => a.evidence.start - b.evidence.start);

  const segments: ReactNode[] = [];
  let cursor = 0;

  for (const { path, evidence } of ranges) {
    if (evidence.start < cursor) continue;
    if (cursor < evidence.start) {
      segments.push(doc.slice(cursor, evidence.start));
    }
    segments.push(
      <mark
        key={path}
        id={`evidence-${path}`}
        className="bg-cobalt/10 border-b-2 border-cobalt text-inherit"
      >
        {doc.slice(evidence.start, evidence.end)}
      </mark>,
    );
    cursor = evidence.end;
  }

  if (cursor < doc.length) segments.push(doc.slice(cursor));

  return <>{segments}</>;
}

function scrollToEvidence(path: string) {
  const element = document.getElementById(`evidence-${path}`);
  if (!element) return;

  element.scrollIntoView({ behavior: "smooth", block: "center" });
  element.classList.remove("evidence-pulse");
  void element.offsetWidth;
  element.classList.add("evidence-pulse");
  window.setTimeout(() => element.classList.remove("evidence-pulse"), 1200);
}

export function ReviewDetailPage() {
  const { itemId } = useParams<{ itemId: string }>();
  const qc = useQueryClient();
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [sourceMode, setSourceMode] = useState<SourceDocumentMode>("formatted");

  const { data: item, isLoading } = useQuery({
    queryKey: ["review-item", itemId],
    queryFn: () => api.reviewItem(itemId!),
    enabled: !!itemId,
  });

  const decide = useMutation({
    mutationFn: (d: { path: string; action: string; override_value?: unknown }) =>
      api.decide(itemId!, [d]),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["review-item", itemId] });
      qc.invalidateQueries({ queryKey: ["review"] });
    },
  });

  const evidenceByPath = useMemo<Record<string, Evidence | null>>(() => {
    if (!item) return {};

    return Object.fromEntries(
      item.flagged_fields.map((field) => [
        field.path,
        findEvidence(field.value, item.document_text),
      ]),
    );
  }, [item]);

  const sourceHighlights = useMemo(() => {
    if (!item) return [];

    return item.flagged_fields.flatMap((field) => {
      const evidence = evidenceByPath[field.path];
      if (!evidence) return [];

      return [
        {
          id: `evidence-${field.path}`,
          text: item.document_text.slice(evidence.start, evidence.end),
        },
      ];
    });
  }, [evidenceByPath, item]);

  if (isLoading)
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    );
  if (!item) return <EmptyState title="Review item not found" />;

  const rationales = item.rationales ?? [];
  const guidelineIdsForPath = (path: string) =>
    rationales.filter((r) => r.fields.includes(path)).map((r) => r.guideline_id);

  return (
    <div className="pop-in mx-auto w-full max-w-6xl">
      <Link
        to="/review"
        className="mb-5 inline-flex items-center gap-1.5 font-schibsted text-[14px] text-body hover:text-ink"
      >
        <ArrowLeft size={15} aria-hidden /> Back to queue
      </Link>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="font-newsreader text-[2rem] font-normal leading-[1.04] tracking-[-0.01em] text-ink">
          {item.submission.principal?.name ?? "Unknown principal"}
        </h1>
        <Badge tone={item.status === "pending" ? "flag" : "ok"}>{item.status}</Badge>
        <Badge tone="neutral">{item.model_id}</Badge>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="thin-scroll max-h-[620px] overflow-y-auto border border-pale bg-wash p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="eyebrow">Source document</div>
            <div className="flex gap-1" role="tablist" aria-label="Source document mode">
              {(["formatted", "raw"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  role="tab"
                  aria-selected={sourceMode === mode}
                  onClick={() => setSourceMode(mode)}
                  className={`px-3 py-1 font-schibsted text-[12px] transition-colors focus-visible:outline-2 focus-visible:outline-cobalt ${
                    sourceMode === mode ? "bg-white text-cobalt ring-1 ring-pale" : "text-body hover:text-ink"
                  }`}
                >
                  {mode === "formatted" ? "Formatted" : "Raw"}
                </button>
              ))}
            </div>
          </div>
          {sourceMode === "formatted" ? (
            <DocumentSheet text={item.document_text} highlights={sourceHighlights} />
          ) : (
            <pre className="whitespace-pre-wrap font-fragment text-[12px] leading-relaxed text-body">
              <EvidenceDocument doc={item.document_text} evidenceByPath={evidenceByPath} />
            </pre>
          )}
        </div>

        <div className="flex flex-col gap-3.5">
          <Card className="!p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="eyebrow">Why this is here</div>
              <Link
                to="/pipeline#sop-uw-01"
                className="font-schibsted text-[12px] text-cobalt underline decoration-dotted underline-offset-2"
              >
                View SOP register
              </Link>
            </div>
            {rationales.length ? (
              <div className="flex flex-col gap-3">
                {rationales.map((rationale) => (
                  <div key={rationale.guideline_id} className="border-t border-line pt-3 first:border-t-0 first:pt-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/pipeline#sop-${rationale.guideline_id.toLowerCase()}`}
                        title="View SOP"
                        className="inline-flex items-center border border-cobalt/45 px-2 py-0.5 font-fragment text-[9px] font-semibold uppercase tracking-[0.16em] text-cobalt hover:bg-cobalt/10"
                      >
                        {rationale.guideline_id}
                      </Link>
                      <span className="font-schibsted text-[14px] font-medium text-ink">
                        {rationale.title}
                      </span>
                      <span
                        className={`ml-auto font-fragment text-[9px] uppercase tracking-[0.14em] ${
                          rationale.severity === "route" ? "text-cobalt" : "text-body/50"
                        }`}
                      >
                        {rationale.route}
                      </span>
                    </div>
                    <p className="mt-1.5 text-[13px] leading-[1.55] text-body">
                      <GlossaryText text={rationale.reason} />
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[13px] leading-[1.55] text-body">
                This legacy queue item predates documented SOP rationales.
              </p>
            )}
          </Card>

          <div className="eyebrow">Flagged fields · {item.flagged_fields.length}</div>
          {item.flagged_fields.map((f) => {
            const decision = item.decisions[f.path];
            const guidelineIds = guidelineIdsForPath(f.path);
            const evidence = evidenceByPath[f.path] ?? null;
            const sourceSnippet = evidence ? snippet(item.document_text, evidence) : null;
            return (
              <Card key={f.path} className="!p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="font-schibsted text-[14px] font-medium text-ink">
                      {fieldLabel(f.path)}
                    </span>
                    <span className="font-fragment text-[9.5px] text-body/50">{f.path}</span>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    {guidelineIds.map((guidelineId) => (
                      <Link
                        key={guidelineId}
                        to={`/pipeline#sop-${guidelineId.toLowerCase()}`}
                        title="View SOP"
                        className="border border-cobalt/40 px-1.5 py-0.5 font-fragment text-[8.5px] uppercase tracking-[0.12em] text-cobalt hover:bg-cobalt/10"
                      >
                        {guidelineId}
                      </Link>
                    ))}
                    <ConfidenceBar value={f.confidence} />
                  </div>
                </div>
                <div className="mb-3 font-schibsted text-[15px] font-medium text-ink">
                  {fmtValue(f.value)}
                </div>

                <div className="mb-3">
                  {sourceSnippet ? (
                    <div className="border-l-2 border-cobalt/40 pl-3">
                      <div className="mb-1 font-fragment text-[8.5px] uppercase tracking-[0.14em] text-body/50">
                        Source
                      </div>
                      <div className="line-clamp-2 font-fragment text-[11px] leading-relaxed text-body">
                        &ldquo;{sourceSnippet.before}
                        <span className="bg-cobalt/10 text-ink">{sourceSnippet.match}</span>
                        {sourceSnippet.after}&rdquo;
                      </div>
                      <button
                        type="button"
                        onClick={() => scrollToEvidence(f.path)}
                        className="mt-1 font-schibsted text-[12px] text-cobalt underline decoration-dotted underline-offset-2 hover:text-cobalt-hover"
                      >
                        View in document
                      </button>
                    </div>
                  ) : (
                    <div className="font-fragment text-[10px] text-flag">
                      Not found verbatim in the document
                    </div>
                  )}
                </div>

                {decision ? (
                  <p className="flex items-center gap-1.5 text-[13px] text-ok">
                    <Check size={14} aria-hidden />
                    {decision.action === "approve"
                      ? "Approved as extracted"
                      : `Overridden → ${fmtValue(decision.override_value)}`}
                  </p>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="secondary"
                      className="!px-3.5 !py-1.5 text-[13px]"
                      disabled={decide.isPending}
                      onClick={() => decide.mutate({ path: f.path, action: "approve" })}
                    >
                      Approve
                    </Button>
                    <input
                      value={overrides[f.path] ?? ""}
                      onChange={(e) => setOverrides({ ...overrides, [f.path]: e.target.value })}
                      placeholder="Corrected value"
                      aria-label={`Override value for ${f.path}`}
                      className="min-w-0 flex-1 border border-line bg-wash px-3 py-1.5 text-[13px] focus:border-cobalt focus:outline-none"
                    />
                    <Button
                      variant="ghost"
                      className="!px-2 !py-1.5 text-[13px]"
                      disabled={decide.isPending || !(overrides[f.path] ?? "").trim()}
                      onClick={() =>
                        decide.mutate({
                          path: f.path,
                          action: "override",
                          override_value: overrides[f.path],
                        })
                      }
                    >
                      Override
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}

          {item.status === "resolved" && (
            <p className="border border-ok/25 bg-ok/5 px-4 py-3 text-[13.5px] text-ok">
              <GlossaryText text="All flagged fields decided. In production this decision record is the audit-trail entry, and the corrected values become a new labeled training pair." />
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
