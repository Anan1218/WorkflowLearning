import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../../lib/api";
import { Badge, EmptyState, PageHeader, Spinner } from "../../components/ui";

export function ReviewPage() {
  const [tab, setTab] = useState<"pending" | "resolved">("pending");
  const { data, isLoading } = useQuery({
    queryKey: ["review", tab],
    queryFn: () => api.reviewList(tab),
  });

  return (
    <div className="mx-auto w-full max-w-4xl">
      <PageHeader
        eyebrow="Human in the loop"
        title="Review queue"
        sub="Extractions with any field below the 0.75 confidence threshold land here. Every approve or override is recorded. The same decisions become the audit trail and new labeled training data."
      />

      <div className="rise mb-5 flex gap-1" style={{ animationDelay: "320ms" }} role="tablist" aria-label="Queue filter">
        {(["pending", "resolved"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 font-schibsted text-[14px] capitalize transition-colors focus-visible:outline-2 focus-visible:outline-cobalt ${
              tab === t
                ? "bg-white font-medium text-ink shadow-[0_14px_30px_-22px_rgba(30,58,92,0.5)] ring-1 ring-pale"
                : "text-body hover:text-ink"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : !data?.length ? (
        <div className="rise" style={{ animationDelay: "400ms" }}>
          <EmptyState
            title={tab === "pending" ? "Queue is clear" : "No resolved items yet"}
            hint={
              tab === "pending"
                ? "Run an extraction on the Extract page. Low-confidence fields route here automatically."
                : "Approve or override flagged fields on a pending item and it will move here."
            }
          />
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {data.map((item, i) => (
            <li key={item.id} className="rise" style={{ animationDelay: `${400 + i * 80}ms` }}>
              <Link
                to={`/review/${item.id}`}
                className="group block border border-pale border-t-4 border-t-cobalt bg-white p-5 shadow-[0_14px_34px_-28px_rgba(5,28,44,0.5)] transition-colors hover:bg-wash focus-visible:outline-2 focus-visible:outline-cobalt"
              >
                <div className="mb-1.5 flex items-center gap-3">
                  <span className="font-newsreader text-[1.1rem] leading-none text-ink">
                    {item.principal ?? "Unknown principal"}
                  </span>
                  <Badge tone={item.status === "pending" ? "flag" : "ok"}>{item.status}</Badge>
                  <Badge tone="neutral">{item.model_id}</Badge>
                  <span className="ml-auto font-fragment text-[10px] uppercase tracking-[0.12em] text-body/60">
                    {item.n_decided}/{item.n_flagged} decided ·{" "}
                    {new Date(item.created_at * 1000).toLocaleTimeString()}
                  </span>
                </div>
                <p className="line-clamp-2 font-fragment text-[11px] leading-relaxed text-body">
                  {item.doc_preview}
                </p>
                {!!item.guideline_ids.length && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {item.guideline_ids.map((guidelineId) => (
                      <span
                        key={guidelineId}
                        className="border border-cobalt/40 px-1.5 py-0.5 font-fragment text-[8.5px] uppercase tracking-[0.12em] text-cobalt"
                      >
                        {guidelineId}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
