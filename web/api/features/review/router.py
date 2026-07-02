from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from web.api.features.review import store

router = APIRouter(prefix="/api/review", tags=["review"])


class Decision(BaseModel):
    path: str
    action: Literal["approve", "override"]
    override_value: str | float | None = None


class DecisionRequest(BaseModel):
    decisions: list[Decision]


@router.get("")
def list_items(status: Literal["pending", "resolved"] | None = None) -> list[dict]:
    return store.list_items(status)


@router.get("/{item_id}")
def get_item(item_id: str) -> dict:
    item = store.get_item(item_id)
    if not item:
        raise HTTPException(404, f"unknown review item: {item_id}")
    return item


@router.post("/{item_id}/decision")
def decide(item_id: str, body: DecisionRequest) -> dict:
    item = store.apply_decisions(item_id, [d.model_dump() for d in body.decisions])
    if not item:
        raise HTTPException(404, f"unknown review item: {item_id}")
    return item
