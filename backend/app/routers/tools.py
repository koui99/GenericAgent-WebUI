from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.schemas.tool import ToolItem, ToolUpdate
from app.services import tool_service

router = APIRouter(prefix="/api/tools", tags=["tools"])


@router.get("", response_model=list[ToolItem])
async def list_all(db: AsyncSession = Depends(get_db)):
    return await tool_service.list_tools(db)


@router.patch("/{name}", response_model=ToolItem)
async def update(name: str, payload: ToolUpdate, db: AsyncSession = Depends(get_db)):
    row = await tool_service.set_tool_enabled(db, name, payload.enabled)
    if row is None:
        raise HTTPException(404, f"Tool '{name}' not found in schema")
    return row
