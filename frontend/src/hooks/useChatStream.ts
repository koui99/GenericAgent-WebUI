'use client';

import * as React from 'react';

import { cancelStream, streamChat } from '@/lib/chat-stream';
import { useChatStore } from '@/store/chat-store';
import type { ChatEventType, UIMessage, UIToolCall } from '@/types/chat';

function uid() {
  return (
    globalThis.crypto?.randomUUID?.() ?? `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

export function useChatStream(sessionId: string) {
  const {
    appendMessage,
    appendText,
    addTurn,
    addToolCall,
    completeToolResult,
    finishMessage,
    startStreaming,
    stopStreaming,
    isStreaming,
    currentAssistantId,
  } = useChatStore();

  const send = React.useCallback(
    async (text: string, attachmentIds: string[] = []) => {
      if (isStreaming) return;
      if (!text.trim() && attachmentIds.length === 0) return;

      const userMsg: UIMessage = {
        id: uid(),
        role: 'user',
        content: text,
        timeline: text ? [{ kind: 'text', text }] : [],
        tools: {},
        status: 'done',
        attachmentIds,
      };
      appendMessage(userMsg);

      const assistantId = uid();
      const assistantMsg: UIMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        timeline: [],
        tools: {},
        status: 'pending',
        attachmentIds: [],
      };
      appendMessage(assistantMsg);

      const ctrl = new AbortController();
      startStreaming(assistantId, ctrl);

      await streamChat(
        { session_id: sessionId, text, attachment_ids: attachmentIds },
        {
          onEvent: (event: ChatEventType, data) => {
            if (event === 'chunk' && typeof data.text === 'string') {
              appendText(assistantId, data.text);
            } else if (event === 'turn' && typeof data.turn === 'number') {
              addTurn(assistantId, data.turn);
            } else if (event === 'tool_call') {
              const call: UIToolCall = {
                id: String(data.id ?? uid()),
                name: String(data.name ?? 'unknown'),
                args: (data.args as Record<string, unknown>) ?? {},
                turn: Number(data.turn ?? 0),
                status: 'running',
                preview: '',
                ok: true,
              };
              addToolCall(assistantId, call);
            } else if (event === 'tool_result') {
              const toolId = String(data.id ?? '');
              const ok = Boolean(data.ok ?? true);
              completeToolResult(assistantId, toolId, {
                ok,
                preview: String(data.preview ?? ''),
                status: ok ? 'done' : 'error',
              });
            } else if (event === 'error') {
              finishMessage(assistantId, 'error', String(data.message ?? 'stream error'));
            } else if (event === 'done') {
              finishMessage(assistantId, 'done');
            }
          },
          onClose: () => {
            const state = useChatStore.getState();
            const m = state.messages.find((x) => x.id === assistantId);
            if (m && m.status !== 'done' && m.status !== 'error') {
              finishMessage(assistantId, 'done');
            }
            stopStreaming();
          },
          onError: (err) => {
            finishMessage(assistantId, 'error', err.message);
            stopStreaming();
          },
        },
        ctrl.signal
      );
    },
    [
      sessionId,
      isStreaming,
      appendMessage,
      appendText,
      addTurn,
      addToolCall,
      completeToolResult,
      finishMessage,
      startStreaming,
      stopStreaming,
    ]
  );

  const stop = React.useCallback(async () => {
    await cancelStream(sessionId);
    stopStreaming();
    if (currentAssistantId) {
      finishMessage(currentAssistantId, 'done');
    }
  }, [sessionId, currentAssistantId, stopStreaming, finishMessage]);

  return { send, stop, isStreaming };
}
