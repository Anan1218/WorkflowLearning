import { Check, X } from "lucide-react";
import { Link } from "react-router-dom";

import type { JobResult } from "../../lib/api";
import { Badge, Card, ConfidenceBar, fmtMoney, fmtValue } from "../../components/ui";

const FIELD_ROWS: { path: string; label: string }[] = [
  { path: "principal.name", label: "Principal" },
  { path: "principal.fein", label: "FEIN" },
  { path: "principal.address", label: "Address" },
  { path: "obligee.name", label: "Obligee" },
  { path: "bond_type", label: "Bond type" },
  { path: "bond_amount", label: "Bond amount" },
  { path: "working_capital", label: "Working capital" },
  { path: "net_worth", label: "Net worth" },
];

function getPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((o, k) => (o == null ? o : (o as Record<string, unknown>)[k]), obj);
}

function confidenceFor(result: JobResult, path: string): number | null {
  const c = result.submission.field_confidences;
  const parts = path.split(".");
  for (let i = parts.length; i > 0; i--) {
    const key = parts.slice(0, i).join(".");
    if (key in c) return c[key];
  }
  return null;
}

export function ExtractionResult({
  result,
  elapsed,
  modelLabel,
  sourceText,
}: {
  result: JobResult;
  elapsed: number;
  modelLabel: string;
  sourceText: string;
}) {
  const flaggedPaths = new Set(result.low_confidence_fields.map((f) => f.path));
  const wip = result.submission.wip_schedule;

  return (
    <div className="rise">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="font-newsreader text-2xl tracking-[-0.02em]">Extraction result</h2>
        <Badge tone="neutral">{modelLabel}</Badge>
        <Badge tone="neutral">{elapsed.toFixed(1)}s</Badge>
        {result.score && (
          <Badge tone={result.score.accuracy >= 0.99 ? "pass" : "cobalt"}>
            {Math.round(result.score.accuracy * 100)}% vs ground truth
          </Badge>
        )}
        {result.review_item_id && (
          <Link
            to={`/review/${result.review_item_id}`}
            className="ml-auto font-schibsted text-[14px] font-medium text-cobalt hover:text-cobalt-press"
          >
            {result.low_confidence_fields.length} field
            {result.low_confidence_fields.length === 1 ? "" : "s"} routed to review →
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="max-h-[560px] overflow-y-auto bg-cloud/30">
          <div className="eyebrow mb-3">Source document</div>
          <pre className="whitespace-pre-wrap font-fragment text-[12px] leading-relaxed text-bodyslate">
            {sourceText}
          </pre>
        </Card>

        <Card>
          <div className="eyebrow mb-3">Extracted SuretySubmission</div>
          <table className="w-full">
            <tbody>
              {FIELD_ROWS.map(({ path, label }) => {
                const value = getPath(result.submission, path);
                const flagged = flaggedPaths.has(path);
                const scored = result.score?.fields[path];
                return (
                  <tr key={path} className="border-b border-hairline/70 last:border-0">
                    <td className="py-2.5 pr-3 align-top">
                      <div className="font-schibsted text-[13px] text-bodyslate">{label}</div>
                      <div className="font-fragment text-[9.5px] text-bodyslate/60">{path}</div>
                    </td>
                    <td className="py-2.5 pr-3 align-top font-schibsted text-[14px] font-medium text-ink">
                      {["bond_amount", "working_capital", "net_worth"].includes(path)
                        ? fmtMoney(value)
                        : fmtValue(value)}
                      {scored !== undefined && (
                        <span className="ml-1.5 inline-flex align-middle" title={scored ? "matches ground truth" : "differs from ground truth"}>
                          {scored ? (
                            <Check size={13} className="text-pass" aria-label="matches ground truth" />
                          ) : (
                            <X size={13} className="text-flag" aria-label="differs from ground truth" />
                          )}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 text-right align-top">
                      <div className="flex flex-col items-end gap-1">
                        <ConfidenceBar value={confidenceFor(result, path)} />
                        {flagged && <Badge tone="flag">review</Badge>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {wip.length > 0 && (
            <>
              <div className="eyebrow mb-2 mt-6">WIP schedule · {wip.length} projects</div>
              <div className="overflow-x-auto">
                <table className="w-full text-[12.5px]">
                  <thead>
                    <tr className="text-left font-fragment text-[9.5px] uppercase tracking-[0.08em] text-bodyslate">
                      <th className="pb-1.5 pr-3 font-normal">Project</th>
                      <th className="pb-1.5 pr-3 text-right font-normal">Contract</th>
                      <th className="pb-1.5 pr-3 text-right font-normal">% Comp</th>
                      <th className="pb-1.5 text-right font-normal">Under/(Over)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wip.map((p) => (
                      <tr key={p.project_name} className="border-t border-hairline/70">
                        <td className="py-1.5 pr-3 text-ink">{p.project_name}</td>
                        <td className="py-1.5 pr-3 text-right font-schibsted">{fmtMoney(p.contract_amount)}</td>
                        <td className="py-1.5 pr-3 text-right text-bodyslate">
                          {p.percent_complete != null ? `${p.percent_complete}%` : "—"}
                        </td>
                        <td className="py-1.5 text-right text-bodyslate">{fmtMoney(p.over_under_billing)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {result.submission.notes && (
            <p className="mt-5 rounded-md bg-cloud/60 px-3.5 py-2.5 text-[13px] leading-relaxed text-bodyslate">
              <span className="font-schibsted font-medium text-ink">Model notes: </span>
              {result.submission.notes}
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
