"""Review queue persistence: JSON-file backed (survives docker restart via volume).

This mock IS the audit-trail seed: every approve/override decision is recorded
with who/what/when. The production version is the same shape as Postgres rows.
"""

from __future__ import annotations

import time
import uuid

from api.config import APP_STATE_DIR
from api.lib.json_store import JsonStore

_store = JsonStore(APP_STATE_DIR / "review_queue.json")
if "items" not in _store.data:
    _store.data["items"] = {}


def enqueue(
    document_text: str,
    submission: dict,
    flagged_fields: list[dict],
    rationales: list[dict],
    model_id: str,
) -> str:
    item_id = uuid.uuid4().hex[:12]
    _store.data["items"][item_id] = {
        "id": item_id,
        "created_at": time.time(),
        "model_id": model_id,
        "status": "pending",
        "document_text": document_text,
        "submission": submission,
        "flagged_fields": flagged_fields,  # [{path, value, confidence}]
        "rationales": rationales,
        "decisions": {},  # path -> {action, override_value?, decided_at}
    }
    _store.save()
    return item_id


def list_items(status: str | None = None) -> list[dict]:
    items = sorted(_store.data["items"].values(), key=lambda i: i["created_at"], reverse=True)
    if status:
        items = [i for i in items if i["status"] == status]

    def _guideline_ids(item: dict) -> list[str]:
        ids: list[str] = []
        for rationale in item.get("rationales", []):
            guideline_id = rationale.get("guideline_id")
            if guideline_id and guideline_id not in ids:
                ids.append(guideline_id)
        return ids

    return [
        {
            "id": i["id"],
            "created_at": i["created_at"],
            "model_id": i["model_id"],
            "status": i["status"],
            "n_flagged": len(i["flagged_fields"]),
            "n_decided": len(i["decisions"]),
            "doc_preview": i["document_text"][:180],
            "principal": (i["submission"].get("principal") or {}).get("name"),
            "guideline_ids": _guideline_ids(i),
        }
        for i in items
    ]


def get_item(item_id: str) -> dict | None:
    return _store.data["items"].get(item_id)


def apply_decisions(item_id: str, decisions: list[dict]) -> dict | None:
    item = _store.data["items"].get(item_id)
    if not item:
        return None
    flagged_paths = {f["path"] for f in item["flagged_fields"]}
    for d in decisions:
        if d["path"] not in flagged_paths:
            continue
        item["decisions"][d["path"]] = {
            "action": d["action"],
            "override_value": d.get("override_value"),
            "decided_at": time.time(),
        }
    if flagged_paths and flagged_paths <= set(item["decisions"]):
        item["status"] = "resolved"
    _store.save()
    return item
