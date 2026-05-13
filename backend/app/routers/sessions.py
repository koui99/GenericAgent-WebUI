from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.message import Message
from app.models.session import ChatSession
from app.schemas.session import SessionCreate, SessionResponse, SessionUpdate
from app.services.session_manager import session_manager

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


@router.get("", response_model=list[SessionResponse])
async def list_all(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ChatSession).order_by(ChatSession.updated_at.desc()))
    return [r.to_dict() for r in result.scalars().all()]


@router.post("", response_model=SessionResponse, status_code=201)
async def create(payload: SessionCreate, db: AsyncSession = Depends(get_db)):
    row = ChatSession(**payload.model_dump())
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row.to_dict()


@router.get("/{session_id}", response_model=SessionResponse)
async def get_one(session_id: str, db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(ChatSession).where(ChatSession.id == session_id))).scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Session not found")
    return row.to_dict()


@router.patch("/{session_id}", response_model=SessionResponse)
async def update(session_id: str, payload: SessionUpdate, db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(ChatSession).where(ChatSession.id == session_id))).scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Session not found")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(row, k, v)
    await db.commit()
    await db.refresh(row)
    return row.to_dict()


@router.delete("/{session_id}", status_code=204)
async def delete(session_id: str, db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(ChatSession).where(ChatSession.id == session_id))).scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Session not found")
    await db.delete(row)
    await db.commit()
    await session_manager.destroy(session_id)


@router.get("/{session_id}/messages")
async def list_messages(session_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Message).where(Message.session_id == session_id).order_by(Message.seq)
    )
    return [r.to_dict() for r in result.scalars().all()]
