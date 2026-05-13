# GenericAgent WebUI

[English](./README.md) | 简体中文

[GenericAgent](https://github.com/lsdefine/GenericAgent)（自进化自主 Agent 框架）的现代化、多模态 Web UI。

## 功能特性

- 流式对话界面（Server-Sent Events）
- 多模态输入：粘贴、拖拽、上传图片，适配视觉模型
- 在界面里直接管理 LLM Provider，无需手改 `mykey.py`，改动实时同步进 `llmcore.mykeys`
- 多会话并发，侧边栏切换、重命名、删除
- 工具调用实时可视化，可折叠卡片展示入参、结果、每一轮耗时
- 工具粒度的启用/禁用开关，持久化到 SQLite
- 首条消息自动生成会话标题
- 亮色 / 暗色 / 跟随系统主题

## 架构

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
                                          │ （git submodule，   │
                                          │  永不修改）         │
                                          └─────────────────────┘
```

- `vendor/GenericAgent/` 以 git submodule 方式引入。后端运行时 import 它，并通过 monkey-patch 把 Provider 配置注入到 `llmcore.mykeys`（详见 `backend/app/core/ga_integration.py`）。submodule **从不被修改**。
- SQLite（`backend/data/app.db`）存储 Provider、会话、消息、附件元数据和工具偏好。附件字节存于 `backend/data/attachments/{session_id}/`。
- 每个会话对应一个 `GeneraticAgent` 实例，放在 LRU 池里（`session_manager`）。同步的 `agent_runner_loop` 通过 `run_in_executor` + `asyncio.Queue` 桥接到 asyncio。

**技术栈**：FastAPI · Next.js 14 · Tailwind · shadcn/ui · Zustand · `@microsoft/fetch-event-source`。

## 快速开始

```bash
# 1. 连同 submodule 一起克隆
git clone --recursive https://github.com/koui99/GenericAgent-WebUI.git
cd GenericAgent-WebUI

# 2. 后端
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# GenericAgent 核心依赖（上游只提供 pyproject.toml，没有 requirements.txt）
pip install requests beautifulsoup4 bottle simple-websocket-server
cp .env.example .env   # 可选，默认值开箱可用
.venv/bin/uvicorn app.main:app --reload   # 监听 :8000

# 3. 前端（新开一个终端）
cd frontend
cp .env.local.example .env.local   # 可选
npm install
npm run dev   # 监听 :3000
```

打开 http://localhost:3000 → 在 **设置** 里添加一个 Provider → 开始对话。

### 健康检查

```bash
curl http://127.0.0.1:8000/api/health
# {"status":"ok","ga_booted":true,"mykeys":{"provider_keys":[...]}}
```

## 配置项

后端环境变量（全部可选，参考 `backend/.env.example`）：

| Key | 默认值 | 用途 |
|-----|--------|------|
| `DB_URL` | `sqlite+aiosqlite:///./data/app.db` | SQLAlchemy 异步数据库 URL |
| `CORS_ORIGINS` | `["http://localhost:3000","http://127.0.0.1:3000"]` | CORS 白名单 |
| `MAX_SESSIONS` | `20` | Agent LRU 池容量 |
| `SESSION_IDLE_TIMEOUT_SECONDS` | `1800` | 空闲会话回收阈值（秒） |
| `MAX_ATTACHMENT_BYTES` | `10485760` | 单图上传上限（10 MiB） |
| `MAX_ATTACHMENTS_PER_MESSAGE` | `10` | 单条消息附件软上限 |
| `GA_LANG` | `zh` | GenericAgent 语言（`zh` 或 `en`） |

前端环境变量（`frontend/.env.local`）：

| Key | 默认值 | 用途 |
|-----|--------|------|
| `BACKEND_URL` | `http://127.0.0.1:8000` | Next.js 服务端 fetch 的目标地址 |

## 常见问题

**Q：会改动 GenericAgent 源码吗？**
不会。`vendor/GenericAgent/` 是只读 submodule。所有集成都通过 `sys.path` 注入和函数 patch 完成，见 `backend/app/core/ga_integration.py`。

**Q：API Key 存在哪里？**
本地 SQLite 文件 `backend/data/app.db`，明文存储。单机本地使用没问题。如果要多人共享部署，建议在 OS 层加密，或切换到外部 secret manager。

**Q：粘贴/拖拽/上传为什么都走 base64？**
绕开 multipart form 处理，统一用 FastAPI JSON body，链路更干净。图片在客户端用 Canvas 压缩后再上传（`maxEdge=2048`，JPEG `q=0.85`）。

**Q：流式响应底层怎么实现的？**
后端用 `sse-starlette` + fetch 流式输出。前端用 `@microsoft/fetch-event-source`，因为原生 `EventSource` 不支持 POST body。事件类型：`start`、`chunk`、`turn`、`tool_call`、`tool_result`、`error`、`done`。

**Q：我禁用了某个工具，但 Agent 还是会提到它？**
工具过滤只影响 **下一次** 请求发送给 LLM 的 schema。已经在跑的那一轮会用旧 schema 跑完。

## Roadmap

完整里程碑计划见 `.claude/plan/genericagent-webui.md`。M1 到 M5 已完成。后续可能方向：会话导出、搜索、多用户鉴权、云端部署方案。

## License

MIT
