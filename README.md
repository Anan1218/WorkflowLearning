# WorkflowLearning

A reference architecture (and hands-on learning project) for **AI submission ingestion & triage** in specialty insurance - reading messy surety/insurance documents into structured, validated, scored data with full observability.

Built to be the thing you point at and say: *this is how we build.* Schema-first, model-agnostic, observable, self-hostable. Runs entirely on **synthetic data** so there's ground truth to measure against.

> Domain context, the business case, and the full research writeup live in [`docs/`](docs/).

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
pip install -r requirements.txt
cp .env.example .env          # fill in ANTHROPIC_API_KEY (+ Langfuse keys for traces)

python -m src.generate --n 12                 # stage 0: synthetic (doc, ground_truth) pairs
python -m src.extract evals/cases/example-001.txt   # stage 1: extract one doc -> typed JSON
python -m evals.harness                        # score per-field accuracy vs ground truth
```

Swap models by changing the `MODEL` string in `src/extract.py` (e.g. `"openai/gpt-5.1"`) and re-running `evals.harness` - the pipeline doesn't change.

## Layout

```
src/schemas.py     the Pydantic data contract (SuretySubmission, WIP, ...)
src/extract.py     the Instructor + Pydantic extractor (the backbone)
src/generate.py    synthetic data generator (doc + exact ground truth)
src/trace.py       OTel -> Langfuse seam (self-host = env change)
evals/scorers.py   per-field accuracy (also the DSPy metric)
evals/harness.py   run the extractor over val + committed cases
evals/cases/       committed hand-labeled examples
experiments/       phase-2 DSPy offline optimizer (optional)
docs/              RLI prep brief + submission-ingestion research
```

## Roadmap (production IDP, research-flagged)

- **OCR + image hybrid ingestion** - don't rely on image-only extraction for scanned/handwritten ACORD forms and messy Excel WIP schedules; combine OCR text + page image.
- **Jobs/worker queue**, **PII redaction**, **schema versioning/migration** - first-class production concerns.
- **Data plane** in Postgres/Supabase; multi-doc classify + merge; clearance/dedup; appetite/triage; confidence-thresholded human-in-the-loop review; Docker packaging; FastAPI intake.
- **DSPy optimization pass** once there's enough labeled data.
