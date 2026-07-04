import { useQuery } from "@tanstack/react-query";
import { ArrowRight, FileText, ScanSearch, ShieldCheck, SlidersHorizontal, UserCheck } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import { Card, PageHeader } from "../../components/ui";
import { GlossaryText } from "../../components/Term";
import { api } from "../../lib/api";

const STAGES = [
  {
    icon: FileText,
    title: "Intake",
    body: "Broker emails, ACORD forms, WIP schedules, and financial statements go in as messy text. PDF text-layer today; OCR + image hybrid is the production path for scans. A first model call classifies the document before anything else runs.",
  },
  {
    icon: ScanSearch,
    title: "Extract",
    body: "Instructor + Pydantic force the model's output into a typed SuretySubmission. Invalid output is automatically re-asked; the schema is the contract.",
  },
  {
    icon: ShieldCheck,
    title: "Validate",
    body: "Business rules run as plain code: bond amounts positive, FEIN shapes, WIP arithmetic. Deterministic, testable, no model involved.",
  },
  {
    icon: SlidersHorizontal,
    title: "Confidence gate",
    body: "The model scores its own certainty per field. Anything below 0.75, or unreported, cannot proceed unattended.",
  },
  {
    icon: UserCheck,
    title: "Human review",
    body: "Flagged fields queue for an underwriter. Approve or override per field; every decision is an audit-trail entry and a new labeled training pair. Autonomy is earned in steps: today the system only reads and proposes. Write-backs arrive one capability at a time, after evals prove each one.",
  },
];

const WORKFLOW_STEPS = [
  { label: "Submission intake", sublabel: "PARSE + EXTRACT", kind: "covered" },
  { label: "Appetite review", sublabel: "RULE UW-04", kind: "covered" },
  { label: "Risk classification", sublabel: "CLASSIFY MODEL CALL", kind: "covered" },
  { label: "Completeness review", sublabel: "UW-06 + QUEUE", kind: "covered" },
  { label: "Underwriting review", sublabel: "AFTER THE HANDOFF", kind: "next" },
  { label: "Quote", sublabel: "NOT IN SCOPE", kind: "untouched" },
  { label: "Bind and issue", sublabel: "NOT IN SCOPE", kind: "untouched" },
] as const;

