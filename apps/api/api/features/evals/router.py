from __future__ import annotations

from fastapi import APIRouter, HTTPException

from api.features.evals import service

router = APIRouter(prefix="/api/evals", tags=["evals"])


@router.get("")
def list_runs() -> list[dict]:
    return service.list_runs()


@router.get("/{run_id}")
def get_run(run_id: str) -> dict:
    run = service.get_run(run_id)
    if not run:
        raise HTTPException(404, f"unknown eval run: {run_id}")
    return run
