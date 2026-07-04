from __future__ import annotations

from fastapi import APIRouter

from core.guidelines import GUIDELINES

router = APIRouter(prefix="/api/guidelines", tags=["guidelines"])


@router.get("")
def list_guidelines() -> list[dict]:
    return [g.model_dump() for g in GUIDELINES]
