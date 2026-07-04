/** Animated stage stepper shown while the LLM call runs; latency becomes narrative. */

const STAGES = [
  { label: "Intake", at: 0, kind: "code" },
  { label: "Extract", at: 1, kind: "model" },
  { label: "Validate", at: 8, kind: "code" },
  { label: "Confidence gate", at: 16, kind: "code" },
  { label: "Route", at: 24, kind: "code" },
];

export function JobProgress({ elapsed, modelName }: { elapsed: number; modelName: string }) {
  return (
    <div className="pop-in dot-grid-light relative overflow-hidden border border-pale bg-wash px-8 py-10 shadow-[0_14px_34px_-28px_rgba(5,28,44,0.5)]">
      {/* scanning highlight */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-1/4" aria-hidden>
        <div className="scan-bar h-full w-full bg-gradient-to-r from-transparent via-cobalt/[0.06] to-transparent" />
      </div>

      <div className="mb-6 flex items-center justify-between">
        <div className="eyebrow">Pipeline running</div>
        <span className="font-fragment text-[11px] text-body">{elapsed.toFixed(0)}s</span>
      </div>
      <ol className="flex items-center gap-0" aria-label="Pipeline stages">
        {STAGES.map((s, i) => {
          const active = elapsed >= s.at;
          const isCurrent = active && (i === STAGES.length - 1 || elapsed < STAGES[i + 1].at);
          return (
            <li key={s.label} className="flex flex-1 items-center last:flex-none">
              <div className="flex min-w-0 flex-col items-center gap-2">
                <span
                  className={`flex h-6 w-6 items-center justify-center border font-fragment text-[9px] transition-all ${
                    isCurrent
                      ? "node-glow border-cobalt bg-white text-cobalt"
                      : active
                        ? "border-cobalt bg-cobalt text-white"
                        : "border-line bg-white text-body/50"
                  }`}
                  aria-hidden
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className={`whitespace-nowrap font-schibsted text-[12px] ${
                    active ? "font-medium text-ink" : "text-body/60"
                  }`}
                >
                  {s.label}
                </span>
                <span
                  className={`max-w-[110px] overflow-hidden text-ellipsis whitespace-nowrap border px-1.5 py-0.5 font-fragment text-[8px] uppercase tracking-[0.14em] ${
                    s.kind === "model" ? "border-cobalt/40 text-cobalt" : "border-line text-body/50"
                  }`}
                >
                  {s.kind === "model" ? `model · ${modelName}` : "code"}
                </span>
              </div>
              {i < STAGES.length - 1 && (
                <div
                  className={`mx-3 mb-6 h-px flex-1 ${elapsed >= STAGES[i + 1].at ? "bg-cobalt/50" : "bg-line"}`}
                />
              )}
            </li>
          );
        })}
      </ol>
      <p className="mt-6 text-center text-[13px] text-body">
        Only the Extract stage calls a model. Validation, the confidence gate, and routing are deterministic
        code. Free models can take up to a minute.
      </p>
    </div>
  );
}
