import type { ModelInfo } from "../../lib/api";

/** The model-agnostic seam, live: each option is a one-string provider swap. */
export function ModelPicker({
  models,
  value,
  onChange,
  disabled,
}: {
  models: ModelInfo[];
  value: string | null;
  onChange: (id: string) => void;
  disabled: boolean;
}) {
  return (
    <fieldset className="rounded-2xl border border-hairline bg-white p-4" disabled={disabled}>
      <legend className="sr-only">Model</legend>
      <div className="eyebrow mb-2.5">Model</div>
      <div className="flex flex-col gap-1.5" role="radiogroup" aria-label="Extraction model">
        {models.map((m) => (
          <label
            key={m.id}
            className={`flex cursor-pointer items-center justify-between rounded-md border px-3 py-2 transition-colors ${
              value === m.id ? "border-cobalt bg-cobalt/5" : "border-hairline hover:border-cobalt/40"
            }`}
          >
            <span className="flex items-center gap-2.5">
              <input
                type="radio"
                name="model"
                checked={value === m.id}
                onChange={() => onChange(m.id)}
                className="accent-cobalt"
              />
              <span className="font-schibsted text-[13.5px] text-ink">{m.label}</span>
            </span>
            <span className="font-fragment text-[10px] text-bodyslate">{m.cost}</span>
          </label>
        ))}
      </div>
      <p className="mt-3 text-[12px] leading-relaxed text-bodyslate">
        Same pipeline, same schema — swapping models is a one-string config change.
      </p>
    </fieldset>
  );
}
