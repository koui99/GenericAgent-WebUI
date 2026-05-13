from __future__ import annotations

import logging
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.ga_integration import ensure_booted, get_tools_schema
from app.models.tool_pref import ToolPref

logger = logging.getLogger(__name__)


def _schema_entry_info(entry: dict[str, Any]) -> tuple[str, str]:
    fn = entry.get("function") or {}
    return fn.get("name", ""), fn.get("description", "")


async def list_tools(db: AsyncSession) -> list[dict[str, Any]]:
    ensure_booted()
    schema = get_tools_schema() or []
    rows = (await db.execute(select(ToolPref))).scalars().all()
    pref_map = {r.name: r.enabled for r in rows}
    out: list[dict[str, Any]] = []
    for entry in schema:
        name, desc = _schema_entry_info(entry)
        if not name:
            continue
        out.append({
            "name": name,
            "description": desc,
            "enabled": pref_map.get(name, True),
        })
    return out


async def set_tool_enabled(db: AsyncSession, name: str, enabled: bool) -> dict[str, Any] | None:
    ensure_booted()
    schema = get_tools_schema() or []
    if not any(_schema_entry_info(e)[0] == name for e in schema):
        return None
    row = (
        await db.execute(select(ToolPref).where(ToolPref.name == name))
    ).scalar_one_or_none()
    if row is None:
        row = ToolPref(name=name, enabled=enabled)
        db.add(row)
    else:
        row.enabled = enabled
    await db.commit()
    await db.refresh(row)
    desc = next(
        (_schema_entry_info(e)[1] for e in schema if _schema_entry_info(e)[0] == name), ""
    )
    return {"name": row.name, "description": desc, "enabled": row.enabled}


async def get_filtered_tools_schema(db: AsyncSession) -> list[dict[str, Any]]:
    ensure_booted()
    schema = get_tools_schema() or []
    rows = (await db.execute(select(ToolPref))).scalars().all()
    disabled = {r.name for r in rows if not r.enabled}
    return [e for e in schema if _schema_entry_info(e)[0] not in disabled]
