/** Typed fetch client mirroring the FastAPI slice endpoints. */

export type ModelInfo = { id: string; label: string; cost: string; default: boolean };

export type Party = { name: string; address: string | null; fein: string | null };

export type WIPProject = {
  project_name: string;
  contract_amount: number;
  total_estimated_cost: number;
  cost_to_date: number | null;
  percent_complete: number | null;
  billings_to_date: number | null;
  over_under_billing: number | null;
};

export type Submission = {
  principal: Party;
  obligee: Party | null;
  bond_type: string;
  bond_amount: number | null;
  working_capital: number | null;
  net_worth: number | null;
  wip_schedule: WIPProject[];
  field_confidences: Record<string, number>;
  notes: string | null;
};

export type FlaggedField = { path: string; value: unknown; confidence: number | null };

export type GuidelineInfo = {
  id: string;
  title: string;
  rule: string;
  severity: "route" | "info";
  route: string;
  example: { given: string; outcome: string };
};

export type Rationale = {
  guideline_id: string;
  title: string;
  reason: string;
  severity: "route" | "info";
  fields: string[];
  route: string;
};

export type JobResult = {
  submission: Submission;
  low_confidence_fields: FlaggedField[];
  rationales: Rationale[];
  review_item_id: string | null;
  score: { fields: Record<string, boolean>; accuracy: number } | null;
  usage?: {
    input_tokens: number | null;
    output_tokens: number | null;
    latency_s: number;
    est_cost_usd: number | null;
  };
};

export type Job = {
  id: string;
  status: "queued" | "running" | "succeeded" | "failed";
  model_id: string;
  elapsed_s: number;
  result: JobResult | null;
  error: { kind: string; message: string; detail?: string } | null;
};

export type SampleMeta = { id: string; title: string; preview: string; has_ground_truth: boolean };

export type ReviewListItem = {
  id: string;
  created_at: number;
  model_id: string;
  status: "pending" | "resolved";
  n_flagged: number;
  n_decided: number;
  doc_preview: string;
  principal: string | null;
  guideline_ids: string[];
};

export type ReviewItem = {
  id: string;
  created_at: number;
  model_id: string;
  status: "pending" | "resolved";
  document_text: string;
  submission: Submission;
  flagged_fields: FlaggedField[];
  rationales?: Rationale[];
  decisions: Record<string, { action: string; override_value?: unknown; decided_at: number }>;
};

export type EvalRunMeta = {
  run_id: string;
  model: string;
  timestamp: string;
  n_cases: number;
  overall: number | null;
};

export type EvalRun = EvalRunMeta & {
  note?: string;
  per_field: Record<string, number>;
  per_case: { case: string; fields: Record<string, boolean>; latency_s?: number }[];
  totals?: { input_tokens: number; output_tokens: number; mean_latency_s: number | null };
};

/** API origin. Empty = same origin (Fly/compose). Vercel builds set VITE_API_BASE. */
const API_BASE: string = import.meta.env.VITE_API_BASE ?? "";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `${res.status} ${res.statusText}`);
  }
  return res.json();
}

export const api = {
  models: () => req<ModelInfo[]>("/api/models"),
  guidelines: () => req<GuidelineInfo[]>("/api/guidelines"),
  samples: () => req<SampleMeta[]>("/api/samples"),
  sample: (id: string) => req<{ id: string; text: string }>(`/api/samples/${id}`),
  uploadDocument: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return req<{ text: string; filename: string; pages?: number }>("/api/documents", {
      method: "POST",
      body: form,
    });
  },
  startExtraction: (body: { text?: string; sample_id?: string; model_id: string }) =>
    req<{ job_id: string }>("/api/extract", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  job: (id: string) => req<Job>(`/api/jobs/${id}`),
  reviewList: (status?: string) =>
    req<ReviewListItem[]>(`/api/review${status ? `?status=${status}` : ""}`),
  reviewItem: (id: string) => req<ReviewItem>(`/api/review/${id}`),
  decide: (id: string, decisions: { path: string; action: string; override_value?: unknown }[]) =>
    req<ReviewItem>(`/api/review/${id}/decision`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ decisions }),
    }),
  evalRuns: () => req<EvalRunMeta[]>("/api/evals"),
  evalRun: (id: string) => req<EvalRun>(`/api/evals/${id}`),
};
