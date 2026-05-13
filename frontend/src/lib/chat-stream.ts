import { fetchEventSource } from '@microsoft/fetch-event-source';

import type { ChatEventType } from '@/types/chat';

export interface ChatStreamBody {
  session_id: string;
  text: string;
  attachment_ids?: string[];
}

export interface ChatStreamCallbacks {
  onEvent: (event: ChatEventType, data: Record<string, unknown>) => void;
  onClose?: () => void;
  onError?: (err: Error) => void;
}

class ChatStreamHttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function streamChat(
  body: ChatStreamBody,
  callbacks: ChatStreamCallbacks,
  signal?: AbortSignal
): Promise<void> {
  let closedByDone = false;
  try {
    await fetchEventSource('/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify(body),
      signal,
      openWhenHidden: true,
      async onopen(res) {
        if (res.ok && res.headers.get('content-type')?.includes('text/event-stream')) {
          return;
        }
        const text = await res.text().catch(() => res.statusText);
        throw new ChatStreamHttpError(res.status, text);
      },
      onmessage(ev) {
        let data: Record<string, unknown> = {};
        if (ev.data) {
          try {
            data = JSON.parse(ev.data);
          } catch {
            data = { raw: ev.data };
          }
        }
        const eventName = (ev.event || 'chunk') as ChatEventType;
        callbacks.onEvent(eventName, data);
        if (eventName === 'done') {
          closedByDone = true;
        }
      },
      onclose() {
        if (!closedByDone) {
          callbacks.onClose?.();
        }
      },
      onerror(err) {
        throw err;
      },
    });
  } catch (err) {
    if ((err as { name?: string })?.name === 'AbortError') return;
    const error = err instanceof Error ? err : new Error(String(err));
    callbacks.onError?.(error);
    return;
  }
  callbacks.onClose?.();
}

export async function cancelStream(sessionId: string): Promise<void> {
  await fetch(`/api/chat/${encodeURIComponent(sessionId)}/cancel`, { method: 'POST' }).catch(
    () => undefined
  );
}
