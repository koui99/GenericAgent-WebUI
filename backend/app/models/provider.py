from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class ProviderConfig(Base):
    __tablename__ = "provider_configs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    key_name: Mapped[str] = mapped_column(String(128), unique=True, nullable=False, index=True)
    label: Mapped[str] = mapped_column(String(256), nullable=False, default="")

    apikey: Mapped[str] = mapped_column(Text, nullable=False)
    api_base: Mapped[str] = mapped_column(String(1024), nullable=False, default="https://api.openai.com/v1")

    provider: Mapped[str] = mapped_column(String(64), nullable=False, default="openai")
    model: Mapped[str] = mapped_column(String(256), nullable=False, default="gpt-4o-mini")

    stream: Mapped[bool] = mapped_column(Boolean, default=True)
    api_mode: Mapped[str] = mapped_column(String(32), default="chat_completions")

    temperature: Mapped[float | None] = mapped_column(Float, default=1.0)
    max_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    reasoning_effort: Mapped[str | None] = mapped_column(String(16), nullable=True)
    service_tier: Mapped[str | None] = mapped_column(String(16), nullable=True)

    connect_timeout: Mapped[int] = mapped_column(Integer, default=15)
    read_timeout: Mapped[int] = mapped_column(Integer, default=120)
    max_retries: Mapped[int] = mapped_column(Integer, default=3)

    extra_params: Mapped[dict] = mapped_column(JSON, default=dict)

    supports_vision: Mapped[bool] = mapped_column(Boolean, default=False)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow, onupdate=_utcnow, nullable=False)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "key_name": self.key_name,
            "label": self.label,
            "apikey": self.apikey,
            "api_base": self.api_base,
            "provider": self.provider,
            "model": self.model,
            "stream": self.stream,
            "api_mode": self.api_mode,
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
            "reasoning_effort": self.reasoning_effort,
            "service_tier": self.service_tier,
            "connect_timeout": self.connect_timeout,
            "read_timeout": self.read_timeout,
            "max_retries": self.max_retries,
            "extra_params": self.extra_params or {},
            "supports_vision": self.supports_vision,
            "enabled": self.enabled,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
