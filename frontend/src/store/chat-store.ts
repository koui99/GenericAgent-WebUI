import { create } from 'zustand';

import type { TimelineItem, UIMessage, UIToolCall } from '@/types/chat';

interface ChatStore {
  messages: UIMessage[];
  isStreaming: boolean;
  currentAssistantId: string | null;
  abortCtrl: AbortController | null;

  setMessages: (messages: UIMessage[]) => void;
  appendMessage: (message: UIMessage) => void;
  appendText: (id: string, chunk: string) => void;
  addTurn: (id: string, turn: number) => void;
  addToolCall: (id: string, call: UIToolCall) => void;
  completeToolResult: (
    id: string,
    toolId: string,
    patch: { ok: boolean; preview: string; status: 'done' | 'error' }
  ) => void;
  finishMessage: (id: string, status: 'done' | 'error', errorMessage?: string) => void;
  startStreaming: (assistantId: string, ctrl: AbortController) => void;
  stopStreaming: () => void;
  reset: () => void;
}

function withLastText(timeline: TimelineItem[], chunk: string): TimelineItem[] {
  if (timeline.length === 0) return [{ kind: 'text', text: chunk }];
  const last = timeline[timeline.length - 1];
  if (last.kind === 'text') {
    return [
      ...timeline.slice(0, -1),
      { kind: 'text', text: last.text + chunk },
    ];
  }
  return [...timeline, { kind: 'text', text: chunk }];
}

function mapMessage(
  messages: UIMessage[],
  id: string,
  fn: (m: UIMessage) => UIMessage
): UIMessage[] {
  return messages.map((m) => (m.id === id ? fn(m) : m));
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  isStreaming: false,
  currentAssistantId: null,
  abortCtrl: null,

  setMessages: (messages) => set({ messages }),

  appendMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  appendText: (id, chunk) =>
    set((state) => ({
      messages: mapMessage(state.messages, id, (m) => ({
        ...m,
        content: m.content + chunk,
        timeline: withLastText(m.timeline, chunk),
        status: 'streaming',
      })),
    })),

  addTurn: (id, turn) =>
    set((state) => ({
      messages: mapMessage(state.messages, id, (m) => {
        const last = m.timeline[m.timeline.length - 1];
        if (last && last.kind === 'turn' && last.turn === turn) return m;
        return {
          ...m,
          timeline: [...m.timeline, { kind: 'turn', turn }],
          status: 'streaming',
        };
      }),
    })),

  addToolCall: (id, call) =>
    set((state) => ({
      messages: mapMessage(state.messages, id, (m) => ({
        ...m,
        tools: { ...m.tools, [call.id]: call },
        timeline: [...m.timeline, { kind: 'tool', toolId: call.id }],
        status: 'streaming',
      })),
    })),

  completeToolResult: (id, toolId, patch) =>
    set((state) => ({
      messages: mapMessage(state.messages, id, (m) => {
        const existing = m.tools[toolId];
        if (!existing) return m;
        return {
          ...m,
          tools: {
            ...m.tools,
            [toolId]: {
              ...existing,
              status: patch.status,
              ok: patch.ok,
              preview: patch.preview,
            },
          },
        };
      }),
    })),

  finishMessage: (id, status, errorMessage) =>
    set((state) => ({
      messages: mapMessage(state.messages, id, (m) => ({ ...m, status, errorMessage })),
    })),

  startStreaming: (assistantId, ctrl) =>
    set({ isStreaming: true, currentAssistantId: assistantId, abortCtrl: ctrl }),

  stopStreaming: () => {
    const { abortCtrl } = get();
    if (abortCtrl) {
      try {
        abortCtrl.abort();
      } catch {}
    }
    set({ isStreaming: false, currentAssistantId: null, abortCtrl: null });
  },

  reset: () =>
    set({
      messages: [],
      isStreaming: false,
      currentAssistantId: null,
      abortCtrl: null,
    }),
}));
