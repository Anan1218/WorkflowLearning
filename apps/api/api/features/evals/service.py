"""Evals slice: read-only view over evals/results/*.json.

The dashboard never *runs* evals (that would burn API credits from a browser
click) - it renders artifacts the CLI harness saved via `--save`.
"""

from __future__ import annotations

import json

from api.config import EVAL_RESULTS_DIR


def list_runs() -> list[dict]:
    runs = []
    if EVAL_RESULTS_DIR.exists():
        for p in sorted(EVAL_RESULTS_DIR.glob("*.json"), reverse=True):
            data = json.loads(p.read_text())
            runs.append(
                {
                    "run_id": data["run_id"],
                    "model": data["model"],
                    "timestamp": data["timestamp"],
                    "n_cases": data["n_cases"],
                    "overall": data["per_field"].get("OVERALL"),
                }
            )
    return runs


def get_run(run_id: str) -> dict | None:
    path = EVAL_RESULTS_DIR / f"{run_id}.json"
    if not path.exists() or path.resolve().parent != EVAL_RESULTS_DIR.resolve():
        return None
    return json.loads(path.read_text())
