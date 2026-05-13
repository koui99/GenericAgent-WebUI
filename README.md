# GenericAgent WebUI

English | [简体中文](./README.zh-CN.md)

A modern, multimodal web UI for [GenericAgent](https://github.com/lsdefine/GenericAgent) — the self-evolving autonomous agent framework.

## Features

- Streaming chat interface (Server-Sent Events)
- Multimodal input: paste, drop, or upload images for vision-capable models
- Manage LLM providers from the UI (no editing `mykey.py` required) — synced live into `llmcore.mykeys`
- Multiple concurrent sessions with sidebar switching, inline rename, and delete
- Live tool-call visualization — collapsible cards show args, result, and per-turn timing
- Per-tool enable/disable configuration, persisted to SQLite
- Auto-titled sessions from the first message
- Light / dark / system theme

## Architecture

```
┌─────────────────┐   SSE /api/chat/stream    ┌────────────────┐
│  Next.js 14     │ ◀───────────────────────▶ │  FastAPI       │
│  (App Router)   │   REST /api/providers     │                │
│  Tailwind +     │       /api/sessions       │  session_mgr   │
│  shadcn/ui      │       /api/attachments    │  provider_mgr  │
│  Zustand        │       /api/tools          │  tool_service  │
└─────────────────┘                           │  image_service │
                                              └────────┬───────┘
                                                       │ import + patch
                                                       ▼
                                          ┌─────────────────────┐
                                          │ vendor/GenericAgent │
                                          │ (git submodule,     │
                                          │  never modified)    │
                                          └─────────────────────┘
```

- `vendor/GenericAgent/` is a git submodule. The backend imports it at runtime and injects provider configs into `llmcore.mykeys` via monkey-patching (see `backend/app/core/ga_integration.py`). The submodule is **never edited**.
- SQLite (`backend/data/app.db`) stores providers, sessions, messages, attachments metadata, and tool prefs. Attachment bytes live under `backend/data/attachments/{session_id}/`.
- Each chat session maps to one `GeneraticAgent` instance in an LRU pool (`session_manager`). Synchronous `agent_runner_loop` is bridged to asyncio via `run_in_executor` + `asyncio.Queue`.

**Stack**: FastAPI · Next.js 14 · Tailwind · shadcn/ui primitives · Zustand · `@microsoft/fetch-event-source`.

## Quick start

```bash
# 1. Clone with submodule
git clone --recursive https://github.com/<you>/genericagent-webui.git
cd genericagent-webui

# 2. Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# GenericAgent core deps (it ships pyproject.toml only, no requirements.txt)
pip install requests beautifulsoup4 bottle simple-websocket-server
cp .env.example .env   # optional — all keys default to sensible values
.venv/bin/uvicorn app.main:app --reload   # :8000

# 3. Frontend (new terminal)
cd frontend
cp .env.local.example .env.local   # optional
npm install
npm run dev   # :3000
```

Open http://localhost:3000 → add a provider in **Settings** → start chatting.

### Production deployment

For VPS or server deployment, use production mode to reduce memory usage (~80 MB vs ~550 MB in dev mode) and improve page load speed:

```bash
# Frontend: build once, then serve
cd frontend
npm run build          # generates optimized .next/ bundle
npx next start -p 3000   # production server, ~80 MB RAM

# Backend: drop --reload for production
cd backend
.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
```

> **Tip**: On low-memory servers (≤ 2 GB), always use production mode. `next dev` compiles on-the-fly and can exhaust available RAM, causing builds and page loads to hang.

### Health check

```bash
curl http://127.0.0.1:8000/api/health
# {"status":"ok","ga_booted":true,"mykeys":{"provider_keys":[...]}}
```

## Configuration

Backend env vars (all optional, see `backend/.env.example`):

| Key | Default | Purpose |
|-----|---------|---------|
| `DB_URL` | `sqlite+aiosqlite:///./data/app.db` | SQLAlchemy async URL |
| `CORS_ORIGINS` | `["http://localhost:3000","http://127.0.0.1:3000"]` | CORS allowlist |
| `MAX_SESSIONS` | `20` | Agent pool size (LRU) |
| `SESSION_IDLE_TIMEOUT_SECONDS` | `1800` | Idle cleanup threshold |
| `MAX_ATTACHMENT_BYTES` | `10485760` | Per-image upload cap (10 MiB) |
| `MAX_ATTACHMENTS_PER_MESSAGE` | `10` | Soft cap in UI |
| `GA_LANG` | `zh` | GenericAgent language (`zh` or `en`) |

Frontend env vars (`frontend/.env.local`):

| Key | Default | Purpose |
|-----|---------|---------|
| `BACKEND_URL` | `http://127.0.0.1:8000` | Server-side fetch target for Next.js |

## FAQ

**Q: Does this modify GenericAgent?**
No. `vendor/GenericAgent/` is a read-only submodule. All integration happens via `sys.path` injection and function patching in `backend/app/core/ga_integration.py`.

**Q: Where are API keys stored?**
In the local SQLite file at `backend/data/app.db`, in plain text. This is fine for single-user local use. For shared deployments, wrap the file with OS-level encryption or switch to an external secret manager.

**Q: Why do paste/drop/upload all use base64?**
It sidesteps multipart form handling and flows through FastAPI JSON bodies cleanly. The image is compressed client-side (Canvas, `maxEdge=2048`, JPEG `q=0.85`) before upload.

**Q: How does streaming work under the hood?**
Backend uses `sse-starlette` + `fetch` streaming. Frontend uses `@microsoft/fetch-event-source` because `EventSource` can't POST a body. Events: `start`, `chunk`, `turn`, `tool_call`, `tool_result`, `error`, `done`.

**Q: I disabled a tool but the agent still mentions it.**
The filter only removes tools from the schema sent to the LLM on the *next* request. Turns already in flight will finish with the old schema.

## Roadmap

See `.claude/plan/genericagent-webui.md` for the full milestone plan. M1–M5 are complete. Possible next steps: conversation export, search, multi-user auth, cloud deploy recipes.

## License

MIT
