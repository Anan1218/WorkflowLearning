import { useQuery } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts";

import { api } from "../../lib/api";
import { Badge, Card, EmptyState, PageHeader, Spinner } from "../../components/ui";

export function EvalsPage() {
  const { data: runs, isLoading } = useQuery({ queryKey: ["eval-runs"], queryFn: api.evalRuns });
  const [selected, setSelected] = useState<string | null>(null);
  const runId = selected ?? runs?.[0]?.run_id ?? null;

  const { data: run } = useQuery({
    queryKey: ["eval-run", runId],
    queryFn: () => api.evalRun(runId!),
    enabled: !!runId,
  });

  const fields = run
    ? Object.entries(run.per_field)
        .filter(([k]) => k !== "OVERALL")
        .map(([field, acc]) => ({
          field: field.replace("wip_total_contract_value", "wip_total"),
          acc: Math.round(acc * 1000) / 10,
        }))
    : [];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        eyebrow="Processing integrity"
        title="Evaluation results"
        sub="Per-field accuracy against labeled ground truth. This harness runs before every change — new model, new prompt — and is the evidence engine behind every accuracy claim."
      />

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : !runs?.length ? (
        <EmptyState
          title="No eval runs recorded"
          hint="Run `python -m evals.harness --save` to score the extractor and publish results here."
        />
      ) : (
        <>
          <div
            className="rise mb-6 flex flex-wrap items-stretch gap-2"
            style={{ animationDelay: "320ms" }}
            role="tablist"
            aria-label="Eval runs"
          >
            {runs.map((r) => (
              <button
                key={r.run_id}
                role="tab"
                aria-selected={runId === r.run_id}
                onClick={() => setSelected(r.run_id)}
                className={`relative px-4 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-cobalt ${
                  runId === r.run_id
                    ? "bg-white shadow-[0_14px_30px_-22px_rgba(30,58,92,0.5)] ring-1 ring-pale"
                    : "bg-white/50 hover:bg-white"
                }`}
              >
                {runId === r.run_id && (
                  <span className="absolute inset-y-0 left-0 w-[3px] bg-cobalt" aria-hidden />
                )}
                <div className="font-schibsted text-[13px] font-medium text-ink">
                  {r.model.split("/").slice(-1)[0]}
                </div>
                <div className="font-fragment text-[10px] uppercase tracking-[0.12em] text-body/60">
                  {r.timestamp.slice(0, 10)} · {r.n_cases} cases ·{" "}
                  {r.overall != null ? `${(r.overall * 100).toFixed(1)}%` : "—"}
                </div>
              </button>
            ))}
          </div>

          {run && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
              <Card tier="stage" className="rise flex flex-col items-start justify-center gap-2" >
                <div className="eyebrow">Overall accuracy</div>
                <div className="font-fragment text-[2.6rem] leading-none text-cobalt">
                  {((run.per_field.OVERALL ?? 0) * 100).toFixed(1)}%
                </div>
                <Badge tone="neutral">{run.n_cases} labeled cases</Badge>
                {run.note && <p className="mt-2 text-[12px] leading-relaxed text-body">{run.note}</p>}
              </Card>

              <Card className="rise" >
                <div className="eyebrow mb-4">Per-field accuracy</div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={fields} margin={{ top: 4, right: 8, bottom: 4, left: -18 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="field"
                      tick={{ fontSize: 9.5, fontFamily: "Fragment Mono", fill: "#48566b" }}
                      angle={-28}
                      textAnchor="end"
                      height={70}
                      interval={0}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 10, fontFamily: "Fragment Mono", fill: "#48566b" }}
                      unit="%"
                    />
                    <Bar dataKey="acc" fill="#2251ff" radius={[0, 0, 0, 0]} maxBarSize={38} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              {run.per_case.length > 0 && (
                <Card className="rise lg:col-span-2">
                  <div className="eyebrow mb-4">Case × field matrix</div>
                  <div className="thin-scroll overflow-x-auto border border-line">
                    <table className="w-full text-[12px]">
                      <thead>
                        <tr className="bg-wash">
                          <th className="px-3 py-2 text-left font-fragment text-[9.5px] font-normal uppercase tracking-[0.12em] text-body">
                            Case
                          </th>
                          {Object.keys(run.per_case[0].fields).map((f) => (
                            <th
                              key={f}
                              className="px-3 py-2 text-left font-fragment text-[9.5px] font-normal uppercase tracking-[0.12em] text-body"
                            >
                              {f.split(".").slice(-1)[0].replace("wip_total_contract_value", "wip")}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {run.per_case.map((c) => (
                          <tr key={c.case} className="border-t border-line/70">
                            <td className="px-3 py-1.5 font-fragment text-[10.5px] text-body">{c.case}</td>
                            {Object.entries(c.fields).map(([f, ok]) => (
                              <td key={f} className="px-3 py-1.5">
                                {ok ? (
                                  <Check size={13} className="text-ok" aria-label={`${f} correct`} />
                                ) : (
                                  <X size={13} className="text-flag" aria-label={`${f} incorrect`} />
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
