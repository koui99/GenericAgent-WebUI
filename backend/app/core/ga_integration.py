from __future__ import annotations

import json
import logging
import os
import sys
import threading
from pathlib import Path
from typing import Any, Callable, Generator

from app.core.config import settings

ToolEventCallback = Callable[[str, dict[str, Any]], None]

logger = logging.getLogger(__name__)

_LOCK = threading.RLock()
_BOOTED = False

GenericAgent = None
agent_runner_loop = None
_get_system_prompt = None
_GenericAgentHandler = None
TOOLS_SCHEMA: list[dict[str, Any]] | None = None
_llmcore = None


def _bootstrap() -> None:
    global _BOOTED, GenericAgent, agent_runner_loop, _get_system_prompt
    global _GenericAgentHandler, TOOLS_SCHEMA, _llmcore

    with _LOCK:
        if _BOOTED:
            return

        if not (settings.vendor_ga_path / "agentmain.py").exists():
            raise RuntimeError(
                f"GenericAgent submodule not found at {settings.vendor_ga_path}. "
                "Run: git submodule update --init --recursive"
            )

        shim_dir = str(settings.ga_shim_dir.resolve())
        vendor_dir = str(settings.vendor_ga_path.resolve())

        if shim_dir not in sys.path:
            sys.path.insert(0, shim_dir)
        if vendor_dir not in sys.path:
            sys.path.insert(0, vendor_dir)

        os.environ.setdefault("GA_LANG", "zh")

        import llmcore  # type: ignore[import-not-found]

        def _patched_reload_mykeys():
            return llmcore.__dict__.get("mykeys", {}), True

        llmcore.reload_mykeys = _patched_reload_mykeys

        import mykey  # type: ignore[import-not-found]
        import importlib
        importlib.reload(mykey)
        initial = {k: v for k, v in vars(mykey).items() if not k.startswith("_")}
        llmcore.__dict__["mykeys"] = initial

        from agentmain import GenericAgent as _GA  # type: ignore[import-not-found]
        from agentmain import TOOLS_SCHEMA as _TS  # type: ignore[import-not-found]
        from agentmain import get_system_prompt as _gsp  # type: ignore[import-not-found]
        from agent_loop import agent_runner_loop as _arl  # type: ignore[import-not-found]
        from ga import GenericAgentHandler as _Handler  # type: ignore[import-not-found]

        GenericAgent = _GA
        agent_runner_loop = _arl
        _get_system_prompt = _gsp
        _GenericAgentHandler = _Handler
        TOOLS_SCHEMA = _TS
        _llmcore = llmcore
        _BOOTED = True
        logger.info("GenericAgent bootstrapped (vendor=%s)", vendor_dir)


def _provider_to_mykey_entry(p: dict[str, Any]) -> dict[str, Any]:
    entry: dict[str, Any] = {
        "apikey": p["apikey"],
        "apibase": p.get("api_base", "https://api.openai.com/v1"),
        "model": p.get("model", "gpt-4o-mini"),
        "stream": p.get("stream", True),
        "max_retries": p.get("max_retries", 3),
    }
    for extra in (
        "provider", "temperature", "max_tokens", "reasoning_effort",
        "service_tier", "api_mode", "read_timeout",
    ):
        if p.get(extra) is not None:
            entry[extra] = p[extra]
    if p.get("connect_timeout") is not None:
        entry["timeout"] = p["connect_timeout"]
    extra_params = p.get("extra_params") or {}
    if isinstance(extra_params, dict):
        entry.update(extra_params)
    return entry


_GA_KIND_TOKENS = ("claude", "oai", "mixin", "native")
_GA_FILTER_TOKENS = ("api", "config", "cookie")


def _ga_compatible_key(user_key: str, api_mode: str | None) -> str:
    lower = user_key.lower()
    has_kind = any(t in lower for t in _GA_KIND_TOKENS)
    has_filter = any(t in lower for t in _GA_FILTER_TOKENS)
    if has_kind and has_filter:
        return user_key
    kind = "claude" if api_mode == "anthropic" else "oai"
    parts = [user_key]
    if not has_kind:
        parts.append(kind)
    if not has_filter:
        parts.append("api")
    return "_".join(parts)


def sync_providers_to_llmcore(providers: list[dict[str, Any]]) -> None:
    _bootstrap()
    merged: dict[str, Any] = {}
    for p in providers:
        key = _ga_compatible_key(p["key_name"], p.get("api_mode"))
        merged[key] = _provider_to_mykey_entry(p)
    with _LOCK:
        _llmcore.__dict__["mykeys"] = merged
    logger.info("Synced %d providers into llmcore.mykeys", len(providers))


def current_mykeys() -> dict[str, Any]:
    _bootstrap()
    return dict(_llmcore.__dict__.get("mykeys", {}))


def get_tools_schema() -> list[dict[str, Any]]:
    _bootstrap()
    return list(TOOLS_SCHEMA or [])


