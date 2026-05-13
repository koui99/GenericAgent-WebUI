from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.schemas.provider import ProviderCreate, ProviderResponse, ProviderUpdate
from app.services import provider_manager

router = APIRouter(prefix="/api/providers", tags=["providers"])


@router.get("", response_model=list[ProviderResponse])
async def list_all(db: AsyncSession = Depends(get_db)):
    return await provider_manager.list_providers(db)


@router.post("", response_model=ProviderResponse, status_code=201)
async def create(payload: ProviderCreate, db: AsyncSession = Depends(get_db)):
    existing = await provider_manager.get_by_key_name(db, payload.key_name)
    if existing:
        raise HTTPException(status_code=409, detail=f"key_name '{payload.key_name}' already exists")
    return await provider_manager.create_provider(db, payload.model_dump())


@router.get("/{provider_id}", response_model=ProviderResponse)
async def get_one(provider_id: str, db: AsyncSession = Depends(get_db)):
    row = await provider_manager.get_provider(db, provider_id)
    if not row:
        raise HTTPException(404, "Provider not found")
    return row


@router.patch("/{provider_id}", response_model=ProviderResponse)
async def update(provider_id: str, payload: ProviderUpdate, db: AsyncSession = Depends(get_db)):
    data = {k: v for k, v in payload.model_dump().items() if v is not None}
    row = await provider_manager.update_provider(db, provider_id, data)
    if not row:
        raise HTTPException(404, "Provider not found")
    return row


@router.delete("/{provider_id}", status_code=204)
async def delete(provider_id: str, db: AsyncSession = Depends(get_db)):
    ok = await provider_manager.delete_provider(db, provider_id)
    if not ok:
        raise HTTPException(404, "Provider not found")
