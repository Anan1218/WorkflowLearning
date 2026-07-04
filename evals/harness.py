"""Run the extractor over the val set and print per-field accuracy.

Ways to run it:
  python -m evals.harness                    # prints the accuracy table
  python -m evals.harness --save             # also writes evals/results/<run_id>.json
  MODEL=... python -m evals.harness --save   # same, against a specific model
  pytest evals/                              # as a test (skips if no keys/data)

The pytest test is guarded so it never burns API calls unintentionally: it skips
unless a model API key is set and val cases exist.
"""

from __future__ import annotations

import argparse
import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path

from src.extract import MODEL, extract_with_meta
from src.schemas import SuretySubmission
from evals.scorers import aggregate, score_case

# Committed hand-labeled examples ship with the repo; generated val augments them.
CASES = Path(__file__).resolve().parent / "cases"
VAL = Path(__file__).resolve().parent.parent / "data" / "synthetic" / "val"
RESULTS = Path(__file__).resolve().parent / "results"


def _load_dir(d: Path, prefix: str) -> list[tuple[str, str, SuretySubmission]]:
    cases = []
    if not d.exists():
        return cases
    for txt in sorted(d.glob("*.txt")):
        gt = txt.with_suffix(".json")
        if gt.exists():
            cases.append(
                (f"{prefix}/{txt.stem}", txt.read_text(), SuretySubmission.model_validate_json(gt.read_text()))
            )
    return cases


def _load_val() -> list[tuple[str, str, SuretySubmission]]:
    return _load_dir(CASES, "cases") + _load_dir(VAL, "val")


def _model_slug(model: str) -> str:
    return re.sub(r"[^a-z0-9.-]+", "-", model.rsplit("/", 1)[-1].lower())


def run(save: bool = False, model: str | None = None) -> dict[str, float]:
    model = model or MODEL
    cases = _load_val()
    if not cases:
        print("No val cases found. Run: python -m src.generate --n 12")
        return {}

    per_case: list[dict[str, bool]] = []
    case_rows: list[dict] = []
    tot_in = tot_out = 0
    latencies: list[float] = []
    for case_id, doc, truth in cases:
        pred, meta = extract_with_meta(doc, model=model)
        scores = score_case(pred, truth)
        per_case.append(scores)
        case_rows.append({"case": case_id, "fields": scores, "latency_s": meta["latency_s"], "tokens": meta})
        tot_in += meta.get("input_tokens") or 0
        tot_out += meta.get("output_tokens") or 0
        latencies.append(meta["latency_s"])
        print(f"  {case_id}: {sum(scores.values())}/{len(scores)} fields  ({meta['latency_s']}s)")

    acc = aggregate(per_case)
    print(f"\nPer-field accuracy over {len(cases)} val cases ({model}):")
    for field, v in acc.items():
        marker = "  " if field != "OVERALL" else "=>"
        print(f"  {marker} {field:32s} {v:6.1%}")

    if save and acc:
        now = datetime.now(timezone.utc)
        run_id = f"{now:%Y-%m-%d}_{_model_slug(model)}"
        RESULTS.mkdir(exist_ok=True)
        out = RESULTS / f"{run_id}.json"
        out.write_text(
            json.dumps(
                {
                    "run_id": run_id,
                    "model": model,
                    "timestamp": now.isoformat(timespec="seconds"),
                    "n_cases": len(cases),
                    "per_field": acc,
                    "per_case": case_rows,
                    "totals": {
                        "input_tokens": tot_in,
                        "output_tokens": tot_out,
                        "mean_latency_s": round(sum(latencies) / len(latencies), 2) if latencies else None,
                    },
                },
                indent=2,
            )
        )
        print(f"\nSaved -> {out}")
    return acc


def test_extraction_accuracy():
    """Guarded eval: skips unless keys + data are present."""
    import pytest

    if not os.getenv("RUN_LLM_EVALS"):
        pytest.skip("set RUN_LLM_EVALS=1 to run the LLM eval (burns API calls)")
    if not (os.getenv("ANTHROPIC_API_KEY") or os.getenv("OPENROUTER_API_KEY")):
        pytest.skip("no model API key set")
    if not _load_val():
        pytest.skip("no synthetic val data (run src.generate)")
    acc = run()
    # A floor, not a target - tighten as you improve prompts/few-shots.
    assert acc.get("OVERALL", 0) >= 0.5


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--save", action="store_true", help="write evals/results/<run_id>.json")
    args = ap.parse_args()
    run(save=args.save)
