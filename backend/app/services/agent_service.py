from __future__ import annotations

import asyncio
import json
import logging
import re
from typing import Any, AsyncGenerator

from app.core.ga_integration import run_agent_loop
from app.services.session_manager import AgentSession

logger = logging.getLogger(__name__)

_TURN_RE = re.compile(r"LLM Running \(Turn (\d+)\)")
_NOISE_LINE_RE = re.compile(r"^\s*(?:\*\*)?(?:Turn \d+|LLM Running \(Turn \d+\)).*?(?:\*\*)?\s*$")
_TOOL_HEADER_RE = re.compile(r"^🛠️ \w+\(.*?\)\s*$")


def format_sse(event: str, data: Any) -> str:
    payload = data if isinstance(data, str) else json.dumps(data, ensure_ascii=False)
    return f"event: {event}\ndata: {payload}\n\n"


def _clean_chunk(text: str) -> str:
    out_lines: list[str] = []
    for line in text.split("\n"):
        if _NOISE_LINE_RE.match(line) or _TOOL_HEADER_RE.match(line):
            continue
        out_lines.append(line)
    return "\n".join(out_lines)


async def stream_chat_events(
    session: AgentSession,
    user_input: str,
    images: list[dict[str, Any]] | None = None,
    tools_schema_override: list[dict[str, Any]] | None = None,
) -> AsyncGenerator[tuple[str, dict[str, Any]], None]:
    queue: asyncio.Queue = asyncio.Queue()
    loop = asyncio.get_running_loop()

    def _emit_tool_event(event: str, data: dict[str, Any]) -> None:
        loop.call_soon_threadsafe(queue.put_nowait, (event, data))

    def _drive() -> None:
        try:
            gen = run_agent_loop(
                session.agent,
                user_input,
                images=images,
                tools_schema_override=tools_schema_override,
                on_tool_event=_emit_tool_event,
            )
            for chunk in gen:
                if session.agent.stop_sig:
                    break
                loop.call_soon_threadsafe(queue.put_nowait, ("chunk", {"text": chunk}))
        except Exception as exc:
            logger.exception("Agent run failed: %s", exc)
            loop.call_soon_threadsafe(queue.put_nowait, ("error", {"message": str(exc)}))
        finally:
            loop.call_soon_threadsafe(queue.put_nowait, ("__done__", {}))

    session.is_running = True
    fut = loop.run_in_executor(None, _drive)

    try:
        yield "start", {"session_id": session.session_id}
        while True:
            event_type, payload = await queue.get()
            if event_type == "__done__":
                reason = "cancelled" if session.agent.stop_sig else "complete"
                yield "done", {"reason": reason}
                break
            if event_type == "chunk":
                text = payload.get("text", "")
                for m in _TURN_RE.finditer(text):
                    yield "turn", {"turn": int(m.group(1))}
                cleaned = _clean_chunk(text)
                if cleaned.strip():
                    yield "chunk", {"text": cleaned}
                continue
            yield event_type, payload
    finally:
        session.is_running = False
        if not fut.done():
            session.agent.abort()
            try:
                await fut
            except Exception:
                pass
