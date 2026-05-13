from __future__ import annotations

import asyncio
import logging
import time
from typing import Any

from app.core.config import settings
from app.core.ga_integration import create_agent

logger = logging.getLogger(__name__)


class AgentSession:
    def __init__(self, session_id: str, llm_index: int = 0):
        self.session_id = session_id
        self.lock = asyncio.Lock()
        self.agent = create_agent(initial_llm_no=llm_index)
        self.last_active_at = time.time()
        self.created_at = time.time()
        self.is_running = False

    def touch(self) -> None:
        self.last_active_at = time.time()

    @property
    def idle_seconds(self) -> float:
        return time.time() - self.last_active_at


class SessionManager:
    def __init__(
        self,
        max_sessions: int = 20,
        idle_timeout: int = 1800,
        cleanup_interval: int = 300,
    ):
        self._sessions: dict[str, AgentSession] = {}
        self._lru: list[str] = []
        self._max = max_sessions
        self._idle_timeout = idle_timeout
        self._cleanup_interval = cleanup_interval
        self._cleanup_task: asyncio.Task | None = None
        self._lock = asyncio.Lock()

    async def start(self) -> None:
        if self._cleanup_task is None:
            self._cleanup_task = asyncio.create_task(self._cleanup_loop())

    async def stop(self) -> None:
        if self._cleanup_task:
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass
        async with self._lock:
            for sid in list(self._sessions):
                await self._destroy(sid)

    async def get_or_create(self, session_id: str, llm_index: int = 0) -> AgentSession:
        async with self._lock:
            if session_id in self._sessions:
                session = self._sessions[session_id]
                session.touch()
                self._promote(session_id)
                return session

            if len(self._sessions) >= self._max:
                await self._evict_one()

            logger.info("Creating AgentSession %s (llm_index=%d)", session_id, llm_index)
            session = AgentSession(session_id, llm_index)
            self._sessions[session_id] = session
            self._lru.append(session_id)
            return session

    async def get(self, session_id: str) -> AgentSession | None:
        async with self._lock:
            session = self._sessions.get(session_id)
            if session:
                session.touch()
                self._promote(session_id)
            return session

    async def cancel(self, session_id: str) -> bool:
        session = await self.get(session_id)
        if not session:
            return False
        session.agent.abort()
        return True

    async def clear_all(self) -> None:
        """Destroy all cached sessions. Called when provider config changes."""
        async with self._lock:
            for sid in list(self._sessions):
                await self._destroy(sid)
            logger.info("Cleared all agent sessions (provider config changed)")

    async def destroy(self, session_id: str) -> bool:
        async with self._lock:
            if session_id not in self._sessions:
                return False
            await self._destroy(session_id)
            return True

    def list_active(self) -> list[dict[str, Any]]:
        return [
            {
                "session_id": sid,
                "age_seconds": int(time.time() - s.created_at),
                "idle_seconds": int(s.idle_seconds),
                "is_running": s.is_running,
            }
            for sid, s in self._sessions.items()
        ]

    async def _destroy(self, session_id: str) -> None:
        session = self._sessions.pop(session_id, None)
        if session is None:
            return
        if session.is_running:
            session.agent.abort()
        if session_id in self._lru:
            self._lru.remove(session_id)
        logger.info("Destroyed session %s", session_id)

    def _promote(self, session_id: str) -> None:
        if session_id in self._lru:
            self._lru.remove(session_id)
        self._lru.append(session_id)

    async def _evict_one(self) -> None:
        for sid in list(self._lru):
            if sid in self._sessions and not self._sessions[sid].is_running:
                await self._destroy(sid)
                logger.info("Evicted LRU session %s", sid)
                return
        for sid in list(self._sessions):
            if not self._sessions[sid].is_running:
                await self._destroy(sid)
                return

    async def _cleanup_loop(self) -> None:
        while True:
            try:
                await asyncio.sleep(self._cleanup_interval)
                async with self._lock:
                    expired = [
                        sid for sid, s in self._sessions.items()
                        if s.idle_seconds > self._idle_timeout and not s.is_running
                    ]
                    for sid in expired:
                        await self._destroy(sid)
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                logger.exception("Cleanup loop error: %s", exc)


session_manager = SessionManager(
    max_sessions=settings.max_sessions,
    idle_timeout=settings.session_idle_timeout_seconds,
    cleanup_interval=settings.session_cleanup_interval_seconds,
)
