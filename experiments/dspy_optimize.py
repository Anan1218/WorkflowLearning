"""PHASE 2 (optional, offline): use DSPy to DISCOVER better prompts/few-shots.

Deliberately not part of the runtime. Deep research showed DSPy's optimizers deliver
real gains, but DSPy-optimized prompts are coupled to DSPy's runtime and don't port
out cleanly - so standardizing the whole pipeline on DSPy is the biggest risk for a
small team. The low-regret use: run DSPy here, offline, against the labeled train set
to find better instructions and few-shot examples, then HAND-PORT the learnings into
the Instructor prompt in src/extract.py, re-scoring with evals/ each time.

The metric is the SAME evals/scorers.score_metric the runtime uses, so "better here"
means "better on the thing we actually measure."

Install first:  pip install dspy>=2.5
Run:            python -m experiments.dspy_optimize
"""

from __future__ import annotations

import json
from pathlib import Path

try:
    import dspy
except ImportError:  # keep the repo runnable without the phase-2 dep
    raise SystemExit("DSPy not installed. This is optional phase-2: pip install dspy")

from core.schemas import SuretySubmission
from evals.scorers import score_metric

TRAIN = Path(__file__).resolve().parent.parent / "data" / "synthetic" / "train"
MODEL = "anthropic/claude-opus-4-8"


class ExtractSurety(dspy.Signature):
    """Extract structured surety-submission data from a raw document."""

    document: str = dspy.InputField()
    submission: SuretySubmission = dspy.OutputField()


def _metric(example, pred, trace=None) -> float:
    try:
        return score_metric(pred.submission, example.submission)
    except Exception:
        return 0.0


def _load_train() -> list[dspy.Example]:
    examples = []
    for txt in sorted(TRAIN.glob("*.txt")):
        gt = txt.with_suffix(".json")
        if gt.exists():
            truth = SuretySubmission.model_validate_json(gt.read_text())
            examples.append(
                dspy.Example(document=txt.read_text(), submission=truth).with_inputs("document")
            )
    return examples


def main() -> None:
    dspy.configure(lm=dspy.LM(MODEL, max_tokens=4096))
    train = _load_train()
    if not train:
        raise SystemExit("No train data. Run: python -m src.generate --n 12")

    program = dspy.ChainOfThought(ExtractSurety)

    # BootstrapFewShot is the cheapest optimizer to start with; graduate to MIPROv2.
    optimizer = dspy.BootstrapFewShotWithRandomSearch(metric=_metric, max_bootstrapped_demos=4)
    compiled = optimizer.compile(program, trainset=train)

    # Inspect what it found, then hand-port the useful instructions/demos into
    # src/extract.py's SYSTEM prompt. Do NOT depend on this compiled artifact at runtime.
    print("\n=== Optimized program (port the learnings into src/extract.py by hand) ===")
    print(json.dumps(compiled.dump_state(), indent=2, default=str)[:4000])


if __name__ == "__main__":
    main()
