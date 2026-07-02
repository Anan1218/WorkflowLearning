"""Run the extractor over the val set and print per-field accuracy.

Two ways to run it:
  python -m evals.harness            # prints the accuracy table
  pytest evals/                      # same, as a test (skips if no keys/data)

The pytest test is guarded so it never burns API calls unintentionally: it skips
unless ANTHROPIC_API_KEY is set and val cases exist.
"""

from __future__ import annotations

import os
from pathlib import Path

from src.extract import extract
from src.schemas import SuretySubmission
from evals.scorers import aggregate, score_case

# Committed hand-labeled examples ship with the repo; generated val augments them.
CASES = Path(__file__).resolve().parent / "cases"
VAL = Path(__file__).resolve().parent.parent / "data" / "synthetic" / "val"


def _load_dir(d: Path) -> list[tuple[str, SuretySubmission]]:
    cases = []
    if not d.exists():
        return cases
    for txt in sorted(d.glob("*.txt")):
        gt = txt.with_suffix(".json")
        if gt.exists():
            cases.append((txt.read_text(), SuretySubmission.model_validate_json(gt.read_text())))
    return cases


def _load_val() -> list[tuple[str, SuretySubmission]]:
    return _load_dir(CASES) + _load_dir(VAL)


def run() -> dict[str, float]:
    cases = _load_val()
    if not cases:
        print("No val cases found. Run: python -m src.generate --n 12")
        return {}

    per_case = []
    for i, (doc, truth) in enumerate(cases):
        pred = extract(doc)
        per_case.append(score_case(pred, truth))
        print(f"  case {i:03d}: {sum(per_case[-1].values())}/{len(per_case[-1])} fields")

    acc = aggregate(per_case)
    print(f"\nPer-field accuracy over {len(cases)} val cases:")
    for field, v in acc.items():
        marker = "  " if field != "OVERALL" else "=>"
        print(f"  {marker} {field:32s} {v:6.1%}")
    return acc


def test_extraction_accuracy():
    """Guarded eval: skips unless keys + data are present."""
    import pytest

    if not os.getenv("ANTHROPIC_API_KEY"):
        pytest.skip("ANTHROPIC_API_KEY not set")
    if not _load_val():
        pytest.skip("no synthetic val data (run src.generate)")
    acc = run()
    # A floor, not a target - tighten as you improve prompts/few-shots.
    assert acc.get("OVERALL", 0) >= 0.5


if __name__ == "__main__":
    run()
