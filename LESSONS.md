# LESSONS

Plain-language notes on the tooling decisions in this repo - what each piece is, why it was chosen, what the alternatives were, and the one principle underneath all of it. Written for future-me pitching or building this for a real carrier.

## The one idea underneath everything

**Keep the pipeline plain Python with typed contracts, and keep every vendor (model, router, cloud, framework) behind a one-line seam so it can be swapped.**

Every tool decision below is this same principle wearing a different hat. If overwhelmed, hold onto this one sentence and re-derive the rest.

## The map: five boxes tools live in

| Layer | Job | Our pick | Main alternatives |
|---|---|---|---|
| Model access / routing | reach models; keys, billing, endpoints | OpenRouter (dev), Bedrock/Vertex (prod) | direct provider APIs, LiteLLM |
| Structured output | model text -> validated typed data | **Instructor + Pydantic** | native structured outputs, Pydantic AI, Outlines, BAML |
| Orchestration | wire multi-step apps | **plain Python functions** | LangChain/LangGraph, LlamaIndex, CrewAI |
| Prompt optimization | tune prompts against labeled data | DSPy, offline only | hand-tuning |
| Observability | trace calls, cost, latency | **Langfuse** (via OTel) | LangSmith, Arize Phoenix, Braintrust, W&B Weave |

Confusion usually comes from comparing tools across boxes (e.g. "Instructor vs LangChain"). Compare within a box; between boxes, tools compose.

## Instructor (structured output)

**What it is:** a small, very popular Python library (Jason Liu, 2023; millions of downloads/month) that makes an LLM return a validated Pydantic object instead of a string. `response_model=SuretySubmission` is the whole trick; on validation failure it automatically re-asks the model.

**Why it wins for this use case:** structured extraction *is* the product here. Instructor is the smallest tool that does it, it's model-agnostic (`from_provider("anthropic/...")` / `"bedrock/..."` / `"openrouter/..."` - same code), and the exit cost is ~one function in `extract.py` because schemas, evals, and tracing never touch it.

**Honest alternative:** providers' native structured outputs (no library at all) - defensible if single-provider forever. Instructor adds the retry loop (native structured outputs guarantee JSON *shape*, not that values pass business-rule validators) and cross-provider uniformity, which the whole dev-cheap/deploy-anywhere story depends on. Pydantic AI is the credible up-and-comer to re-evaluate in a year.

**Verdict: keep.** Boring, standard, removable.

## OpenRouter vs Instructor (they are NOT the same thing)

Both advertise "switch models easily" but solve different problems:
- **Instructor** solves the *code* problem: one uniform interface, so your pipeline never changes.
- **OpenRouter** solves the *account* problem: one signup/key/bill instead of five provider accounts.

Universal remote vs cable subscription: the remote standardizes buttons, the subscription gets you channels. Independent; you can use either without the other.

**Do we need OpenRouter? Strictly, no.** It's a convenience, not a dependency. It pays off for multi-model comparison (Phase 3: five models, one key, incl. models Instructor has no native provider for, like GLM) and for cheap open-weight models. If we only ever ran Anthropic + OpenAI, two direct keys would be fine. **Never on the customer's architecture slide** - it's an extra subprocessor. Dev tool only.

## Model choice & where models are served

- Cheap dev on synthetic data: anything, incl. DeepSeek/GLM via OpenRouter. Fine because no real PII.
- Carrier prod: **Bedrock/Vertex inside their cloud** - zero new subprocessors, inherits their existing AWS/GCP agreements, IAM roles instead of API keys (no long-lived secrets). Open-weight models (DeepSeek etc.) served by AWS on US infra are compliance-safe; the same weights via the Chinese API are not.
- Switching is a one-string change in code; what changes between environments is *credentials*, which is deployment config, not code.
- **Which model to pick is the eval harness's job, not DSPy's.** Harness compares models (per-field accuracy + cost per doc); DSPy optimizes prompts for one chosen model, offline. Comparison engine vs tuning engine.

## Workflows: "do this, then do that"

The RLI flow (classify -> extract -> validate -> dedup -> triage -> human review) is **deterministic steps with LLMs inside some steps**. That's plain Python functions with Pydantic contracts between them - not an agent framework.

- "The model decides the branch" is still just an if-statement: the LLM returns a typed `Route` decision, your code branches on it. You own the control flow; the model votes.
- The genuinely hard production problem is **durability, not orchestration**: retries, idempotency, resuming after a crash, a submission waiting days for human review. Solution: jobs/worker queue + a `status` state machine on the submission row in Postgres (each transition doubles as an audit-trail event).
- **Decision rule:** if you can draw the flowchart on a whiteboard, write it as Python. LangGraph only enters if flows become genuinely loopy/stateful (model revisits steps, unpredictable paths) - a bounded rewrite of one routing layer if that day ever comes.
- LangChain generally: a batteries-included app framework, best for fast prototyping with many integrations. Common industry path is "prototype in LangChain, rewrite in plain Python for production." This repo skips to step two.

