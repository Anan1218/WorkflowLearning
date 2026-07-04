"""Stage 1: the extractor (the backbone).

Instructor + Pydantic: send the document, force the output into SuretySubmission,
and let Instructor re-ask the model when validation fails. Model-agnostic - the
`MODEL` string is the only thing that changes to swap providers.

This is deliberately NOT a framework. It's a function you own end to end, which is
the point for a 2-person team maintaining it and for the "you own your stack" pitch.

Run:  python -m core.extract data/synthetic/val/000.txt
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

import instructor

from core.schemas import SuretySubmission
from core.trace import flush, setup_tracing, span

# One string = the model swap (Instructor routes via LiteLLM-style provider prefixes).
# Override per run without editing code: MODEL="anthropic/claude-sonnet-5" python -m evals.harness
# Default is deliberately cheap (~$0.3/M input); frontier models are the override, not the default.
MODEL = os.getenv("MODEL", "openrouter/deepseek/deepseek-chat-v3.1")

SYSTEM = """You extract structured data from surety-bond submissions for underwriting.
Extract only what is present in the document. Do not invent values - if a field is
absent, leave it null. For every field you populate, record a confidence in
field_confidences: 1.0 when the value is stated plainly, lower when you inferred or
guessed. Sum WIP contract amounts accurately. Flag anything ambiguous in `notes`."""


def extract(
    document_text: str,
    client: instructor.Instructor | None = None,
    model: str | None = None,
) -> SuretySubmission:
    """Document text -> validated SuretySubmission."""
    submission, _meta = extract_with_meta(document_text, client=client, model=model)
    return submission


def extract_with_meta(
    document_text: str,
    client: instructor.Instructor | None = None,
    model: str | None = None,
) -> tuple[SuretySubmission, dict]:
    """Like extract(), but also returns {"input_tokens", "output_tokens", "latency_s"}.

    Cost-per-query is a first-class metric (it's what buyers ask about), so the
    seam that talks to the model is where usage gets captured.
    """
    import time

    model = model or MODEL
    client = client or instructor.from_provider(model)
    with span("extract.submission", model=model, doc_chars=len(document_text)):
        start = time.monotonic()
        submission, completion = client.chat.completions.create_with_completion(
            response_model=SuretySubmission,
            max_tokens=4096,
            max_retries=2,
            messages=[
                {"role": "system", "content": SYSTEM},
                {"role": "user", "content": document_text},
            ],
        )
        latency = time.monotonic() - start

    usage = getattr(completion, "usage", None)
    meta = {
        "input_tokens": getattr(usage, "prompt_tokens", None) or getattr(usage, "input_tokens", None),
        "output_tokens": getattr(usage, "completion_tokens", None) or getattr(usage, "output_tokens", None),
        "latency_s": round(latency, 2),
    }
    return submission, meta


def main() -> None:
    if len(sys.argv) < 2:
        print("usage: python -m core.extract <document.txt>")
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
