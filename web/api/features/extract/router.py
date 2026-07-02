from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, model_validator

from web.api.config import DEFAULT_MODEL_ID, MODEL_ALLOWLIST
from web.api.features.extract import service
from web.api.features.samples import service as samples

router = APIRouter(prefix="/api", tags=["extract"])


class ExtractRequest(BaseModel):
    text: str | None = None
    sample_id: str | None = None
    model_id: str = DEFAULT_MODEL_ID

    @model_validator(mode="after")
    def _exactly_one_source(self):
        if bool(self.text) == bool(self.sample_id):
            raise ValueError("provide exactly one of: text, sample_id")
        return self


@router.get("/models")
def list_models() -> list[dict]:
    return [
        {"id": mid, "label": m["label"], "cost": m["cost"], "default": mid == DEFAULT_MODEL_ID}
        for mid, m in MODEL_ALLOWLIST.items()
    ]


@router.post("/extract", status_code=202)
def start_extraction(body: ExtractRequest) -> dict:
    if body.model_id not in MODEL_ALLOWLIST:
        raise HTTPException(422, f"model_id not in allowlist: {body.model_id}")

    text = body.text
    if body.sample_id:
        sample = samples.get_sample(body.sample_id)
        if not sample:
            raise HTTPException(404, f"unknown sample: {body.sample_id}")
        text = sample["text"]

    job = service.submit_extraction(text, body.model_id, sample_id=body.sample_id)
    return {"job_id": job.id}


@router.get("/jobs/{job_id}")
def get_job(job_id: str) -> dict:
    job = service.jobs.get(job_id)
    if not job:
        raise HTTPException(404, f"unknown job: {job_id}")
    return {
        "id": job.id,
        "status": job.status,
        "model_id": job.model_id,
        "elapsed_s": job.elapsed_s,
        "result": job.result,
        "error": job.error,
    }
