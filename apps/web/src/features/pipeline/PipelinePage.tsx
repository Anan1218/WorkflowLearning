import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ChevronDown,
  FileText,
  ScanSearch,
  ShieldCheck,
  SlidersHorizontal,
  Tags,
  UserCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { Card, PageHeader } from "../../components/ui";
import { GlossaryText } from "../../components/Term";
import { api } from "../../lib/api";

const STAGES = [
  {
    icon: FileText,
    title: "Intake",
    body: "Broker emails, contractor questionnaires, bond request forms, WIP schedules, and CPA financial statements go in as messy text. PDF text-layer today; OCR + image hybrid is the production path for scans.",
    demo: "Pasted text and file uploads.",
    production: "My Contract Bond App webhooks, the agent inbox, SFTP drops; OCR for scanned packages.",
    shapedBy: [],
  },
  {
    icon: Tags,
    title: "Classify",
    body: "A first model call classifies the document type and surety line before extraction, so routing context is known before the typed submission is built.",
    demo: "One call types the single document.",
    production: "One call per document in the package, on a cheap triage model.",
    shapedBy: ["UW-04"],
  },
  {
    icon: ScanSearch,
    title: "Extract",
    body: "Instructor + Pydantic force the model's output into a typed SuretySubmission. Invalid output is automatically re-asked; the schema is the contract.",
    demo: "One SuretySubmission schema, one call.",
    production: "A schema per document type, chunked passes for long financials, and a reconciliation step when documents disagree.",
    shapedBy: ["UW-03", "UW-05", "UW-06"],
  },
  {
    icon: ShieldCheck,
    title: "Validate",
    body: "Business rules run as plain code: bond amounts positive, FEIN shapes, WIP arithmetic. Deterministic, testable, no model involved.",
    demo: "Six SOP rules, UW-01 through UW-06.",
    production: "The carrier's own register, elicited from the review team, versioned, and expanded rule by rule.",
    shapedBy: ["UW-03", "UW-04", "UW-05"],
  },
  {
    icon: SlidersHorizontal,
    title: "Confidence gate",
    body: "The model scores its own certainty per field. Anything below 0.75, or unreported, cannot proceed unattended.",
    demo: "A fixed 0.75 threshold for every field.",
    production: "Thresholds tuned per field and program tier from eval data on the carrier's own documents.",
    shapedBy: ["UW-01", "UW-02"],
  },
  {
    icon: UserCheck,
    title: "Human review",
    body: "Flagged fields queue for an underwriter. Approve or override per field; every decision is an audit-trail entry and a new labeled training pair. Autonomy is earned in steps: today the system only reads and proposes. Write-backs arrive one capability at a time, after evals prove each one.",
    demo: "One queue; approve or override per field.",
    production: "Assignment by tier and territory; write-backs to source systems arrive per capability, after evals prove each one.",
    shapedBy: ["UW-01", "UW-02", "UW-06"],
  },
];

const WORKFLOW_STEPS = [
  { label: "Submission intake", sublabel: "STEP 01", kind: "covered" },
  { label: "Triage", sublabel: "STEP 02 · CLASSIFY", kind: "covered" },
  { label: "Appetite review", sublabel: "STEPS 03-04", kind: "covered" },
  { label: "Completeness review", sublabel: "STEPS 05-06", kind: "covered" },
  { label: "Underwriting review", sublabel: "AFTER THE HANDOFF", kind: "next" },
  { label: "Quote", sublabel: "NOT IN SCOPE", kind: "untouched" },
  { label: "Issue and execute", sublabel: "NOT IN SCOPE", kind: "untouched" },
] as const;

