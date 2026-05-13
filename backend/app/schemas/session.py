from __future__ import annotations

from pydantic import BaseModel, Field


class SessionCreate(BaseModel):
    title: str = "New chat"
    active_provider_key: str | None = None
    system_prompt_override: str | None = None


class SessionUpdate(BaseModel):
    title: str | None = None
    active_provider_key: str | None = None
    system_prompt_override: str | None = None


class SessionResponse(BaseModel):
    id: str
    title: str
    active_provider_key: str | None = None
    system_prompt_override: str | None = None
    created_at: str | None = None
    updated_at: str | None = None


class ChatRequest(BaseModel):
    session_id: str
    text: str = Field(..., min_length=1)
    attachment_ids: list[str] = Field(default_factory=list)
    provider_key: str | None = None
