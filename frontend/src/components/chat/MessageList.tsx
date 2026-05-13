'use client';

import * as React from 'react';

import { useT } from '@/lib/i18n/provider';

import { MessageBubble } from './MessageBubble';

import type { UIMessage } from '@/types/chat';

export function MessageList({ messages }: { messages: UIMessage[] }) {
  const { t } = useT();
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
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <div className="h-2 w-2 rounded-full bg-primary/50 animate-pulse-slow glow-dot" />
        <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground/60">
          {t('chat.empty')}
        </span>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      onScroll={onScroll}
      className="flex-1 overflow-y-auto px-4 py-6 scrollbar-thin"
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
      </div>
    </div>
  );
}
