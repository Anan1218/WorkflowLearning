# WorkflowLearning

A reference architecture (and hands-on learning project) for **AI submission ingestion & triage** in specialty insurance - reading messy surety/insurance documents into structured, validated, scored data with full observability.

Built to be the thing you point at and say: *this is how we build.* Schema-first, model-agnostic, observable, self-hostable. Runs entirely on **synthetic data** so there's ground truth to measure against.

> Domain context, the business case, and the full research writeup live in [`docs/`](docs/). Plain-language notes on every tooling decision (and the alternatives considered) live in [`LESSONS.md`](LESSONS.md). Execution tracker: [`TODO.md`](TODO.md).

## The stack (and why)

| Layer | Choice | Why |
|---|---|---|
| Extraction backbone | **Instructor + Pydantic** | Typed extraction, validates output against the schema and re-asks on failure. Plain Python, model-agnostic, maintainable by a small team. |
| Data contract | **Pydantic v2** (`src/schemas.py`) | One source of truth for what a submission *is*. Surety modeled first-class (principal/obligee/bond/WIP). |
| Model access | **Instructor `from_provider`** | Swap Claude / GPT / Gemini by changing one string. Not locked to a provider. |
| Observability | **OpenTelemetry → Langfuse** | Every call traced (prompt, tokens, cost, latency, output). Cloud for dev; self-host is a one-line env flip for real PII. |
| Evals | **pytest + `evals/scorers.py`** | Per-field accuracy vs ground truth. Run it before every change. It's also the metric the optimizer maximizes. |
| Optimization (phase 2) | **DSPy, offline only** | Discovers better prompts/few-shots against labeled data; you hand-port the learnings. Kept *out* of the runtime on purpose (see below). |

**Why DSPy is not the backbone:** research found DSPy's optimizers deliver real gains, but DSPy-optimized prompts are coupled to its runtime and don't port out cleanly, and it ships breaking changes - too much lock-in/maintenance risk to standardize a whole pipeline on for a 2-person team. So DSPy is scoped to an offline optimization *experiment*, and a stable schema-first layer is the backbone.

## Quickstart

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt   # installs the three editable packages (core, evals, api)
cp .env.example .env              # fill in OPENROUTER_API_KEY (+ Langfuse keys for traces)