export function PipelinePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [openSop, setOpenSop] = useState<string | null>(null);
  const { data: guidelines, isLoading: guidelinesLoading } = useQuery({
    queryKey: ["guidelines"],
    queryFn: api.guidelines,
  });

  useEffect(() => {
    if (!location.hash.startsWith("#sop-")) return;

    const guidelineId = location.hash.slice("#sop-".length).toUpperCase();
    setOpenSop(guidelineId);

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
        title="From messy submission to review-ready file."
        sub="Six deterministic steps carry a broker package from raw documents to a prepared, cited file in the underwriter's queue. Every step is testable, every decision is audited, and nothing consequential happens without a person: the administrative work is automated, and every underwriting decision stays with the underwriter."
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
              COVERED BY THIS SYSTEM · STEPS 01-06
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
          <GlossaryText text="This system covers one slice of a longer chain: intake through completeness. Extraction and checks run automatically; a person resolves flagged fields in the review queue. Underwriting review starts where we stop, working from the prepared, cited file. Quoting and issuance never move." />
        </p>
      </section>

      <ol className="flex flex-col gap-3">
        {STAGES.map(({ icon: Icon, title, body, demo, production, shapedBy }, i) => (
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
              <div className="mt-3 border-t border-line pt-2.5">
                <div className="grid grid-cols-[110px_1fr] items-baseline gap-x-3 gap-y-1">
                  <span className="font-fragment text-[8.5px] uppercase tracking-[0.14em] text-body/50">
                    This demo
                  </span>
                  <span className="text-[13px] leading-[1.5] text-body">
                    <GlossaryText text={demo} />
                  </span>
                  <span className="font-fragment text-[8.5px] uppercase tracking-[0.14em] text-cobalt/80">
                    Production
                  </span>
                  <span className="text-[13px] leading-[1.5] text-body">
                    <GlossaryText text={production} />
                  </span>
                  {shapedBy.length > 0 && (
                    <>
                      <span className="font-fragment text-[8.5px] uppercase tracking-[0.14em] text-body/50">
                        Shaped by
                      </span>
                      <span className="flex flex-wrap gap-1.5">
                        {shapedBy.map((id) => (
                          <button
                            key={id}
                            type="button"
                            className="border border-cobalt/35 px-1.5 py-0.5 font-fragment text-[9px] font-semibold uppercase tracking-[0.14em] text-cobalt hover:bg-cobalt/5"
                            onClick={() => navigate(`#sop-${id.toLowerCase()}`)}
                          >
                            {id}
                          </button>
                        ))}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </Card>
          </li>
        ))}
      </ol>

      <section className="mt-10">
        <div className="rise mb-5" style={{ animationDelay: "760ms" }}>
          <div className="mb-2 font-fragment text-[10px] uppercase tracking-[0.18em] text-cobalt">
            The intake SOP · clauses UW-01 to UW-06
          </div>
          <p className="max-w-3xl text-[14px] leading-[1.6] text-body">
            <GlossaryText text="One SOP, six numbered clauses, each with its own trigger, owner, and version: the form a pipeline can execute and an auditor can diff. Elicited in three working sessions with the review team; executed on every run since. In a pilot, the first two weeks are these sessions with your reviewers." />
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
            guidelines?.map((guideline, i) => {
              const isOpen = openSop === guideline.id;

              return (
                <div
                  key={guideline.id}
                  id={`sop-${guideline.id.toLowerCase()}`}
                  className="rise scroll-mt-24"
                  style={{ animationDelay: `${820 + i * 70}ms` }}
                >
                  <Card className="!p-4">
                    <div
                      role="button"
                      tabIndex={0}
                      className="w-full cursor-pointer text-left focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-cobalt"
                      aria-expanded={isOpen}
                      aria-controls={`sop-details-${guideline.id.toLowerCase()}`}
                      onClick={() => setOpenSop(isOpen ? null : guideline.id)}
                      onKeyDown={(event) => {
                        if (event.currentTarget !== event.target) return;
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setOpenSop(isOpen ? null : guideline.id);
                        }
                      }}
                    >
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
                          </div>
                        </div>
                        <span
                          className={`flex shrink-0 items-center gap-2 font-fragment text-[9px] uppercase tracking-[0.14em] sm:w-44 sm:justify-end sm:text-right ${
                            guideline.severity === "route" ? "text-cobalt" : "text-body/50"
                          }`}
                        >
                          {guideline.route}
                          <ChevronDown
                            size={14}
                            className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
                            aria-hidden
                          />
                        </span>
                      </div>
                    </div>
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
                    {isOpen && (
                      <div
                        id={`sop-details-${guideline.id.toLowerCase()}`}
                        className="mt-3 border-t border-line pt-3.5"
                      >
                        <div className="border-l-2 border-cobalt/40 pl-3">
                          <p className="font-newsreader text-[15.5px] italic leading-[1.5] text-ink">
                            "{guideline.quote}"
                          </p>
                          <div className="mt-1.5 font-fragment text-[8.5px] uppercase tracking-[0.14em] text-body/45">
                            {guideline.elicited_from}
                          </div>
                        </div>

                        <dl className="mt-3.5 grid grid-cols-[120px_1fr] items-start gap-x-4 gap-y-3.5">
                          <dt className="font-fragment text-[8.5px] uppercase tracking-[0.14em] text-cobalt/70">
                            Why this rule
                          </dt>
                          <dd className="text-[13px] leading-[1.55] text-body">
                            <GlossaryText text={guideline.purpose} />
                          </dd>

                          <dt className="font-fragment text-[8.5px] uppercase tracking-[0.14em] text-cobalt/70">
                            Procedure
                          </dt>
                          <dd>
                            <ol className="flex list-none flex-col gap-y-1.5">
                              {guideline.procedure.map((step, stepIndex) => (
                                <li key={step} className="grid grid-cols-[28px_1fr] gap-x-2">
                                  <span className="font-fragment text-[10px] text-cobalt">
                                    {String(stepIndex + 1).padStart(2, "0")}
                                  </span>
                                  <span className="text-[13px] leading-[1.55] text-body">
                                    <GlossaryText text={step} />
                                  </span>
                                </li>
                              ))}
                            </ol>
                          </dd>

                          <dt className="font-fragment text-[8.5px] uppercase tracking-[0.14em] text-cobalt/70">
                            Escalation
                          </dt>
                          <dd className="text-[13px] leading-[1.55] text-body">
                            <GlossaryText text={guideline.escalation} />
                          </dd>

                          <dt className="font-fragment text-[8.5px] uppercase tracking-[0.14em] text-cobalt/70">
                            In the pipeline
                          </dt>
                          <dd className="text-[13px] leading-[1.55] text-body">
                            <GlossaryText text={guideline.pipeline_note} />
                          </dd>
                        </dl>

                        <div className="mt-3.5 flex justify-between gap-3 border-t border-line pt-2.5">
                          <span className="font-fragment text-[8.5px] uppercase tracking-[0.14em] text-body/45">
                            OWNER · {guideline.owner}
                          </span>
                          <span className="font-fragment text-[8.5px] uppercase tracking-[0.14em] text-body/45">
                            {guideline.version}
                          </span>
                        </div>
                      </div>
                    )}
                  </Card>
                </div>
              );
            })
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
            Model choice stays yours: run whichever endpoint your compliance team approves, inside your
            own cloud, and adopt better models as they ship. The evals decide what is good enough; the
            pipeline, schema, and traces never change.
          </p>
        </div>
      </div>
    </div>
  );
}
