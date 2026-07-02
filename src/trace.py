"""Observability seam: OpenTelemetry -> Langfuse.

Everything the pipeline does (generate, extract) runs inside a span, so in
Langfuse you see the prompt, the model, tokens, cost, latency, and the typed
output for every call.

Why OTel and not the Langfuse SDK directly: OTel is the vendor-neutral standard,
so the *backend* is a config choice, not a rewrite. This file points at Langfuse
Cloud via env vars. For a real RLI/PII deployment you self-host Langfuse and
change LANGFUSE_HOST - no code change. That portability is the whole point.

Degrades gracefully: if Langfuse keys are absent, tracing is a no-op and the
scripts still run, so you can learn the extraction path before wiring observability.
"""

from __future__ import annotations

import base64
import contextlib
import os

from dotenv import load_dotenv

load_dotenv()

_ENABLED = False


def setup_tracing() -> bool:
    """Wire OTel -> Langfuse if keys are present. Returns True if enabled."""
    global _ENABLED
    if _ENABLED:
        return True

    public = os.getenv("LANGFUSE_PUBLIC_KEY")
    secret = os.getenv("LANGFUSE_SECRET_KEY")
    host = os.getenv("LANGFUSE_HOST", "https://us.cloud.langfuse.com")
    if not (public and secret):
        return False

    try:
        from opentelemetry import trace
        from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
        from opentelemetry.sdk.resources import Resource
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor
    except ImportError:
        print("[trace] opentelemetry not installed; tracing disabled")
        return False

    auth = base64.b64encode(f"{public}:{secret}".encode()).decode()
    exporter = OTLPSpanExporter(
        endpoint=f"{host.rstrip('/')}/api/public/otel/v1/traces",
        headers={"Authorization": f"Basic {auth}"},
    )
    provider = TracerProvider(resource=Resource.create({"service.name": "workflow-learning"}))
    provider.add_span_processor(BatchSpanProcessor(exporter))
    trace.set_tracer_provider(provider)

    # Auto-capture Anthropic calls (Instructor calls Anthropic under the hood).
    with contextlib.suppress(ImportError):
        from openinference.instrumentation.anthropic import AnthropicInstrumentor

        AnthropicInstrumentor().instrument()

    _ENABLED = True
    print(f"[trace] OTel -> Langfuse enabled ({host})")
    return True


@contextlib.contextmanager
def span(name: str, **attributes):
    """Manual span for steps you want to see explicitly (generate/extract)."""
    if not _ENABLED:
        yield
        return
    from opentelemetry import trace

    tracer = trace.get_tracer("workflow-learning")
    with tracer.start_as_current_span(name) as s:
        for k, v in attributes.items():
            s.set_attribute(k, v)
        yield s


def flush() -> None:
    """Force-export pending spans (call at the end of a short-lived script)."""
    if not _ENABLED:
        return
    from opentelemetry import trace

    provider = trace.get_tracer_provider()
    if hasattr(provider, "force_flush"):
        provider.force_flush()
