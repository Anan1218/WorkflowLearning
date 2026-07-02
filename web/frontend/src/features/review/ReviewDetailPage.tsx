import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import { api } from "../../lib/api";
import { Badge, Button, Card, ConfidenceBar, EmptyState, Spinner, fmtValue } from "../../components/ui";

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

  return (
    <div className="pop-in mx-auto max-w-6xl">
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
          <div className="eyebrow">Flagged fields · {item.flagged_fields.length}</div>
          {item.flagged_fields.map((f) => {
            const decision = item.decisions[f.path];
            return (
              <Card key={f.path} className="!p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="font-fragment text-[11px] text-body">{f.path}</span>
                  <ConfidenceBar value={f.confidence} />
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
              All flagged fields decided. In production this decision record is the audit-trail entry — and
              the corrected values become a new labeled training pair.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