python -m core.generate --n 12    # stage 0: synthetic (doc, ground_truth) pairs
python -m core.extract packages/evals/evals/cases/example-001.txt   # stage 1: one doc -> typed JSON
python -m evals.harness --save    # score per-field accuracy vs ground truth, publish results
```

Swap models by changing the `MODEL` env var or the default in `packages/core/core/extract.py` and re-running `evals.harness` - the pipeline doesn't change.

## Run the demo dashboard

A monorepo web app (FastAPI + React, vertical-slice architecture in `apps/`) that puts a face on the pipeline: paste/upload a document (or pick a labeled sample), pick a model, watch the extraction run, see per-field confidence + cost per query, and work the human-review queue. Follows the Stello DESIGN.md.

```bash
docker compose up --build        # -> http://localhost:8000  (reads .env for keys)
```

Dev loop (hot reload):

```bash
.venv/bin/uvicorn api.main:app --reload --port 8000   # API
cd apps/web && npm install && npm run dev              # UI on :5173, /api proxied
```

Notes: extraction jobs run in the background and the UI polls; low-confidence fields (< 0.75) auto-route to the Review queue (state in `data/app_state/`, survives restarts); the Evals page reads committed `packages/evals/evals/results/*.json` (produce more with `python -m evals.harness --save`); the model dropdown is allowlisted in `apps/api/api/config.py` - the model-agnostic one-string swap, live.

### Deploy

API + fallback UI on Fly.io at https://rli-demo.fly.dev - one 512MB machine with auto-stop (idle ≈ $0, ceiling ≈ $3.50/mo) + a 1GB volume at `/app/data` (samples seeded on first boot by `docker-entrypoint.sh`; review-queue state persists). Frontend also deploys to Vercel (root directory `apps/web`, env `VITE_API_BASE=https://rli-demo.fly.dev`) for the rli-demo.stelloagents.com domain.

```bash
fly deploy --local-only   # build with local Docker, ship to Fly
fly logs                  # tail the machine
fly secrets set K=V       # rotate keys (stored on Fly, never in the image)
```

## Layout

Monorepo: `packages/` are the durable assets (the pattern library), `apps/` are delivery surfaces. Dependency rule: `apps → packages`, never backward.

```
packages/core/core/        stello-idp-core: schemas.py (the data contract),
                           extract.py (Instructor backbone), generate.py, trace.py
packages/evals/evals/      harness + per-field scorers + committed cases/ + results/
apps/api/api/              FastAPI dashboard API (vertical slices: extract,
                           documents, samples, review, evals)
apps/web/                  React dashboard (Vite, Stello design language)
data/                      synthetic dataset + demo app state (gitignored)
experiments/               phase-2 DSPy offline optimizer (optional)
docs/                      RLI prep brief, research, data-sources citations
```

## Enterprise readiness checklist (SOC 2 / regulated-carrier grade)

The pipeline above is maybe 20% of an enterprise deployment - the rest is the wrapper around it: access, secrets, audit, data lifecycle, vendor management, and an org-level compliance program. This is the honest gap analysis. Checked items are covered by the current design; unchecked items are what a real deployment for an insurance carrier (GLBA NPI, NAIC model-governance expectations, SOC 2 Type II) still needs.

### Already in the bones
- [x] Self-hostable - deploys in the customer's cloud, no mandatory SaaS dependency
- [x] Observability via OTel -> Langfuse, with self-host as an env flip
- [x] Secrets gitignored and env-injected (dev-grade)
- [x] Synthetic data only in dev - no real PII in this repo
- [x] Eval harness as processing-integrity evidence
- [x] Design assumes confidence thresholds + human-in-the-loop review

### 1. Data protection
- [ ] TLS everywhere in transit; encryption at rest (DB + object storage) with keys in a KMS
- [ ] Secrets in a secrets manager (Vault / AWS Secrets Manager / Doppler) in prod - not `.env`; rotation + short-lived credentials
- [ ] Data residency (US-only), dev/stage/prod separation, masked/synthetic data in non-prod

### 2. PII / NPI handling (GLBA)
- [ ] Data classification + PII detection & redaction *before* content hits the LLM, logs, or traces - or self-host Langfuse so nothing leaves (traces capture document content otherwise)
- [ ] Retention schedules, secure deletion, right-to-delete

### 3. AI / model governance (NAIC Model Bulletin, NYDFS-style)
- [ ] Model terms in writing: zero data retention, no training on customer data (enterprise agreement or VPC/self-hosted model)
- [ ] Prompt-injection defense - extracted document text is untrusted input, treated as data, never as instructions
- [ ] Model risk management docs: model/prompt versioning + pinning, accuracy validation, bias/fairness testing, adverse-action explainability (the eval harness is the evidence engine)
- [ ] Human-in-the-loop gate on consequential decisions - never auto-decline without a person (designed, not yet enforced in code)

### 4. Auditability / decision lineage
- [ ] Immutable, tamper-evident audit trail: who/what/when, plus per-extraction model version, prompt version, inputs, output, confidence, and any human override. Observability != audit log - both are required.

### 5. Reliability & processing integrity
- [ ] Jobs/worker queue with retries, idempotency, timeouts, graceful degradation, rate-limit handling
- [ ] Backups + *tested* restore, DR plan, health checks, monitoring/alerting (SIEM/log aggregation)
- [ ] CI/CD with the eval suite as a merge gate, PR review, no direct prod edits (change management)

### 6. Infra / app security
- [ ] VPC + private networking, no public data endpoints, least-privilege IAM, WAF
- [ ] Dependency scanning (SCA), SAST, container image scanning in CI; pinned dependencies
- [ ] SSO/SAML + RBAC + MFA for all human access

### 7. Org-level program (SOC 2 is an attestation, not a feature)
- [ ] Written policies: infosec, access control, incident response, change management, vendor management, BCP/DR
- [ ] Security-awareness training, background checks, annual risk assessment, annual pen test
- [ ] Continuous evidence collection (Vanta / Drata / Secureframe) + auditor; target **Type II** (effectiveness over 6-12 months) - that's what enterprises actually ask for
- [ ] Subprocessor management: DPA + SOC 2 report from every third party touching data (model provider, Langfuse/Supabase if hosted). Self-hosting Langfuse + Postgres shrinks this surface.

## Roadmap (production IDP, research-flagged)

- **OCR + image hybrid ingestion** - don't rely on image-only extraction for scanned/handwritten ACORD forms and messy Excel WIP schedules; combine OCR text + page image.
- **Jobs/worker queue**, **PII redaction**, **schema versioning/migration** - first-class production concerns.
- **Data plane** in Postgres/Supabase; multi-doc classify + merge; clearance/dedup; appetite/triage; confidence-thresholded human-in-the-loop review; Docker packaging; FastAPI intake.
- **DSPy optimization pass** once there's enough labeled data.
