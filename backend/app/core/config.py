from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_ROOT = Path(__file__).resolve().parents[2]
_PROJECT_ROOT = _BACKEND_ROOT.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    project_root: Path = _PROJECT_ROOT
    backend_root: Path = _BACKEND_ROOT
    vendor_ga_path: Path = _PROJECT_ROOT / "vendor" / "GenericAgent"
    ga_shim_dir: Path = _BACKEND_ROOT / "app" / "core" / "_ga_shim"

    data_dir: Path = _BACKEND_ROOT / "data"
    attachments_dir: Path = _BACKEND_ROOT / "data" / "attachments"
    db_url: str = f"sqlite+aiosqlite:///{_BACKEND_ROOT / 'data' / 'app.db'}"

    cors_origins: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    max_sessions: int = 20
    session_idle_timeout_seconds: int = 1800
    session_cleanup_interval_seconds: int = 300

    max_attachment_bytes: int = 10 * 1024 * 1024
    max_attachments_per_message: int = 10


settings = Settings()
settings.data_dir.mkdir(parents=True, exist_ok=True)
settings.attachments_dir.mkdir(parents=True, exist_ok=True)
