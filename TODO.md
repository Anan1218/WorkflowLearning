# TODO

Working tracker for getting WorkflowLearning from "code exists" to "demonstrably works end-to-end, with evidence." Roughly ordered; check things off as they land. The enterprise-grade wrapper items live in the README's [Enterprise readiness checklist](README.md#enterprise-readiness-checklist-soc-2--regulated-carrier-grade) - this file is the hands-on execution list.

## Phase 0 - Environment (blockers, ~15 min, mostly human)

- [x] **[you]** API key in `.env` - went with OpenRouter instead of Anthropic (account has $0 credits: `:free` models only until topped up at openrouter.ai/settings/credits)
- [x] **[you]** Langfuse Cloud account + keys in `.env` (verified: auth_check passed, traces landing)
- [x] **[claude]** Create `.venv` and install `requirements.txt`
- [x] Sanity check: extraction runs end-to-end via OpenRouter and traces appear in Langfuse
- [x] **[claude]** Defaults de-risked: `extract.py`/`generate.py` default to cheap `openrouter/deepseek/deepseek-chat-v3.1`, overridable via `MODEL=` env var (full 9-case eval ≈ $0.01 on DeepSeek)

## Phase 1 - Dataset

- [x] Generate ~20 synthetic (document, ground_truth) pairs -> `data/synthetic/{train,val}/` (done via Codex/gpt-5.5 instead of the API path - free; 20/20 validate against `SuretySubmission`; note: `data/synthetic/` is gitignored by design, regenerate or copy to move machines)
- [x] Eyeball 3-4 generated docs for realism (spot-checked clean 000 + hard 005/006; realistic broker voice, WIP tables, OCR artifacts, an authoritative-correction contradiction)
- [x] Vary difficulty: 8 clean / 7 missing-field / 5 hard (garbled OCR-ish text, contradictions)
- [ ] Promote 2-3 good val docs to `evals/cases/` as committed hand-checked examples

## Phase 2 - Baseline eval

- [x] Baseline recorded (2026-07-02, `nvidia/nemotron-3-super-120b-a12b:free`, 8/9 cases - case 004 hit max_tokens):
      **OVERALL 95.3%** - principal.name 100%, principal.fein 100%, obligee.name 100%, bond_type 87.5%, bond_amount 100%, working_capital 75%, net_worth 100%, wip_total_contract_value 100%
- [ ] Re-run baseline on a paid model (DeepSeek v3.1 + one frontier anchor) once credits are loaded - free-tier 429s make runs flaky
- [ ] Look at the worst 3 fields; understand *why* they miss (schema ambiguity vs prompt vs genuinely hard)
- [ ] Fix the cheap wins (field descriptions in `src/schemas.py` are prompt real estate); re-run; record delta

## Phase 3 - Model comparison (the model-agnostic payoff)

- [ ] Run the same harness against 2-3 models (Sonnet vs Opus vs a GPT model) by flipping the `MODEL` string; record accuracy + cost per doc
- [ ] Write up the tradeoff in one paragraph - this is the artifact that proves "swap models by changing one string"

## Phase 4 - Optimization experiment (optional, needs Phase 1-2 done)

- [ ] Run `experiments/dspy_optimize.py` against the train set; measure val delta
- [ ] Hand-port whatever it discovered (better few-shots / phrasing) into the stable extractor; confirm the gain survives the port

## Phase 5 - Production hardening (pick from the README checklist)

These are exercises in the enterprise wrapper, in rough order of learning value:

- [ ] PII redaction pass before tracing (reuse the Call-PII-Scrubber pattern) - GLBA item #2
- [ ] Audit-trail table design: per-extraction model version, prompt version, input hash, output, confidence, human override - checklist item #4
- [ ] Jobs/worker queue with retries + idempotency - checklist item #5
- [ ] FastAPI intake + Postgres data plane, Docker packaging
- [ ] Self-hosted Langfuse (prove the "one env flip" claim actually holds)
- [ ] Durability spike: wrap the pipeline steps in DBOS Transact (Postgres-only durable execution) - checkpointed retries + workflow versioning without Temporal-style ops
- [ ] (optional, literacy) Time-boxed LangGraph spike: rebuild the same flow, compare LoC/debuggability/eval-ability, write down why plain Python won (or didn't) - see LESSONS.md

## Phase 6 - Product surface (the UIs we'd actually use)

If we were really building this up, the pipeline needs faces. Build them as if for ourselves - dogfood-grade, not mockups. Needs the Phase 5 data plane (Postgres/Supabase) underneath.

- [ ] **Data plane UI** - browse submissions: list view with status (received / extracted / needs review / approved), detail view showing the raw document next to the extracted `SuretySubmission`, per-field confidence visible. Filter by bond type, status, date.
- [ ] **Approval / review dashboard** - the human-in-the-loop queue: submissions below the confidence threshold land here; reviewer sees doc + extraction side by side, low-confidence fields highlighted, can accept or override per field. Every decision writes to the audit trail (checklist item #4) - approve/override *is* the audit event.
- [ ] Overrides become labeled data - each human correction is a new (doc, ground_truth) pair that feeds the eval set and (Phase 4) the optimizer. Close the loop.
- [ ] **Ops/quality dashboard** (lighter priority) - eval accuracy over time, per-field error rates, throughput, cost per doc. Langfuse covers traces; this is the business-metrics layer on top.

## Accounts / external setup (running list)

| Thing | Status | Notes |
|---|---|---|
| OpenRouter key | ✅ in `.env` | $0 credits - `:free` models only; top up ~$5 for reliable evals + model comparison |
| Langfuse Cloud | ✅ verified | free tier; self-host later in Phase 5 |
| Anthropic/OpenAI direct keys | ❌ optional | not needed while OpenRouter covers everything |
| Supabase / Postgres | ❌ later | Phase 5 data plane |
