from __future__ import annotations

import logging
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.schemas.attachment import AttachmentResponse, AttachmentUpload
from app.services import image_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/attachments", tags=["attachments"])


def _to_response(row, include_url: bool = True) -> AttachmentResponse:
    return AttachmentResponse(
        id=row.id,
        media_type=row.media_type,
        size_bytes=row.size_bytes,
        width=row.width,
        height=row.height,
        url=image_service.url_for(row.id) if include_url else "",
        session_id=row.session_id,
        created_at=row.created_at.isoformat() if row.created_at else None,
    )


@router.post("", response_model=AttachmentResponse, status_code=201)
async def upload(payload: AttachmentUpload, db: AsyncSession = Depends(get_db)):
    try:
        row = await image_service.create_attachment(
            db,
            b64=payload.data,
            declared_media_type=payload.media_type,
            session_id=payload.session_id,
        )
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    return _to_response(row)


@router.get("/{attachment_id}", response_model=AttachmentResponse)
async def get_meta(attachment_id: str, db: AsyncSession = Depends(get_db)):
    row = await image_service.get_attachment(db, attachment_id)
    if not row:
        raise HTTPException(404, "Attachment not found")
    return _to_response(row)


@router.get("/{attachment_id}/file")
async def get_file(attachment_id: str, db: AsyncSession = Depends(get_db)):
    row = await image_service.get_attachment(db, attachment_id)
    if not row:
        raise HTTPException(404, "Attachment not found")
    path = Path(row.file_path)
    if not path.exists():
        raise HTTPException(410, "Attachment file missing on disk")
    return FileResponse(path, media_type=row.media_type)
