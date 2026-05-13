from __future__ import annotations

from pydantic import BaseModel


class AttachmentUpload(BaseModel):
    media_type: str
    data: str
    session_id: str | None = None
    filename: str | None = None


class AttachmentResponse(BaseModel):
    id: str
    media_type: str
    size_bytes: int
    width: int | None = None
    height: int | None = None
    url: str
    session_id: str | None = None
    created_at: str | None = None
