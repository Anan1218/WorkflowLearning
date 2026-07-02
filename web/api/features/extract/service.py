"""Extract slice: run the core pipeline for the dashboard.

Wraps src.extract.extract() in a background job, then post-processes:
- low-confidence fields (below REVIEW_THRESHOLD, or unreported) -> flagged
- flagged fields auto-enqueue a review-queue item (the HITL gate, live)
- sample docs with ground truth get scored via evals.scorers.score_case
"""

from __future__ import annotations

from evals.scorers import score_case
from src.extract import extract
from src.schemas import SCORED_FIELDS, SuretySubmission
from web.api.config import MODEL_ALLOWLIST, REVIEW_THRESHOLD
from web.api.features.review import store as review_store
from web.api.features.samples import service as samples
from web.api.lib.jobs import JobStore

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
    provider_string = MODEL_ALLOWLIST[model_id]["provider_string"]

    def _work() -> dict:
        sub = extract(text, model=provider_string)
        flagged = _low_confidence_fields(sub)

        review_item_id = None
        if flagged:
            review_item_id = review_store.enqueue(
                document_text=text,
                submission=sub.model_dump(),
                flagged_fields=flagged,
                model_id=model_id,
            )

        score = None
        if sample_id:
            truth = samples.get_ground_truth(sample_id)
            if truth:
                fields = score_case(sub, truth)
                score = {"fields": fields, "accuracy": sum(fields.values()) / len(fields)}

        return {
            "submission": sub.model_dump(),
            "low_confidence_fields": flagged,
            "review_item_id": review_item_id,
            "score": score,
        }

    return jobs.submit(_work, model_id=model_id)
