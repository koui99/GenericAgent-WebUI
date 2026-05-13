'use client';

import * as React from 'react';

import { useT } from '@/lib/i18n/provider';
import { cn } from '@/lib/utils';
import type { UIMessage } from '@/types/chat';

import { ToolCallCard } from './ToolCallCard';

function StreamingCursor() {
  return (
    <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-fg/60 align-middle" />
  );
}

function ThinkingIndicator({ hint }: { hint?: string }) {
  const { t } = useT();
  const [elapsed, setElapsed] = React.useState(0);

  React.useEffect(() => {
    setElapsed(0);
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [hint]);

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span className="flex gap-0.5">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:0ms]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:150ms]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:300ms]" />
      </span>
      <span>{hint || t('chat.thinking')}</span>
      {elapsed > 0 && (
        <span className="tabular-nums text-xs opacity-60">{elapsed}s</span>
      )}
    </div>
  );
}

export function MessageBubble({ message }: { message: UIMessage }) {
  const { t } = useT();
  const isUser = message.role === 'user';
  const isStreaming = message.status === 'streaming' || message.status === 'pending';
  const lastTextIdx = (() => {
    for (let i = message.timeline.length - 1; i >= 0; i--) {
      if (message.timeline[i].kind === 'text') return i;
    }
    return -1;
  })();

  const thinkingHint = (() => {
    if (isUser || !isStreaming) return null;
    if (message.timeline.length === 0) return t('chat.thinking');
    const last = message.timeline[message.timeline.length - 1];
    if (last.kind === 'text') return null;
    if (last.kind === 'tool') {
      const tool = message.tools[last.toolId];
      if (tool?.status === 'running') return null;
      return t('chat.thinking_after_tool', { name: tool?.name ?? '' });
    }
    if (last.kind === 'turn') {
      return t('chat.thinking_turn', { n: last.turn });
    }
    return t('chat.thinking');
  })();

  return (
    <div className={cn('group flex w-full', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] space-y-2 rounded-xl text-sm leading-relaxed',
          isUser ? 'bg-accent px-4 py-3 text-fg' : 'bg-transparent text-fg'
        )}
      >
        {message.attachmentIds.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {message.attachmentIds.map((id) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={id}
                src={`/api/attachments/${id}/file`}
                alt="attachment"
                className="max-h-48 max-w-[240px] rounded-md border border-border object-contain"
              />
            ))}
          </div>
        )}

        {message.timeline.length > 0 && (
          <div className="flex flex-col gap-2">
            {message.timeline.map((item, i) => {
              if (item.kind === 'turn') {
                return (
                  <div
                    key={`turn-${i}`}
                    className="text-[10px] uppercase tracking-wide text-muted-foreground"
                  >
                    {t('chat.turn', { n: item.turn })}
                  </div>
                );
              }
              if (item.kind === 'tool') {
                const call = message.tools[item.toolId];
                if (!call) return null;
                return <ToolCallCard key={`tool-${item.toolId}-${i}`} call={call} />;
              }
              return (
                <div key={`text-${i}`} className="whitespace-pre-wrap break-words">
                  {item.text}
                  {isStreaming && i === lastTextIdx && <StreamingCursor />}
                </div>
              );
            })}
          </div>
        )}

        {thinkingHint && <ThinkingIndicator hint={thinkingHint} />}

        {message.status === 'error' && (
          <div className="rounded-md bg-destructive/10 px-2 py-1 text-xs text-destructive">
            {message.errorMessage || t('chat.default_error')}
          </div>
        )}
      </div>
    </div>
  );
}
