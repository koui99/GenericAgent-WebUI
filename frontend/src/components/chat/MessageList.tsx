'use client';

import * as React from 'react';

import { MessageBubble } from './MessageBubble';

import type { UIMessage } from '@/types/chat';

export function MessageList({ messages }: { messages: UIMessage[] }) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const stickRef = React.useRef(true);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (stickRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    stickRef.current = nearBottom;
  };

  if (messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Start a conversation below.
      </div>
    );
  }

  return (
    <div
      ref={ref}
      onScroll={onScroll}
      className="flex-1 overflow-y-auto px-4 py-6"
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
      </div>
    </div>
  );
}
