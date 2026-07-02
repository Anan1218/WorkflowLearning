"""Stage 1: the extractor (the backbone).

Instructor + Pydantic: send the document, force the output into SuretySubmission,
and let Instructor re-ask the model when validation fails. Model-agnostic - the
`MODEL` string is the only thing that changes to swap providers.

This is deliberately NOT a framework. It's a function you own end to end, which is
the point for a 2-person team maintaining it and for the "you own your stack" pitch.

Run:  python -m src.extract data/synthetic/val/000.txt
"""

from __future__ import annotations

import sys
from pathlib import Path

import instructor

from src.schemas import SuretySubmission
from src.trace import flush, setup_tracing, span

# One string = the model swap (Instructor routes via LiteLLM-style provider prefixes).
# Try "openai/gpt-5.1" or "anthropic/claude-haiku-4-5" and re-run evals to compare.
MODEL = "anthropic/claude-opus-4-8"

SYSTEM = """You extract structured data from surety-bond submissions for underwriting.
Extract only what is present in the document. Do not invent values - if a field is
absent, leave it null. For every field you populate, record a confidence in
field_confidences: 1.0 when the value is stated plainly, lower when you inferred or
guessed. Sum WIP contract amounts accurately. Flag anything ambiguous in `notes`."""


def extract(document_text: str, client: instructor.Instructor | None = None) -> SuretySubmission:
    """Document text -> validated SuretySubmission."""
    client = client or instructor.from_provider(MODEL)
    with span("extract.submission", model=MODEL, doc_chars=len(document_text)):
        return client.chat.completions.create(
            response_model=SuretySubmission,
            max_tokens=4096,
            max_retries=2,
            messages=[
                {"role": "system", "content": SYSTEM},
                {"role": "user", "content": document_text},
            ],
        )


def main() -> None:
    if len(sys.argv) < 2:
        print("usage: python -m src.extract <document.txt>")
        raise SystemExit(1)

    setup_tracing()
    doc = Path(sys.argv[1]).read_text()
    result = extract(doc)
    print(result.model_dump_json(indent=2))

    low = {k: v for k, v in result.field_confidences.items() if v < 0.75}
    if low:
        print("\nWould route to human review (confidence < 0.75):")
        for k, v in sorted(low.items()):
            print(f"  {k}: {v:.2f}")
    flush()


if __name__ == "__main__":
    main()
