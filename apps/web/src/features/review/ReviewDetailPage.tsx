import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import { api } from "../../lib/api";
import { Badge, Button, Card, ConfidenceBar, EmptyState, Spinner, fmtValue } from "../../components/ui";
import { GlossaryText } from "../../components/Term";

export function ReviewDetailPage() {
  const { itemId } = useParams<{ itemId: string }>();
  const qc = useQueryClient();
  const [overrides, setOverrides] = useState<Record<string, string>>({});

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
        <div className="thin-scroll max-h-[620px] overflow-y-auto border border-pale bg-wash p-6">
          <div className="eyebrow mb-3">Source document</div>
          <pre className="whitespace-pre-wrap font-fragment text-[12px] leading-relaxed text-body">
            {item.document_text}
          </pre>
        </div>

        <div className="flex flex-col gap-3.5">
          <Card className="!p-4">
            <div className="eyebrow mb-3">Why this is here</div>
            {rationales.length ? (
              <div className="flex flex-col gap-3">
                {rationales.map((rationale) => (
                  <div key={rationale.guideline_id} className="border-t border-line pt-3 first:border-t-0 first:pt-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center border border-cobalt/45 px-2 py-0.5 font-fragment text-[9px] font-semibold uppercase tracking-[0.16em] text-cobalt">
                        {rationale.guideline_id}
                      </span>
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
            return (
              <Card key={f.path} className="!p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="font-fragment text-[11px] text-body">{f.path}</span>
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    {guidelineIds.map((guidelineId) => (
                      <span
                        key={guidelineId}
                        className="border border-cobalt/40 px-1.5 py-0.5 font-fragment text-[8.5px] uppercase tracking-[0.12em] text-cobalt"
                      >
                        {guidelineId}
                      </span>
                    ))}
                    <ConfidenceBar value={f.confidence} />
                  </div>
                </div>
                <div className="mb-3 font-schibsted text-[15px] font-medium text-ink">
                  {fmtValue(f.value)}
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
