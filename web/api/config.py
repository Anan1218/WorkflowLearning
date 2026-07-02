"""Dashboard configuration: model allowlist, thresholds, paths.

The allowlist is the live model-agnostic demo moment (dropdown = one-string swap)
AND the cost guard: the API rejects any model_id not listed here, so a browser
can never invoke an arbitrary/expensive model string.
"""

from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent

# Confidence below this routes a field to the human review queue.
REVIEW_THRESHOLD = 0.75

APP_STATE_DIR = REPO_ROOT / "data" / "app_state"
EVAL_RESULTS_DIR = REPO_ROOT / "evals" / "results"
FRONTEND_DIST = REPO_ROOT / "web" / "frontend" / "dist"

DEFAULT_MODEL_ID = "nemotron-free"  # free while the OpenRouter account has $0 credits

MODEL_ALLOWLIST: dict[str, dict] = {
    "nemotron-free": {
        "provider_string": "openrouter/nvidia/nemotron-3-super-120b-a12b:free",
        "label": "Nemotron 120B (free)",
        "cost": "free",
    },
    "deepseek-v3.1": {
        "provider_string": "openrouter/deepseek/deepseek-chat-v3.1",
        "label": "DeepSeek V3.1",
        "cost": "$",
    },
    "claude-sonnet": {
        "provider_string": "openrouter/anthropic/claude-sonnet-5",
        "label": "Claude Sonnet 5",
        "cost": "$$$",
    },
}
