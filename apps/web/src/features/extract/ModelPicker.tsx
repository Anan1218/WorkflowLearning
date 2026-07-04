import type { ModelInfo } from "../../lib/api";

/** The model-agnostic seam, live: each option is a one-string provider swap. */
export function ModelPicker({
  models,
  extractId,
  classifyId,
  onExtract,
  onClassify,
  disabled,
}: {
  models: ModelInfo[];
  extractId: string | null;
  classifyId: string | null;
  onExtract: (id: string) => void;
  onClassify: (id: string) => void;
  disabled: boolean;
}) {
  const renderOptions = (
    value: string | null,
    onChange: (id: string) => void,
    groupName: string,
    ariaLabel: string,
    compact = false,
  ) => (
    <div className="flex flex-col gap-1.5" role="radiogroup" aria-label={ariaLabel}>
      {models.map((m) => (
        <label
          key={`${groupName}-${m.id}`}
          className={`relative flex cursor-pointer items-center justify-between px-3 transition-colors ${
            compact ? "py-2" : "py-2.5"
          } ${
            value === m.id
              ? "bg-white shadow-[0_14px_30px_-22px_rgba(30,58,92,0.5)] ring-1 ring-pale"
              : "hover:bg-wash"
          }`}
        >
          {value === m.id && <span className="absolute inset-y-0 left-0 w-[3px] bg-cobalt" aria-hidden />}
          <span className="flex items-center gap-2.5">
            <input
              type="radio"
              name={groupName}
              checked={value === m.id}
              onChange={() => onChange(m.id)}
              className="accent-cobalt"
            />
            <span className="font-schibsted text-[13px] text-ink">{m.label}</span>
          </span>
          <span className="font-fragment text-[10px] uppercase tracking-[0.12em] text-body/60">
            {m.cost}
          </span>
        </label>
      ))}
    </div>
  );

  return (
    <fieldset
      className="border border-pale bg-white p-4 shadow-[0_14px_34px_-28px_rgba(5,28,44,0.5)]"
      disabled={disabled}
    >
      <legend className="sr-only">Model</legend>
      <div className="eyebrow mb-3">Model</div>
      <div className="mb-2 font-fragment text-[10px] uppercase tracking-[0.12em] text-body/60">
        Extract model
      </div>
      {renderOptions(extractId, onExtract, "extract-model", "Extract model")}
      <div className="mb-2 mt-4 font-fragment text-[10px] uppercase tracking-[0.12em] text-body/60">
        Classify model
      </div>
      {renderOptions(classifyId, onClassify, "classify-model", "Classify model", true)}
      <p className="mt-3 text-[12px] leading-relaxed text-body">
        Two model calls per run. Triage can run cheap while extraction runs strong; each step is a
        one-string swap.
      </p>
    </fieldset>
  );
}
