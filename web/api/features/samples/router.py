from __future__ import annotations

from fastapi import APIRouter, HTTPException

from web.api.features.samples import service

router = APIRouter(prefix="/api/samples", tags=["samples"])


@router.get("")
def list_samples() -> list[dict]:
    return service.list_samples()


@router.get("/{sample_id:path}")
def get_sample(sample_id: str) -> dict:
    sample = service.get_sample(sample_id)
    if not sample:
        raise HTTPException(404, f"unknown sample: {sample_id}")
    return sample
