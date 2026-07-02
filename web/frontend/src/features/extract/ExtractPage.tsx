import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { api, type Job } from "../../lib/api";
import { Button, ErrorBanner, PageHeader } from "../../components/ui";
import { DocInput } from "./DocInput";
import { ExtractionResult } from "./ExtractionResult";
import { JobProgress } from "./JobProgress";
import { ModelPicker } from "./ModelPicker";

export function ExtractPage() {
  const [text, setText] = useState("");
  const [sampleId, setSampleId] = useState<string | null>(null);
  const [modelId, setModelId] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  const { data: models } = useQuery({ queryKey: ["models"], queryFn: api.models });
  const effectiveModel = modelId ?? models?.find((m) => m.default)?.id ?? null;

  const start = useMutation({
    mutationFn: () =>
      api.startExtraction(
        sampleId
          ? { sample_id: sampleId, model_id: effectiveModel! }
          : { text, model_id: effectiveModel! },
      ),
    onSuccess: (d) => setJobId(d.job_id),
  });

  const job = useQuery<Job>({
    queryKey: ["job", jobId],
    queryFn: () => api.job(jobId!),
    enabled: !!jobId,
    refetchInterval: (q) => {
      const s = q.state.data?.status;
      return s === "succeeded" || s === "failed" ? false : 1500;
    },
  });

  const running = !!jobId && (job.data?.status === "queued" || job.data?.status === "running" || !job.data);
  const canRun = !!effectiveModel && (sampleId !== null || text.trim().length > 40) && !running;

  return (
    <div className="rise mx-auto max-w-5xl">
      <PageHeader
        eyebrow="Live demo"
        title="Read a messy submission into structured, scored data."
        sub="Paste a broker email, upload a document, or pick a sample. The pipeline extracts a typed SuretySubmission, assigns per-field confidence, and routes anything uncertain to human review."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_260px]">
        <DocInput
          text={text}
          sampleId={sampleId}
          onText={(t) => {
            setText(t);
            setSampleId(null);
          }}
          onSample={(id, sampleText) => {
            setSampleId(id);
            setText(sampleText);
          }}
          disabled={running}
        />
        <div className="flex flex-col gap-4">
          <ModelPicker models={models ?? []} value={effectiveModel} onChange={setModelId} disabled={running} />
          <Button onClick={() => start.mutate()} disabled={!canRun}>
            {running ? "Extracting…" : "Run extraction"}
          </Button>
          {start.isError && <ErrorBanner message={(start.error as Error).message} />}
        </div>
      </div>

      {jobId && (
        <div className="mt-8">
          {job.data?.status === "failed" && job.data.error ? (
            <ErrorBanner
              message={job.data.error.message}
              onRetry={() => {
                setJobId(null);
                start.mutate();
              }}
            />
          ) : job.data?.status === "succeeded" && job.data.result ? (
            <ExtractionResult
              result={job.data.result}
              elapsed={job.data.elapsed_s}
              modelLabel={models?.find((m) => m.id === job.data!.model_id)?.label ?? job.data.model_id}
              sourceText={text}
            />
          ) : (
            <JobProgress elapsed={job.data?.elapsed_s ?? 0} />
          )}
        </div>
      )}
    </div>
  );
}
