from __future__ import annotations

import base64
import binascii
import logging
import uuid
from pathlib import Path
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.attachment import Attachment

logger = logging.getLogger(__name__)

_MAGIC = {
    b"\x89PNG\r\n\x1a\n": ("image/png", "png"),
    b"\xff\xd8\xff": ("image/jpeg", "jpg"),
    b"GIF87a": ("image/gif", "gif"),
    b"GIF89a": ("image/gif", "gif"),
}


def _sniff(data: bytes) -> tuple[str, str] | None:
    for sig, out in _MAGIC.items():
        if data.startswith(sig):
            return out
    if len(data) >= 12 and data[0:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp", "webp"
    return None


def _probe_dimensions(data: bytes) -> tuple[int | None, int | None]:
    try:
        from io import BytesIO

        from PIL import Image

        with Image.open(BytesIO(data)) as img:
            return img.width, img.height
    except Exception:
        return None, None


async def create_attachment(
    db: AsyncSession,
    *,
    b64: str,
    declared_media_type: str | None,
    session_id: str | None,
) -> Attachment:
    try:
        raw = base64.b64decode(b64, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise ValueError(f"Invalid base64 payload: {exc}") from exc

    if len(raw) > settings.max_attachment_bytes:
        raise ValueError(
            f"Attachment too large: {len(raw)} bytes (limit {settings.max_attachment_bytes})"
        )

    sniffed = _sniff(raw)
    if sniffed is None:
        raise ValueError("Unsupported image format (expected PNG/JPEG/WEBP/GIF)")

    media_type, ext = sniffed
    if declared_media_type and declared_media_type != media_type:
        logger.info("Declared media_type=%s overridden by sniff=%s", declared_media_type, media_type)

    width, height = _probe_dimensions(raw)

    attachment_id = str(uuid.uuid4())
    subdir = settings.attachments_dir / (session_id or "_unbound")
    subdir.mkdir(parents=True, exist_ok=True)
    file_path = subdir / f"{attachment_id}.{ext}"
    file_path.write_bytes(raw)

    row = Attachment(
        id=attachment_id,
        session_id=session_id,
        media_type=media_type,
        file_path=str(file_path),
        size_bytes=len(raw),
        width=width,
        height=height,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row


async def get_attachment(db: AsyncSession, attachment_id: str) -> Attachment | None:
    result = await db.execute(select(Attachment).where(Attachment.id == attachment_id))
    return result.scalar_one_or_none()


async def load_image_inputs(
    db: AsyncSession, attachment_ids: list[str]
) -> list[dict[str, Any]]:
    if not attachment_ids:
        return []
    result = await db.execute(select(Attachment).where(Attachment.id.in_(attachment_ids)))
    rows = {r.id: r for r in result.scalars().all()}
    out: list[dict[str, Any]] = []
    for aid in attachment_ids:
        row = rows.get(aid)
        if not row:
            logger.warning("Attachment %s not found", aid)
            continue
        path = Path(row.file_path)
        if not path.exists():
            logger.warning("Attachment file missing on disk: %s", path)
            continue
        out.append({
            "media_type": row.media_type,
            "data": base64.b64encode(path.read_bytes()).decode("ascii"),
        })
    return out


def url_for(attachment_id: str) -> str:
    return f"/api/attachments/{attachment_id}/file"
