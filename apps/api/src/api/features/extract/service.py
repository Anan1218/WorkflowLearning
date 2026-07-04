"""Extract slice: run the core pipeline for the dashboard.

Wraps core.extract.extract() in a background job, then post-processes:
- low-confidence fields (below REVIEW_THRESHOLD, or unreported) -> flagged
- flagged fields auto-enqueue a review-queue item (the HITL gate, live)
- sample docs with ground truth get scored via evals.scorers.score_case
"""

from __future__ import annotations

from evals.scorers import score_case
from core.classify import classify_with_meta
from core.extract import extract_with_meta
from core.guidelines import evaluate_guidelines
from core.schemas import SCORED_FIELDS, SuretySubmission
from api.config import MODEL_ALLOWLIST, REVIEW_THRESHOLD
from api.features.review import store as review_store
from api.features.samples import service as samples
from api.lib.jobs import JobStore

jobs = JobStore(max_workers=2)


def _field_value(sub: SuretySubmission, path: str):
    obj: object = sub
    for part in path.split("."):
        if obj is None:
            return None
        obj = getattr(obj, part, None)
    return obj


def _low_confidence_fields(sub: SuretySubmission) -> list[dict]:
    flagged = []
    for path, conf in sub.field_confidences.items():
        if conf < REVIEW_THRESHOLD:
            flagged.append({"path": path, "value": _field_value(sub, path), "confidence": conf})
    # Scored fields the model populated but never assigned a confidence: unreported.
    # Models often report a parent key ("principal") instead of the dotted leaf
    # ("principal.name") - treat any ancestor key as covering its children.
    def _covered(path: str) -> bool:
        parts = path.split(".")
        return any(".".join(parts[: i + 1]) in sub.field_confidences for i in range(len(parts)))

    for path in SCORED_FIELDS:
        if path == "wip_total_contract_value":
            continue
        value = _field_value(sub, path)
        if value is not None and not _covered(path):
            flagged.append({"path": path, "value": value, "confidence": None})
    return flagged


def submit_extraction(text: str, model_id: str, sample_id: str | None = None):
    model_cfg = MODEL_ALLOWLIST[model_id]
    provider_string = model_cfg["provider_string"]

    def _work() -> dict:
        classification = None
        classify_meta = None
        try:
            classification, classify_meta = classify_with_meta(text, model=provider_string)
        except Exception:
            pass

        sub, meta = extract_with_meta(text, model=provider_string)
        flagged = _low_confidence_fields(sub)
        rationales = evaluate_guidelines(sub, flagged, REVIEW_THRESHOLD)
        serialized_rationales = [r.model_dump() for r in rationales]

        steps = []
        if classify_meta:
            steps.append({"step": "classify", **classify_meta})
        steps.append({"step": "extract", **meta})

        def _sum_present(key: str):
            values = [step.get(key) for step in steps if step.get(key) is not None]
            return sum(values) if values else None

        agg_in = _sum_present("input_tokens")
        agg_out = _sum_present("output_tokens")
        agg_latency = _sum_present("latency_s")
        est_cost = None
        if agg_in is not None and agg_out is not None:
            est_cost = round(
                agg_in / 1e6 * model_cfg["usd_per_m_in"]
                + agg_out / 1e6 * model_cfg["usd_per_m_out"],
                6,
            )
        usage = {
            "steps": steps,
            "input_tokens": agg_in,
            "output_tokens": agg_out,
            "latency_s": agg_latency,
            "est_cost_usd": est_cost,
        }

        review_item_id = None
        if flagged:
            review_item_id = review_store.enqueue(
                document_text=text,
                submission=sub.model_dump(),
                flagged_fields=flagged,
                rationales=serialized_rationales,
                model_id=model_id,
            )

        score = None
        if sample_id:
            truth = samples.get_ground_truth(sample_id)
            if truth:
                fields = score_case(sub, truth)
                score = {"fields": fields, "accuracy": sum(fields.values()) / len(fields)}

        return {
            "classification": classification.model_dump() if classification else None,
            "submission": sub.model_dump(),
            "low_confidence_fields": flagged,
            "rationales": serialized_rationales,
            "review_item_id": review_item_id,
            "score": score,
            "usage": usage,
        }

    return jobs.submit(_work, model_id=model_id)