export function PipelinePage() {
  const location = useLocation();
  const { data: guidelines, isLoading: guidelinesLoading } = useQuery({
    queryKey: ["guidelines"],
    queryFn: api.guidelines,
  });

  useEffect(() => {
    if (!location.hash.startsWith("#sop-")) return;

    const target = document.getElementById(location.hash.slice(1));
    // Scroll only the app's main region: scrollIntoView would also scroll the
    // document root and push the fixed header out of view.
    const scroller = target?.closest("main");
    if (target && scroller) {
      const delta = target.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
      scroller.scrollTo({ top: scroller.scrollTop + delta - 24, behavior: "smooth" });
    }
  }, [guidelines, location.hash]);

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        eyebrow="Architecture"
        title="A pipeline you can read on a whiteboard."
        sub="Deterministic steps with LLMs inside some of them: plain typed Python, no framework. The parts that matter for a carrier: every step is testable, every decision is audited, and no consequential action happens without a person. The goal: automate the administrative work around underwriting while preserving every underwriting decision."
      />

      <section className="rise mb-8" style={{ animationDelay: "240ms" }}>
        <div className="mb-3 font-fragment text-[10px] uppercase tracking-[0.18em] text-cobalt">
          Where this sits in the underwriting workflow
        </div>
        <div className="flex">
          {WORKFLOW_STEPS.map((step, i) => (
            <div
              key={step.label}
              className={`relative flex-1 min-w-0 border border-pale px-2.5 py-2.5 ${
                i > 0 ? "-ml-px" : ""
              } ${step.kind === "covered" ? "bg-cobalt/5" : "bg-white"} ${
                step.kind === "untouched" ? "border-dashed opacity-60" : ""
              }`}
            >
              {i === 4 && (
                <>
                  <div
                    className="absolute bottom-0 left-0 top-0 z-10 border-l-2 border-dashed border-cobalt"
                    aria-hidden
                  />
                  <div className="absolute left-0 top-0 z-20 -translate-x-1/2 -translate-y-1/2 bg-white border border-cobalt/45 px-1.5 font-fragment text-[8px] font-semibold uppercase tracking-[0.14em] text-cobalt">
                    HANDOFF
                  </div>
                </>
              )}
              <div className="truncate font-schibsted text-[12.5px] font-medium tracking-[-0.01em] text-ink">
                {step.label}
              </div>
              <div
                className={`truncate font-fragment text-[9.5px] uppercase tracking-[0.06em] ${
                  step.kind === "untouched" ? "text-body/80" : "text-body/55"
                }`}
              >
                {step.sublabel}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <div className="min-w-0 basis-0 border-t border-cobalt pt-1" style={{ flexGrow: 4 }}>
            <div className="truncate font-fragment text-[10px] uppercase tracking-[0.16em] text-cobalt">
              COVERED BY THIS SYSTEM · STEPS 01-05
            </div>
          </div>
          <div
            className="min-w-0 basis-0 border-t border-dashed border-body/30 pt-1"
            style={{ flexGrow: 3 }}
          >
            <div className="truncate font-fragment text-[10px] uppercase tracking-[0.16em] text-body/45">
              STAYS WITH THE UNDERWRITER
            </div>
          </div>
        </div>
        <p className="mt-2.5 max-w-4xl text-[13px] leading-[1.55] text-body">
          <GlossaryText text="This system covers one slice of a longer chain: intake through completeness. Extraction and checks run automatically; a person resolves flagged fields in the review queue. Underwriting review starts where we stop, working from the prepared, cited file. Quoting and binding never move." />
        </p>
      </section>

      <ol className="flex flex-col gap-3">
        {STAGES.map(({ icon: Icon, title, body }, i) => (
          <li
            key={title}
            className="rise flex items-stretch gap-4"
            style={{ animationDelay: `${320 + i * 90}ms` }}
          >
            <div className="flex flex-col items-center pt-6">
              <span className="flex h-9 w-9 items-center justify-center border border-cobalt/30 bg-cobalt/10 text-cobalt">
                <Icon size={16} aria-hidden />
              </span>
              {i < STAGES.length - 1 && <span className="mt-2 w-px flex-1 bg-pale" aria-hidden />}
            </div>
            <Card className="mb-1 flex-1">
              <div className="mb-1 flex items-center gap-2.5">
                <span className="font-fragment text-[10px] tracking-[0.12em] text-body/60">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h2 className="font-schibsted text-[16px] font-semibold text-ink">{title}</h2>
              </div>
              <p className="max-w-4xl text-[14.5px] leading-[1.6] text-body"><GlossaryText text={body} /></p>
            </Card>
          </li>
        ))}
      </ol>

      <section className="mt-10">
        <div className="rise mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between" style={{ animationDelay: "760ms" }}>
          <div className="font-fragment text-[10px] uppercase tracking-[0.18em] text-cobalt">
            Documented SOPs
          </div>
          <p className="max-w-2xl text-[14px] leading-[1.55] text-body sm:text-right">
            <GlossaryText text="The routing rules are written procedure, not model whim. The same register the review team follows, executed by the pipeline on every run." />
          </p>
        </div>

        <div className="flex flex-col gap-2.5">
          {guidelinesLoading ? (
            <div className="rise" style={{ animationDelay: "820ms" }}>
              <Card className="!p-4">
                <span className="font-fragment text-[10px] uppercase tracking-[0.14em] text-body/50">
                  Loading SOP register
                </span>
              </Card>
            </div>
          ) : (
            guidelines?.map((guideline, i) => (
              <div
                key={guideline.id}
                id={`sop-${guideline.id.toLowerCase()}`}
                className="rise scroll-mt-24"
                style={{ animationDelay: `${820 + i * 70}ms` }}
              >
                <Card className="!p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 flex-1 gap-3">
                      <span className="inline-flex h-7 shrink-0 items-center border border-cobalt/45 px-2 font-fragment text-[9px] font-semibold uppercase tracking-[0.16em] text-cobalt">
                        {guideline.id}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h2 className="font-schibsted text-[15px] font-semibold text-ink">
                          {guideline.title}
                        </h2>
                        <p className="mt-1 max-w-4xl text-[13.5px] leading-[1.55] text-body">
                          <GlossaryText text={guideline.rule} />
                        </p>
                        <div className="mt-2.5 border border-line bg-wash px-3 py-2">
                          <div className="grid grid-cols-[64px_1fr] items-baseline gap-2">
                            <span className="font-fragment text-[8.5px] uppercase tracking-[0.14em] text-body/50">
                              Given
                            </span>
                            <span className="text-[13px] leading-[1.5] text-body">
                              <GlossaryText text={guideline.example.given} />
                            </span>
                          </div>
                          <div className="grid grid-cols-[64px_1fr] items-baseline gap-2">
                            <span className="font-fragment text-[8.5px] uppercase tracking-[0.14em] text-body/50">
                              Outcome
                            </span>
                            <span className="text-[13px] leading-[1.5] text-body">
                              <GlossaryText text={guideline.example.outcome} />
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 font-fragment text-[9px] uppercase tracking-[0.14em] sm:w-44 sm:text-right ${
                        guideline.severity === "route" ? "text-cobalt" : "text-body/50"
                      }`}
                    >
                      {guideline.route}
                    </span>
                  </div>
                </Card>
              </div>
            ))
          )}
        </div>
      </section>

      <div
        className="rise mt-10 shadow-[0_34px_70px_-40px_rgba(30,58,92,0.8)]"
        style={{ animationDelay: "1160ms" }}
      >
        {/* stepped color strip */}
        <div className="flex h-2" aria-hidden>
          <div className="w-1/3 bg-slate" />
          <div className="w-1/4 bg-cobalt" />
          <div className="w-1/6 bg-[#4a7fe0]" />
          <div className="flex-1 bg-navy-deep" />
        </div>
        <div className="dot-grid bg-navy px-8 py-9 text-white">
          <div className="font-fragment text-[10px] uppercase tracking-[0.2em] text-slate">
            The model-agnostic seam
          </div>
          <p className="mt-3 max-w-4xl font-newsreader text-[2rem] font-normal leading-snug tracking-[-0.01em]">
            Swapping models is a one-string configuration change, not a rewrite.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3 font-fragment text-[12px] text-slate">
            <code className="border border-white/15 bg-white/10 px-3 py-1.5 backdrop-blur-sm">
              openrouter/deepseek-chat-v3.1
            </code>
            <ArrowRight size={14} aria-hidden />
            <code className="border border-white/15 bg-white/10 px-3 py-1.5 backdrop-blur-sm">
              anthropic/claude-sonnet-5
            </code>
            <ArrowRight size={14} aria-hidden />
            <code className="border border-white/15 bg-white/10 px-3 py-1.5 backdrop-blur-sm">
              bedrock / azure-foundry / vertex
            </code>
          </div>
          <p className="mt-5 max-w-4xl text-[14px] leading-[1.6] text-[#d6e2f5]">
            Develop and benchmark on inexpensive models; deploy on whatever endpoint your compliance team
            approves, inside your own cloud. The pipeline, schema, evals, and traces do not change.
          </p>
        </div>
      </div>
    </div>
  );
}