## Durability (crash-survival, retries, waiting on humans)

**Current state: none** - acceptable for a learning repo, first thing to add for production (Phase 5).

Durability means: a submission survives a worker crash; a failed step retries without re-paying earlier LLM calls; a submission can wait days at `needs_review` and resume; duplicate documents don't create duplicate submissions. These are *database* problems, not orchestration problems.

Three tiers, adopt in order and only when forced upward:
1. **Postgres as the durability layer** (start here): submission = row, `status` column = state machine, each step persists its output on completion, workers claim rows via `SELECT ... FOR UPDATE SKIP LOCKED` and run one step. Crash -> another worker retries just that step. Dedup = unique constraint on doc hash. Every status transition doubles as an audit-trail event. Covers ~90% of carrier intake needs.
2. **Task queue** (Celery / Hatchet / Inngest): adds scheduled retries with backoff, provider rate-limit smoothing, parallel workers. Same state machine underneath.
3. **Durable execution engine** (Temporal, or **AWS Step Functions + SQS** - the one to name in a carrier pitch, since it lives inside their existing AWS account like Bedrock): only when workflows get long-lived/complex enough that the engine should own resume-from-checkpoint.

Trap: reaching for Temporal/LangGraph-checkpointing on day one. The boring Postgres status machine is auditable and fully owned by a 2-person team - same filter as everything else here. (LangGraph isn't a durability tool at all - its checkpointing serves agent loops, not enterprise queue/retry/ops semantics. Keep it out of this box.)

## Storage: Supabase Postgres for review state

**Decision:** use Supabase Postgres as the review queue store, with the existing JSON file store kept as the local fallback.

Why over SQLite/JSON: Postgres gives the demo a real system-of-record story, and `review_decisions` is append-only so human overrides form an audit trail instead of overwriting history. The JSON fallback keeps zero-setup local dev. A single Fly machine connects through the Supabase pooler because the direct database host is IPv6-only.

**When the customer is building an internal SaaS/platform (the RLI case):** the calculus shifts - not because Postgres lacks durability (intake volumes are 100x below its ceiling), but because one pipeline becomes a *pattern* for many workflows, and a real engine earns its keep on platform concerns: shared ops console, workflow versioning mid-flight, uniform retry policy, one place ops looks at 2am. Then:
- **AWS shop -> Step Functions + SQS**: serverless, zero ops, native audit history of every transition, IAM-integrated, inside their existing cloud agreement. Best and boring coincide.
- **Azure shop -> Durable Functions + Service Bus**: same logic, Microsoft flavor. Code-first orchestration with built-in checkpointing/replay; Python supported. Models via **Azure AI Foundry** (Claude is available there since late 2025, plus DeepSeek/open weights; Instructor has native `azure_openai` support) - the "one string, their cloud" story is identical.
- **Temporal**: the strongest engine, but self-hosting it is a distributed system their platform team must own; Temporal Cloud adds a subprocessor. Right only if they already run it or have real platform engineering. (We don't enjoy its programming model - fine, we never *need* it.)
- **Postgres + a durable-execution library** - the "state machine, but versioning/retries written by someone else" option: **DBOS Transact** (decorators on plain Python functions; checkpointing, recovery, retries, workflow versioning; *Postgres is the only backend*, no server to run) or **Hatchet** (Postgres-backed queue + dashboard, one server). DBOS is the sweet spot for a small team that finds Temporal heavy.
- **Still pilot on Postgres** (optionally with DBOS from day one) - it forces the design that makes the engine choice cheap: steps as typed, idempotent, engine-agnostic Python functions. Lifting those into Durable Functions/Step Functions/Temporal is mechanical; steps welded to one engine are the expensive mistake.
- FDE framing for the room: "we build on what your team can run at 2am" - the production engine is a joint decision with their platform team, keyed to their existing stack.

**RLI specifically (researched 2026-07): they are an Azure/.NET shop.** Azure adopted ~2014 for app hosting; current postings: Senior/Lead .NET engineers with Azure preferred, and a Cloud Solutions Architect role explicitly scoped to Azure-led cloud modernization. So the pitch slide says: Azure AI Foundry for models, Durable Functions + Service Bus for orchestration, Azure Database for PostgreSQL for the data plane.

## Legacy integration: sync vs pull-on-demand

Two standard ways to get data out of a carrier's legacy systems: query the source when you need it (pull-on-demand), or replicate on a schedule into the unified data layer (periodic sync). The choice hangs on properties of the source, not convention.

**Default: periodic sync into Postgres.** Carrier legacy systems are the bottleneck almost by definition: fragile, rate-limited, batch-window-only (nightly extracts, SFTP drops), or fronted by awkward APIs where you want to pay the query cost once per record, not once per user request. Multiple internal consumers always emerge, and a synced layer means one integration instead of N. Start with the dumbest version that works: a poller writing plain Postgres tables with a `synced_at` column, freshness surfaced per record in the UI (the Sources panel's "Last sync" is this made visible). Add CDC or webhooks only if the source ever offers them.

**Pull live instead when:** the value is volatile and decision-critical at the moment of action (a clearance check against the bond system of record), or - the insurance-specific rule - the data is consumer-report data. FCRA permissible purpose attaches to a specific transaction, and bureau/vendor contracts (personal credit, LexisNexis) generally prohibit caching and re-use. Those sources are pull-per-submission for compliance reasons, not architectural ones; never replicate them.

**The trap to name out loud:** once you own a copy, reads come from the copy while writes go to the source, and the two disagree until the next poll. Our current answer is structural: the pipeline only reads legacy systems and writes solely to its own system of record; write-backs arrive one proven capability at a time (see the autonomy ladder below), each forced to confront this question individually.

The Sources map is this rule applied fourteen times: webhook where the source pushes, 15-minute poll where freshness is decision-relevant, hourly/nightly where it is not, on-demand per submission where contracts require it, each with its rationale attached.

## Langfuse (observability)

**Why it's the right pick here, maybe not "best" universally:** the deciding feature is **self-hostable + OTel-native**. For a carrier, traces capture document content (NPI), so observability must be able to run inside their walls - Langfuse self-host is an env flip in this repo, no code change. It's open-source, widely adopted, and LLM-specific (prompts, tokens, cost, latency per call).

Alternatives: **LangSmith** (polished but SaaS-first and LangChain-gravity), **Arize Phoenix** (open-source, strong, the closest peer - fine substitute), **Braintrust / W&B Weave** (eval-centric, SaaS). None beat Langfuse on the self-host + OTel + no-framework-lock-in combination that this use case requires. Because tracing goes through OTel (`src/trace.py`), even Langfuse itself is swappable - it's just the backend the spans are shipped to.

**Verdict: keep.** Chosen for the compliance-shaped reason, which is the reason that matters here.

## Own the intelligence layer, rent the plumbing (the FDE stack lesson)

Studied FDE job postings (Varick Agents' AI Engineer posting, plus the OpenAI/Anthropic-era FDE guides). What they hire for and sell: agent architectures, **eval systems for trust**, prompt/context engineering, **feedback loops from human corrections**, exception routing, and a **pattern library that compounds across clients**. What none of them mention: Temporal, Step Functions, or any workflow engine.

The absence is the lesson: **FDE shops own the intelligence layer and adopt the customer's plumbing.** Durable orchestration is not differentiation - it's whatever the enterprise already runs (Durable Functions at an Azure shop, Step Functions at AWS, cron + a database at a laggard). We use it and build on top; *their* team fixes it at 2am, which is exactly why it must be *their* primitive. Fewer components for security review, and the ops pager stays with the people who own the pager.

Temporal's real habitat confirms it: Coinbase/Snap/Datadog/Netflix-class transaction volume - thousands of workflows/sec where a dropped execution loses money instantly. Insurance intake is 3-4 orders of magnitude below that, with humans-in-the-loop measured in hours. Postgres handles it at idle.

What compounds for us instead (our pattern library): schemas, extractor, eval harness, HITL/override-to-labeled-data loop, audit-trail design, this decision log.

## Agent frameworks (CrewAI, LangGraph, AutoGen...): literacy yes, adoption no

The Varick JD lists under *Helpful* (not required): "Agent frameworks: LangGraph, CrewAI, Claude Code/Codex patterns, **or custom orchestration**." That last clause is load-bearing - frameworks are named as interchangeable *evidence you've built agents*, not as the stack. Custom orchestration (what this repo does) is listed as an equal. Should we adopt the frameworks? For *this* pipeline: no - it's a deterministic flow with LLMs inside steps; typed functions + if-statements on model-returned decisions cover it (see Workflows section).

- **LangGraph**: the only one with a credible production niche - genuinely dynamic agent loops (model revisits steps, unpredictable paths) with checkpointing and human-interrupt points. If a future engagement is truly agentic (open-ended research/negotiation loops, not document pipelines), it's the first candidate. Until then it's complexity with no payer.
- **CrewAI / AutoGen**: multi-agent role-play frameworks; great for fast demos, weakest production reputation. Skip.
- **Why literacy still matters**: the market speaks these names - pitches, hiring, and customer conversations go smoother when we can say *why* we didn't use them, from experience rather than prejudice. A time-boxed spike (rebuild this pipeline's flow in LangGraph, compare LoC/debuggability/evals) is a legitimate learning exercise; adopting it for production is not.

The filter, restated: frameworks want to be your architecture. Components (Instructor, DBOS, Langfuse) slot behind seams. We buy components, we don't marry frameworks.

## Scaling plain-Python orchestration across customers

Orchestration is the thin part (~200 lines of "run these steps, write status"); the expensive assets are schemas, prompts, evals, HITL/audit patterns - the pattern library. Scaling is a code-reuse problem, not a framework problem:

1. **Template repo** (customers 1-3): this repo. Copy, adapt schemas + cloud seams per engagement.
2. **Core library** (when patterns repeat): extract `stello-idp-core` (schema bases, extractor factory, scorers, audit helpers, HITL queue) - versioned, pip-installable. Engagement = their schemas + their cloud config + glue. This kills the real failure mode: fork drift across customers.
3. **Productize** (maybe never): deployable appliance or hosted SaaS - the Palantir services->Foundry arc. A strategy decision; stages 1-2 don't foreclose it.

Plain Python is what makes the library portable at all: customer A is Azure, B is AWS, C is on-prem - engine-agnostic typed functions drop into all three; any framework we standardized on would need ripping out per customer. Custom orchestration in FDE shops is necessity, not naivety.

**When the answer flips:** hosted SaaS on *our* infra means *we* hold the 2am pager - then owning a durable platform (Temporal/Hatchet) becomes rational. General rule: **whoever holds the pager picks the engine.**

## RAG (when we need to search a corpus)

Extraction needs no RAG (the doc is given). RAG enters where a step consults a corpus: clearance/dedup (prior submissions), appetite matching (guideline docs), precedent lookup, underwriter Q&A.

Not custom-built each time - same pattern as orchestration: small reusable code on components, per-customer config:
- **pgvector in the Postgres we already run** - thousands-to-millions of docs is comfortably within range; no Pinecone/Qdrant, no new subprocessor, embeddings live under the same backup/audit/access story.
- **Hybrid search** (Postgres full-text + vector, merged) - mandatory in insurance, where exact terms (bond numbers, FEINs, statutes) beat embeddings; both halves are SQL.
- **Rerank** the top ~50 (cross-encoder API or LLM pass). One function. Whole retrieval module: a few hundred lines -> `stello-idp-core`.
- **Per-customer**: chunking strategy per doc type (where RAG quality actually lives), metadata filters, and retrieval evals (recall@k on labeled query-doc pairs - same harness philosophy).

Before building RAG at all, check two cheaper paths: (1) long-context - a guideline manual that fits in the window beats a retrieval pipeline; (2) **agentic search** - let the model iteratively query SQL/full-text like an analyst; often simpler *and* better over structured corpora like prior submissions. No LlamaIndex-style framework - components behind seams, as always.

## FDE playbook alignment (audit / evals / deployment)

Audited against the Varick FDE guide; the architecture already follows it. The rules, written down:

**Automate-vs-not (the audit rules), mapped to our stages:**
- Rules distillable but inputs vary (email / PDF / scanned WIP) + tool calls involved → **agent**: that's classify + extract.
- Rules AND inputs predictable → **plain code**: that's validate, clearance/dedup, the state machine.
- Judgment + domain expertise → **manual**: that's the confidence-gated underwriter review. Never auto-decline.
- One LLM call as the orchestrating layer, everything else deterministic tool calls - too much AI = token cost + worse output.
- Volume test: automation needs enough runs to matter (submission intake passes; a five-times-a-month workflow doesn't).

**Overlay, not migration (the data-layer rule):** never propose ripping out their PAS/DMS/ERP - customers just spent years and millions on those. Build APIs over the existing data layer; our Postgres is a **system of work** (extractions, status, audit trail) layered beside their systems of record, with every field citing its source document/system via lineage. Nothing migrates; originals stay where they live.

**Autonomy ladder:** v1 reads and proposes only - the confidence gate means a human makes every consequential call. Write-backs (DMS filing, status updates, clearance actions) arrive one capability at a time, each unlocked only after evals prove the previous level. Smallest unit of autonomy first.

**Eval dimensions:** correctness (per-field scorers vs golden dataset), format (enforced structurally by Pydantic - can't be wrong), and now **cost + latency per query** (tokens and seconds captured at the extraction seam, shown in the UI and in eval results). Cost-per-query is what the buyer asks about.

## Go-to-market note (forward-deployed motion)

The pipeline is ~20% of enterprise-grade; the wrapper (access, secrets, audit, lifecycle, vendor mgmt, org program) is the rest - see README's enterprise-readiness checklist. As an external consultant pitching a carrier, the forward-deployed motion fits: embedded, time-boxed paid pilot, deployed in *their* cloud, eval metrics as acceptance criteria, IP split (they own the deployment, we keep the generic architecture). Lead with the compliance story, not the demo. OpenRouter/dev tools stay backstage; Bedrock/Vertex goes on the slide.
