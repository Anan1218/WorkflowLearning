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
    <div className="rise mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Human in the loop"
        title="Review queue"
        sub="Extractions with any field below the 0.75 confidence threshold land here. Every approve or override is recorded — the same decisions become the audit trail and new labeled training data."
      />

      <div className="mb-5 flex gap-1" role="tablist" aria-label="Queue filter">
        {(["pending", "resolved"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`rounded-md px-4 py-2 font-schibsted text-[14px] capitalize transition-colors focus-visible:outline-2 focus-visible:outline-cobalt ${
              tab === t ? "bg-cloud font-semibold text-ink" : "text-bodyslate hover:text-ink"
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
        <EmptyState
          title={tab === "pending" ? "Queue is clear" : "No resolved items yet"}
          hint={
            tab === "pending"
              ? "Run an extraction on the Extract page — low-confidence fields route here automatically."
              : "Approve or override flagged fields on a pending item and it will move here."
          }
        />
      ) : (
        <ul className="flex flex-col gap-2.5">
          {data.map((item) => (
            <li key={item.id}>
              <Link
                to={`/review/${item.id}`}
                className="block rounded-2xl border border-hairline bg-white p-5 transition-colors hover:border-cobalt/40 focus-visible:outline-2 focus-visible:outline-cobalt"
              >
                <div className="mb-1.5 flex items-center gap-3">
                  <span className="font-schibsted text-[15px] font-semibold text-ink">
                    {item.principal ?? "Unknown principal"}
                  </span>
                  <Badge tone={item.status === "pending" ? "flag" : "pass"}>{item.status}</Badge>
                  <Badge tone="neutral">{item.model_id}</Badge>
                  <span className="ml-auto font-fragment text-[10px] text-bodyslate">
                    {item.n_decided}/{item.n_flagged} decided ·{" "}
                    {new Date(item.created_at * 1000).toLocaleTimeString()}
                  </span>
                </div>
                <p className="line-clamp-2 font-fragment text-[11px] leading-relaxed text-bodyslate">
                  {item.doc_preview}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
