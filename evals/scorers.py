"""Per-field accuracy scoring: extracted vs ground truth.

This is the linchpin. It is the metric you check before every change (new model,
new prompt, new few-shot examples), and it is the exact function a DSPy optimizer
would maximize in phase 2. Keep it readable and deterministic - no LLM-as-judge for
correctness (that measures judge agreement, not truth).
"""

from __future__ import annotations

import re

from src.schemas import SCORED_FIELDS, SuretySubmission

NUM_REL_TOL = 0.01  # numbers count as equal within 1%


def _norm_text(v) -> str | None:
    if v is None:
        return None
    return re.sub(r"\s+", " ", str(v)).strip().lower()


def _norm_fein(v) -> str | None:
    if v is None:
        return None
    digits = re.sub(r"\D", "", str(v))
    return digits or None


def _get(sub: SuretySubmission, path: str):
    """Resolve a scored-field path to a comparable value."""
    if path == "wip_total_contract_value":
        if not sub.wip_schedule:
            return None
        return sum(p.contract_amount for p in sub.wip_schedule)
    if path == "bond_type":
        return sub.bond_type.value
    if path == "principal.fein":
        return _norm_fein(sub.principal.fein)
    if path == "principal.name":
        return _norm_text(sub.principal.name)
    if path == "obligee.name":
        return _norm_text(sub.obligee.name) if sub.obligee else None
    # remaining are plain numeric top-level fields
    return getattr(sub, path, None)


def _equal(a, b) -> bool:
    if a is None and b is None:
        return True  # agreed absence
    if a is None or b is None:
        return False  # miss or hallucination
    if isinstance(a, (int, float)) and isinstance(b, (int, float)):
        if b == 0:
            return abs(a) < 1e-6
        return abs(a - b) / abs(b) <= NUM_REL_TOL
    return a == b


def score_case(predicted: SuretySubmission, truth: SuretySubmission) -> dict[str, bool]:
    """Return {scored_field: correct?} for one document."""
    return {f: _equal(_get(predicted, f), _get(truth, f)) for f in SCORED_FIELDS}


def score_metric(predicted: SuretySubmission, truth: SuretySubmission) -> float:
    """Single 0..1 accuracy for one case (the DSPy-compatible metric)."""
    results = score_case(predicted, truth)
    return sum(results.values()) / len(results)


def aggregate(per_case: list[dict[str, bool]]) -> dict[str, float]:
    """Field-level accuracy across all cases + an overall number."""
    if not per_case:
        return {}
    out: dict[str, float] = {}
    for field in SCORED_FIELDS:
        hits = sum(1 for c in per_case if c.get(field))
        out[field] = hits / len(per_case)
    out["OVERALL"] = sum(out[f] for f in SCORED_FIELDS) / len(SCORED_FIELDS)
    return out
