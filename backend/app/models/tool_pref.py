from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class ToolPref(Base):
    __tablename__ = "tool_prefs"

    name: Mapped[str] = mapped_column(String(128), primary_key=True)
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=_utcnow, onupdate=_utcnow, nullable=False
    )

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "enabled": self.enabled,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
