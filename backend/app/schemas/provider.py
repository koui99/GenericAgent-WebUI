from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class ProviderBase(BaseModel):
    key_name: str = Field(..., min_length=1, max_length=128)
    label: str = ""
    apikey: str
    api_base: str = "https://api.openai.com/v1"
    provider: str = "openai"
    model: str = "gpt-4o-mini"
    stream: bool = True
    api_mode: str = "chat_completions"
    temperature: float | None = 1.0
    max_tokens: int | None = None
    reasoning_effort: str | None = None
    service_tier: str | None = None
    connect_timeout: int = 15
    read_timeout: int = 120
    max_retries: int = 3
    extra_params: dict[str, Any] = Field(default_factory=dict)
    supports_vision: bool = False
    enabled: bool = True
    is_active: bool = True


class ProviderCreate(ProviderBase):
    pass


class ProviderUpdate(BaseModel):
    label: str | None = None
    apikey: str | None = None
    api_base: str | None = None
    provider: str | None = None
    model: str | None = None
    stream: bool | None = None
    api_mode: str | None = None
    temperature: float | None = None
    max_tokens: int | None = None
    reasoning_effort: str | None = None
    service_tier: str | None = None
    connect_timeout: int | None = None
    read_timeout: int | None = None
    max_retries: int | None = None
    extra_params: dict[str, Any] | None = None
    supports_vision: bool | None = None
    enabled: bool | None = None
    is_active: bool | None = None


class ProviderResponse(ProviderBase):
    id: str
    created_at: str | None = None
    updated_at: str | None = None

    model_config = {"from_attributes": True}