def create_agent(initial_llm_no: int = 0):
    _bootstrap()
    assert GenericAgent is not None
    agent = GenericAgent()
    agent.verbose = False
    if agent.llmclients:
        try:
            agent.next_llm(initial_llm_no % len(agent.llmclients))
        except Exception as exc:
            logger.warning("next_llm(%d) failed: %s", initial_llm_no, exc)
    return agent


def list_available_llms(agent) -> list[dict[str, Any]]:
    rows = agent.list_llms()
    return [{"index": i, "name": name, "active": active} for i, name, active in rows]


def switch_llm(agent, index: int) -> None:
    agent.next_llm(index)


def build_initial_user_content(text: str, images: list[dict[str, Any]] | None) -> Any:
    if not images:
        return text
    blocks: list[dict[str, Any]] = [{"type": "text", "text": text}]
    for img in images:
        blocks.append({
            "type": "image",
            "source": {
                "type": "base64",
                "media_type": img.get("media_type", "image/png"),
                "data": img["data"],
            },
        })
    return blocks


def _install_tool_hooks(handler, on_event: ToolEventCallback) -> None:
    def _tid(handler_obj, args_obj) -> str:
        return f"t{getattr(handler_obj, 'current_turn', 0)}-{args_obj.get('_index', 0)}"

    def _clean_args(args_obj: dict[str, Any]) -> dict[str, Any]:
        return {k: v for k, v in args_obj.items() if not k.startswith("_")}

    def _preview(data: Any, limit: int = 4000) -> str:
        try:
            if isinstance(data, (dict, list)):
                text = json.dumps(data, ensure_ascii=False, default=str)
            else:
                text = "" if data is None else str(data)
        except Exception:
            text = str(data)
        if len(text) > limit:
            return text[:limit] + f"\n...[truncated {len(text) - limit} chars]"
        return text

    def tool_before(tool_name: str, args: dict[str, Any], response: Any) -> None:
        if tool_name == "no_tool":
            return
        try:
            on_event(
                "tool_call",
                {
                    "id": _tid(handler, args),
                    "name": tool_name,
                    "args": _clean_args(args),
                    "turn": getattr(handler, "current_turn", 0),
                },
            )
        except Exception as exc:  # pragma: no cover - defensive
            logger.exception("tool_before hook failed: %s", exc)

    def tool_after(tool_name: str, args: dict[str, Any], response: Any, ret: Any) -> None:
        if tool_name == "no_tool":
            return
        try:
            on_event(
                "tool_result",
                {
                    "id": _tid(handler, args),
                    "name": tool_name,
                    "ok": not getattr(ret, "should_exit", False),
                    "preview": _preview(getattr(ret, "data", None)),
                    "turn": getattr(handler, "current_turn", 0),
                },
            )
        except Exception as exc:  # pragma: no cover - defensive
            logger.exception("tool_after hook failed: %s", exc)

    handler.tool_before_callback = tool_before
    handler.tool_after_callback = tool_after


def run_agent_loop(
    agent,
    user_input: str,
    images: list[dict[str, Any]] | None = None,
    tools_schema_override: list[dict[str, Any]] | None = None,
    system_prompt_override: str | None = None,
    max_turns: int = 70,
    on_tool_event: ToolEventCallback | None = None,
) -> Generator[str, None, dict[str, Any]]:
    _bootstrap()
    assert agent_runner_loop is not None
    assert _get_system_prompt is not None
    assert _GenericAgentHandler is not None

    system_prompt = system_prompt_override or _get_system_prompt()
    system_prompt += getattr(agent.llmclient.backend, "extra_sys_prompt", "")

    initial_user_content = build_initial_user_content(user_input, images)

    handler = _GenericAgentHandler(
        agent,
        agent.history,
        os.path.join(str(settings.vendor_ga_path), "temp"),
    )
    agent.handler = handler
    if on_tool_event is not None:
        _install_tool_hooks(handler, on_tool_event)
    agent.llmclient.log_path = agent.log_path
    agent.is_running = True
    agent.stop_sig = False
    agent.history.append(f"[USER]: {user_input[:200]}")

    tools = tools_schema_override if tools_schema_override is not None else TOOLS_SCHEMA

    gen = agent_runner_loop(
        agent.llmclient,
        system_prompt,
        user_input,
        handler,
        tools,
        max_turns=max_turns,
        verbose=True,
        initial_user_content=initial_user_content,
    )

    exit_reason: dict[str, Any] = {}
    try:
        while True:
            if agent.stop_sig:
                break
            try:
                chunk = next(gen)
            except StopIteration as stop:
                exit_reason = stop.value or {}
                break
            yield chunk
    except GeneratorExit:
        agent.abort()
        raise
    finally:
        agent.is_running = False
        agent.history = getattr(handler, "history_info", agent.history)

    return exit_reason or {"result": "DONE"}


def ensure_booted() -> Path:
    _bootstrap()
    return settings.vendor_ga_path
