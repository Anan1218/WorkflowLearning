"""Stage 0: synthetic data generator.

Learning without RLI's data is not a blocker - it's an advantage. When the model
generates the document AND the exact structured answer together, you get labeled
(document, ground_truth) pairs. Ground truth is what makes everything downstream
measurable: the eval harness scores against it, and (phase 2) DSPy optimizes against it.

Run:  python -m src.generate --n 12
Writes:  data/synthetic/{train,val}/<id>.txt   (the messy document)
         data/synthetic/{train,val}/<id>.json  (the exact SuretySubmission)
"""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path

import instructor
from pydantic import BaseModel

from src.schemas import SuretySubmission
from src.trace import flush, setup_tracing, span

# Swap this one string to change model/provider (Instructor routes it).
# Cheaper for high volume: "anthropic/claude-sonnet-5" or "anthropic/claude-haiku-4-5".
MODEL = os.getenv("MODEL", "openrouter/deepseek/deepseek-chat-v3.1")

DATA = Path(__file__).resolve().parent.parent / "data" / "synthetic"


class GeneratedCase(BaseModel):
    """A realistic messy submission plus the exact structured truth behind it."""

    document_text: str  # broker email + a WIP schedule + financials, as messy prose/tables
    ground_truth: SuretySubmission


PROMPT = """You are generating synthetic training data for a surety-bond submission
extraction system. Invent ONE realistic contract-surety submission for a small/mid
US construction contractor.

Produce two things that MUST agree exactly:
1. document_text: a realistic, slightly messy broker submission - an email from a
   surety agent plus an inline Work-in-Progress (WIP) schedule (2-4 projects) and a
   few financial lines (working capital, net worth). Use real-world sloppiness:
   inconsistent number formatting ($1,250,000 vs 1.25M), abbreviations, a typo or two.
2. ground_truth: the exact structured SuretySubmission that a perfect underwriter
   would extract from that document_text. Every value in ground_truth must be
   present in / derivable from document_text. Set field_confidences to 1.0 for
   values stated plainly and lower for anything you made ambiguous on purpose.

Vary bond types, sizes, and which fields are missing across generations."""


def generate_one(client: instructor.Instructor) -> GeneratedCase:
    with span("generate.case", model=MODEL):
        return client.chat.completions.create(
            response_model=GeneratedCase,
            max_tokens=4096,
            max_retries=2,
            messages=[{"role": "user", "content": PROMPT}],
        )


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--n", type=int, default=12, help="total cases to generate")
    ap.add_argument("--val-frac", type=float, default=0.34, help="fraction held out for val")
    args = ap.parse_args()

    setup_tracing()
    client = instructor.from_provider(MODEL)

    n_val = max(1, round(args.n * args.val_frac))
    for i in range(args.n):
        split = "val" if i < n_val else "train"
        out = DATA / split
        out.mkdir(parents=True, exist_ok=True)

        case = generate_one(client)
        cid = f"{i:03d}"
        (out / f"{cid}.txt").write_text(case.document_text)
        (out / f"{cid}.json").write_text(case.ground_truth.model_dump_json(indent=2))
        print(f"  [{split}] {cid}  {case.ground_truth.principal.name}  ({case.ground_truth.bond_type.value})")

    flush()
    print(f"\nDone. {args.n} cases -> {DATA} ({n_val} val / {args.n - n_val} train)")


if __name__ == "__main__":
    main()
