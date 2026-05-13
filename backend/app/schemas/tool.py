from __future__ import annotations

from pydantic import BaseModel


class ToolItem(BaseModel):
    name: str
    description: str
    enabled: bool


class ToolUpdate(BaseModel):
    enabled: bool
