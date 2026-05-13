from __future__ import annotations

import logging
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.ga_integration import sync_providers_to_llmcore
from app.db.database import AsyncSessionLocal
from app.models.provider import ProviderConfig
from app.services.session_manager import session_manager

logger = logging.getLogger(__name__)


async def list_providers(db: AsyncSession) -> list[dict[str, Any]]:
    result = await db.execute(select(ProviderConfig).order_by(ProviderConfig.created_at))
    return [r.to_dict() for r in result.scalars().all()]


async def get_provider(db: AsyncSession, provider_id: str) -> dict[str, Any] | None:
    result = await db.execute(select(ProviderConfig).where(ProviderConfig.id == provider_id))
    row = result.scalar_one_or_none()
    return row.to_dict() if row else None


async def get_by_key_name(db: AsyncSession, key_name: str) -> dict[str, Any] | None:
    result = await db.execute(select(ProviderConfig).where(ProviderConfig.key_name == key_name))
    row = result.scalar_one_or_none()
    return row.to_dict() if row else None


async def create_provider(db: AsyncSession, data: dict[str, Any]) -> dict[str, Any]:
    row = ProviderConfig(**data)
    db.add(row)
    await db.commit()
    await db.refresh(row)
    await _sync_from_db(db)
    return row.to_dict()


async def update_provider(db: AsyncSession, provider_id: str, data: dict[str, Any]) -> dict[str, Any] | None:
    result = await db.execute(select(ProviderConfig).where(ProviderConfig.id == provider_id))
    row = result.scalar_one_or_none()
    if not row:
        return None
    for key, value in data.items():
        if hasattr(row, key) and key not in ("id", "created_at"):
            setattr(row, key, value)
    await db.commit()
    await db.refresh(row)
    await _sync_from_db(db)
    return row.to_dict()


async def delete_provider(db: AsyncSession, provider_id: str) -> bool:
    result = await db.execute(select(ProviderConfig).where(ProviderConfig.id == provider_id))
    row = result.scalar_one_or_none()
    if not row:
        return False
    await db.delete(row)
    await db.commit()
    await _sync_from_db(db)
    return True


async def get_active_providers(db: AsyncSession) -> list[dict[str, Any]]:
    result = await db.execute(
        select(ProviderConfig).where(
            ProviderConfig.is_active == True,  # noqa: E712
            ProviderConfig.enabled == True,  # noqa: E712
        )
    )
    return [r.to_dict() for r in result.scalars().all()]


async def _sync_from_db(db: AsyncSession) -> None:
    providers = await get_active_providers(db)
    try:
        sync_providers_to_llmcore(providers)
    except Exception as exc:
        logger.warning("sync_providers_to_llmcore failed: %s", exc)
    await session_manager.clear_all()


async def sync_active_providers() -> None:
    async with AsyncSessionLocal() as db:
        await _sync_from_db(db)
