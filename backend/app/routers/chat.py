from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import AsyncSessionLocal, get_db
from app.models.message import Message
from app.models.session import ChatSession
from app.schemas.session import ChatRequest
from app.services import image_service, tool_service
from app.services.agent_service import format_sse, stream_chat_events
from app.services.session_manager import session_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["chat"])


async def _next_seq(db: AsyncSession, session_id: str) -> int:
    current = await db.execute(
        select(func.max(Message.seq)).where(Message.session_id == session_id)
    )
    return (current.scalar() or 0) + 1


async def _persist_message(
    session_id: str,
    role: str,
    content: str,
    tool_events: list[dict[str, Any]] | None = None,
    attachment_ids: list[str] | None = None,
) -> None:
    async with AsyncSessionLocal() as db:
        seq = await _next_seq(db, session_id)
        msg = Message(
            session_id=session_id,
            role=role,
            content=content,
            tool_events=tool_events or [],
            attachment_ids=attachment_ids or [],
            seq=seq,
        )
        db.add(msg)
        await db.commit()


async def _maybe_update_title(session_id: str, user_text: str) -> None:
    async with AsyncSessionLocal() as db:
        row = (
            await db.execute(select(ChatSession).where(ChatSession.id == session_id))
        ).scalar_one_or_none()
        if not row or row.title not in ("New chat", "", None):
            return
        first_line = next((line.strip() for line in user_text.splitlines() if line.strip()), "")
        if not first_line:
            return
        row.title = first_line[:40] + ("..." if len(first_line) > 40 else "")
        await db.commit()


@router.post("/stream")
async def chat_stream(payload: ChatRequest, db: AsyncSession = Depends(get_db)):
    row = (
        await db.execute(select(ChatSession).where(ChatSession.id == payload.session_id))
    ).scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Session not found")

    from app.core.ga_integration import current_mykeys

    if not current_mykeys():
        raise HTTPException(
            400,
            "No active providers configured. Add one in Settings first.",
        )

    session = await session_manager.get_or_create(payload.session_id, llm_index=0)

    if not session.agent.llmclients:
        raise HTTPException(
            400,
            "No active providers configured. Add one in Settings first.",
        )

    attachment_ids = list(payload.attachment_ids or [])
    image_inputs = await image_service.load_image_inputs(db, attachment_ids)
    tools_schema = await tool_service.get_filtered_tools_schema(db)

    await _persist_message(
        payload.session_id,
        role="user",
        content=payload.text,
        attachment_ids=attachment_ids,
    )
    await _maybe_update_title(payload.session_id, payload.text)

    async def event_source():
        assistant_text_parts: list[str] = []
        tool_events: list[dict[str, Any]] = []
        try:
            async for event, data in stream_chat_events(
                session,
                payload.text,
                images=image_inputs or None,
                tools_schema_override=tools_schema,
            ):
                if event == "chunk":
                    assistant_text_parts.append(data.get("text", ""))
                elif event in ("tool_call", "tool_result", "turn"):
                    tool_events.append({"event": event, **data})
                yield format_sse(event, data)
        finally:
            assistant_text = "".join(assistant_text_parts)
            if assistant_text or tool_events:
                try:
                    await _persist_message(
                        payload.session_id,
                        role="assistant",
                        content=assistant_text,
                        tool_events=tool_events,
                    )
                except Exception as exc:
                    logger.warning("Persist assistant message failed: %s", exc)

    return StreamingResponse(
        event_source(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@router.post("/{session_id}/cancel")
async def cancel(session_id: str):
    ok = await session_manager.cancel(session_id)
    if not ok:
        raise HTTPException(404, "Session not active")
    return {"ok": True}
