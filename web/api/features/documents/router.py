"""Documents slice: turn an uploaded file into text the extract slice can use."""

from __future__ import annotations

import io

from fastapi import APIRouter, HTTPException, UploadFile

router = APIRouter(prefix="/api/documents", tags=["documents"])

MAX_BYTES = 5 * 1024 * 1024


@router.post("")
async def upload_document(file: UploadFile) -> dict:
    raw = await file.read()
    if len(raw) > MAX_BYTES:
        raise HTTPException(413, "file too large (5 MB max)")

    name = (file.filename or "upload").lower()
    if name.endswith(".pdf"):
        try:
            from pypdf import PdfReader

            reader = PdfReader(io.BytesIO(raw))
            pages = [page.extract_text() or "" for page in reader.pages]
            text = "\n\n".join(pages).strip()
        except Exception:
            raise HTTPException(400, "could not parse PDF")
        if not text:
            raise HTTPException(
                400,
                "this PDF has no text layer (likely a scan) - scanned-document OCR "
                "is a roadmap item, not part of this demo",
            )
        return {"text": text, "filename": file.filename, "pages": len(pages)}

    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(400, "unsupported file type - upload .txt or a text-layer .pdf")
    return {"text": text, "filename": file.filename}
