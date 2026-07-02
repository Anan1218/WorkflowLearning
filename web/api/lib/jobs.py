"""In-memory background job runner.

Extractions take 10-60s (an LLM call, possibly retried), so POST /api/extract
returns a job_id immediately and the UI polls. Demo-grade on purpose: jobs live
in a dict and die with the process - the durable version of this is the Postgres
status state machine described in LESSONS.md, not more code here.
"""

from __future__ import annotations

import threading
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from typing import Any, Callable


@dataclass
class Job:
    id: str
    status: str = "queued"  # queued | running | succeeded | failed
    model_id: str = ""
    created_at: float = field(default_factory=time.time)
    started_at: float | None = None
    finished_at: float | None = None
    result: Any = None
    error: dict | None = None

    @property
    def elapsed_s(self) -> float:
        start = self.started_at or self.created_at
        end = self.finished_at or time.time()
        return round(end - start, 1)


class JobStore:
    def __init__(self, max_workers: int = 2):
        self._jobs: dict[str, Job] = {}
        self._lock = threading.Lock()
        self._pool = ThreadPoolExecutor(max_workers=max_workers)

    def submit(self, fn: Callable[[], Any], model_id: str) -> Job:
        job = Job(id=uuid.uuid4().hex[:12], model_id=model_id)
        with self._lock:
            self._jobs[job.id] = job

        def _run() -> None:
            job.status = "running"
            job.started_at = time.time()
            try:
                job.result = fn()
                job.status = "succeeded"
            except Exception as exc:  # classified by the caller's error_classifier
                job.error = classify_error(exc)
                job.status = "failed"
            finally:
                job.finished_at = time.time()

        self._pool.submit(_run)
        return job

    def get(self, job_id: str) -> Job | None:
        return self._jobs.get(job_id)


def classify_error(exc: Exception) -> dict:
    """Map provider exceptions to UI-friendly error kinds."""
    msg = str(exc)
    if "429" in msg or "rate-limit" in msg.lower() or "rate limit" in msg.lower():
        kind = "rate_limited"
        message = "Model rate-limited (free models share capacity). Retry, or switch model."
    elif "402" in msg:
        kind = "provider_error"
        message = "Insufficient OpenRouter credits for this model. Pick the free model or top up."
    elif "max_tokens" in msg.lower() or "length limit" in msg.lower():
        kind = "provider_error"
        message = "Model ran out of output tokens before finishing. Retry, or switch model."
    elif "validation" in msg.lower():
        kind = "validation_failed"
        message = "Model output failed schema validation after retries."
    else:
        kind = "provider_error"
        message = "Extraction failed. Retry, or switch model."
    return {"kind": kind, "message": message, "detail": msg[:500]}
