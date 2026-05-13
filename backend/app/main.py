from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.database import init_db

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting GenericAgent WebUI backend")
    await init_db()
    from app.core.ga_integration import ensure_booted
    from app.services.provider_manager import sync_active_providers
    from app.services.session_manager import session_manager

    try:
        ensure_booted()
    except Exception as exc:
        logger.warning("GenericAgent bootstrap deferred: %s", exc)

    try:
        await sync_active_providers()
    except Exception as exc:
        logger.warning("Initial provider sync skipped: %s", exc)

    await session_manager.start()

    try:
        yield
    finally:
        logger.info("Shutting down")
        await session_manager.stop()


app = FastAPI(title="GenericAgent WebUI", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health() -> dict:
    from app.core.ga_integration import _BOOTED, current_mykeys

    mykeys_info: dict = {}
    if _BOOTED:
        try:
            mk = current_mykeys()
            mykeys_info = {"provider_keys": sorted(mk.keys())}
        except Exception as exc:
            mykeys_info = {"error": str(exc)}

    return {
        "status": "ok",
        "ga_booted": _BOOTED,
        "mykeys": mykeys_info,
    }


from app.routers import providers, sessions, chat, attachments, tools  # noqa: E402

app.include_router(providers.router)
app.include_router(sessions.router)
app.include_router(chat.router)
app.include_router(attachments.router)
app.include_router(tools.router)
