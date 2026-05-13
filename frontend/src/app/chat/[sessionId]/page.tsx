import { notFound } from 'next/navigation';

import { ChatView } from '@/components/chat/ChatView';
import { ChatShell } from '@/components/layout/ChatShell';
import type { TimelineItem, UIMessage, UIToolCall } from '@/types/chat';
import type { PersistedMessage, Session } from '@/types/session';

const BACKEND = process.env.BACKEND_URL || 'http://127.0.0.1:8000';

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${BACKEND}${path}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function fetchSession(id: string): Promise<Session | null> {
  return fetchJson<Session>(`/api/sessions/${encodeURIComponent(id)}`);
}

async function fetchMessages(id: string): Promise<PersistedMessage[]> {
  return (
    (await fetchJson<PersistedMessage[]>(`/api/sessions/${encodeURIComponent(id)}/messages`)) ?? []
  );
}

async function fetchSessions(): Promise<Session[]> {
  return (await fetchJson<Session[]>(`/api/sessions`)) ?? [];
}

async function fetchProviderCount(): Promise<number> {
  const health = await fetchJson<{ mykeys?: { provider_keys?: string[] } }>(`/api/health`);
  return health?.mykeys?.provider_keys?.length ?? 0;
}

function toUIMessage(m: PersistedMessage): UIMessage {
  const timeline: TimelineItem[] = [];
  const tools: Record<string, UIToolCall> = {};

  if (m.content) timeline.push({ kind: 'text', text: m.content });

  if (Array.isArray(m.tool_events)) {
    for (const raw of m.tool_events as Array<Record<string, unknown>>) {
      const kind = raw.event;
      if (kind === 'turn' && typeof raw.turn === 'number') {
        timeline.push({ kind: 'turn', turn: raw.turn });
      } else if (kind === 'tool_call') {
        const id = String(raw.id ?? '');
        if (!id || tools[id]) continue;
        tools[id] = {
          id,
          name: String(raw.name ?? 'unknown'),
          args: (raw.args as Record<string, unknown>) ?? {},
          turn: Number(raw.turn ?? 0),
          status: 'done',
          preview: '',
          ok: true,
        };
        timeline.push({ kind: 'tool', toolId: id });
      } else if (kind === 'tool_result') {
        const id = String(raw.id ?? '');
        const ok = Boolean(raw.ok ?? true);
        if (tools[id]) {
          tools[id] = {
            ...tools[id],
            ok,
            preview: String(raw.preview ?? ''),
            status: ok ? 'done' : 'error',
          };
        }
      }
    }
  }

  return {
    id: m.id,
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content,
    timeline,
    tools,
    status: 'done',
    attachmentIds: Array.isArray(m.attachment_ids) ? m.attachment_ids : [],
  };
}

export default async function ChatPage({ params }: { params: { sessionId: string } }) {
  const session = await fetchSession(params.sessionId);
  if (!session) notFound();

  const [persisted, providerCount, sessions] = await Promise.all([
    fetchMessages(params.sessionId),
    fetchProviderCount(),
    fetchSessions(),
  ]);

  const initialMessages = persisted.map(toUIMessage);

  return (
    <ChatShell sessions={sessions} currentSession={session}>
      <ChatView
        sessionId={params.sessionId}
        initialMessages={initialMessages}
        hasActiveProvider={providerCount > 0}
      />
    </ChatShell>
  );
}
