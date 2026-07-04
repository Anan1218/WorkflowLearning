import { Check, X } from "lucide-react";
import { Link } from "react-router-dom";

import type { JobResult } from "../../lib/api";
import { Badge, Card, ConfidenceBar, fmtMoney, fmtValue } from "../../components/ui";
import { GlossaryText, Term } from "../../components/Term";

const FIELD_ROWS: { path: string; label: string; gloss?: string }[] = [
  { path: "principal.name", label: "Principal", gloss: "principal" },
  { path: "principal.fein", label: "FEIN", gloss: "fein" },
  { path: "principal.address", label: "Address" },
  { path: "obligee.name", label: "Obligee", gloss: "obligee" },
  { path: "bond_type", label: "Bond type", gloss: "bond type" },
  { path: "bond_amount", label: "Bond amount", gloss: "bond amount" },
  { path: "working_capital", label: "Working capital", gloss: "working capital" },
  { path: "net_worth", label: "Net worth", gloss: "net worth" },
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
  const wipTotal = wip.reduce((s, p) => s + (p.contract_amount ?? 0), 0);

  return (
    <div className="pop-in">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="font-newsreader text-[1.5rem] font-normal leading-none tracking-[-0.01em] text-ink">
          Extraction result
        </h2>
        <Badge tone="neutral">{modelLabel}</Badge>
        <Badge tone="neutral">{elapsed.toFixed(1)}s</Badge>
        {result.usage?.input_tokens != null && (
          <Badge tone="neutral">
            {result.usage.input_tokens.toLocaleString()} in · {result.usage.output_tokens?.toLocaleString()}{" "}
            out
          </Badge>
        )}
        {result.usage?.est_cost_usd != null && (
          <Badge tone={result.usage.est_cost_usd === 0 ? "ok" : "cobalt"}>
            {result.usage.est_cost_usd === 0 ? "$0.00" : `est $${result.usage.est_cost_usd.toFixed(4)}`}
          </Badge>
        )}
        {result.score && (
          <Badge tone={result.score.accuracy >= 0.99 ? "ok" : "cobalt"}>
            {Math.round(result.score.accuracy * 100)}% vs ground truth
          </Badge>
        )}
        {result.review_item_id && (
          <Link
            to={`/review/${result.review_item_id}`}
            className="group ml-auto font-schibsted text-[14px] font-medium text-cobalt hover:text-cobalt-hover"
          >
            {result.low_confidence_fields.length} field
            {result.low_confidence_fields.length === 1 ? "" : "s"} routed to review{" "}
            <span className="inline-block transition-transform group-hover:translate-x-0.5">→</span>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="thin-scroll max-h-[560px] overflow-y-auto border border-pale bg-wash p-6">
          <div className="eyebrow mb-3">Source document</div>
          <pre className="whitespace-pre-wrap font-fragment text-[12px] leading-relaxed text-body">
            {sourceText}
          </pre>
        </div>

        <Card tier="stage">
          <div className="eyebrow mb-3">Extracted SuretySubmission</div>
          <table className="w-full">
            <tbody>
              {FIELD_ROWS.map(({ path, label, gloss }) => {
                const value = getPath(result.submission, path);
                const flagged = flaggedPaths.has(path);
                const scored = result.score?.fields[path];
                return (
                  <tr key={path} className="border-b border-line/70 last:border-0">
                    <td className="py-2.5 pr-3 align-top">
                      <div className="font-schibsted text-[13px] text-body">{gloss ? <Term k={gloss}>{label}</Term> : label}</div>
                      <div className="font-fragment text-[9.5px] text-body/50">{path}</div>
                    </td>
                    <td className="py-2.5 pr-3 align-top font-schibsted text-[14px] font-medium text-ink">
                      {["bond_amount", "working_capital", "net_worth"].includes(path)
                        ? fmtMoney(value)
                        : fmtValue(value)}
                      {scored !== undefined && (
                        <span
                          className="ml-1.5 inline-flex align-middle"
                          title={scored ? "Matches ground truth" : "Differs from ground truth"}
                        >
                          {scored ? (
                            <Check size={13} className="text-ok" aria-label="matches ground truth" />
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
              <div className="eyebrow mb-2 mt-6"><Term k="wip">WIP schedule</Term> · {wip.length} projects</div>
              <div className="overflow-x-auto border border-line">
                <table className="w-full text-[12.5px]">
                  <thead>
                    <tr className="bg-wash text-left font-fragment text-[9.5px] uppercase tracking-[0.12em] text-body">
                      <th className="px-3 py-2 font-normal">Project</th>
                      <th className="px-3 py-2 text-right font-normal">Contract</th>
                      <th className="px-3 py-2 text-right font-normal">% Comp</th>
                      <th className="px-3 py-2 text-right font-normal"><Term k="under/over-billing">Under/(Over)</Term></th>
                    </tr>
                  </thead>
                  <tbody>
                    {wip.map((p) => (
                      <tr key={p.project_name} className="border-t border-line/70">
                        <td className="px-3 py-1.5 text-ink">{p.project_name}</td>
                        <td className="px-3 py-1.5 text-right font-fragment text-[11.5px]">
                          {fmtMoney(p.contract_amount)}
                        </td>
                        <td className="px-3 py-1.5 text-right text-body">
                          {p.percent_complete != null ? `${p.percent_complete}%` : "–"}
                        </td>
                        <td className="px-3 py-1.5 text-right text-body">{fmtMoney(p.over_under_billing)}</td>
                      </tr>
                    ))}
                    <tr className="border-t border-line bg-mist">
                      <td className="px-3 py-1.5 font-schibsted font-medium text-ink">Total</td>
                      <td className="px-3 py-1.5 text-right font-fragment text-[11.5px] text-cobalt">
                        {fmtMoney(wipTotal)}
                      </td>
                      <td colSpan={2} />
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          )}

          {result.submission.notes && (
            <p className="mt-5 border border-line bg-wash px-3.5 py-2.5 text-[13px] leading-relaxed text-body">
              <span className="font-schibsted font-medium text-ink">Model notes: </span>
              <GlossaryText text={result.submission.notes} />
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
