"""Stage 0: classify the incoming document before extraction."""

from __future__ import annotations

import os
from typing import Literal

import instructor
from pydantic import BaseModel, Field

from core.trace import span

# One string = the model swap (Instructor routes via LiteLLM-style provider prefixes).
# Override per run without editing code: MODEL="anthropic/claude-sonnet-5" python -m evals.harness
# Default is deliberately cheap (~$0.3/M input); frontier models are the override, not the default.
MODEL = os.getenv("MODEL", "openrouter/deepseek/deepseek-chat-v3.1")

SYSTEM = "You are the intake triage step of a surety underwriting pipeline. Classify the document; do not extract field values."


class SubmissionClassification(BaseModel):
    doc_type: Literal["broker_email", "acord_form", "wip_schedule", "financial_statement", "other"]
    surety_line: Literal["contract", "commercial", "unknown"]
    summary: str = Field(description="one sentence, plain language, what this document is and what it asks for")
    confidence: float = Field(ge=0, le=1)


def classify_with_meta(
    text: str,
    model: str | None = None,
) -> tuple[SubmissionClassification, dict]:
    """Classify document text and return usage metadata."""
    import time

    model = model or MODEL
    client = instructor.from_provider(model)
    with span("classify.submission", model=model, doc_chars=len(text)):
        start = time.monotonic()
        classification, completion = client.chat.completions.create_with_completion(
            response_model=SubmissionClassification,
            max_tokens=4096,
            max_retries=1,
            messages=[
                {"role": "system", "content": SYSTEM},
                {"role": "user", "content": text},
            ],
        )
        latency = time.monotonic() - start

    usage = getattr(completion, "usage", None)
    meta = {
        "input_tokens": getattr(usage, "prompt_tokens", None) or getattr(usage, "input_tokens", None),
        "output_tokens": getattr(usage, "completion_tokens", None) or getattr(usage, "output_tokens", None),
        "latency_s": round(latency, 2),
    }
    return classification, meta
