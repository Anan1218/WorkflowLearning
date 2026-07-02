/** Animated stage stepper shown while the LLM call runs — latency becomes narrative. */

const STAGES = [
  { label: "Intake", at: 0 },
  { label: "Extract", at: 1 },
  { label: "Validate schema", at: 8 },
  { label: "Score confidence", at: 16 },
  { label: "Route", at: 24 },
];

export function JobProgress({ elapsed }: { elapsed: number }) {
  return (
    <div className="rise rounded-2xl border border-hairline bg-cloud/40 px-8 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div className="eyebrow">Pipeline running</div>
        <span className="font-fragment text-[11px] text-bodyslate">{elapsed.toFixed(0)}s</span>
      </div>
      <ol className="flex items-center gap-0" aria-label="Pipeline stages">
        {STAGES.map((s, i) => {
          const active = elapsed >= s.at;
          const isCurrent = active && (i === STAGES.length - 1 || elapsed < STAGES[i + 1].at);
          return (
            <li key={s.label} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full transition-colors ${
                    isCurrent ? "animate-pulse bg-cobalt" : active ? "bg-cobalt" : "bg-hairline"
                  }`}
                  aria-hidden
                />
                <span
                  className={`whitespace-nowrap font-schibsted text-[12px] ${
                    active ? "font-medium text-ink" : "text-bodyslate/60"
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {i < STAGES.length - 1 && (
                <div className={`mx-3 mb-6 h-px flex-1 ${elapsed >= STAGES[i + 1].at ? "bg-cobalt/50" : "bg-hairline"}`} />
              )}
            </li>
          );
        })}
      </ol>
      <p className="mt-6 text-center text-[13px] text-bodyslate">
        The model is reading the document and filling the typed schema — validation re-asks automatically if
        the output doesn't conform. Free models can take up to a minute.
      </p>
    </div>
  );
}
