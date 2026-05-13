'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';
import type { UIMessage } from '@/types/chat';

import { ToolCallCard } from './ToolCallCard';

function StreamingCursor() {
  return (
    <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-fg/60 align-middle" />
  );
}

export function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === 'user';
  const isStreaming = message.status === 'streaming' || message.status === 'pending';
  const lastTextIdx = (() => {
    for (let i = message.timeline.length - 1; i >= 0; i--) {
      if (message.timeline[i].kind === 'text') return i;
    }
    return -1;
  })();

  const showLoadingDot =
    !isUser &&
    isStreaming &&
    message.timeline.length === 0 &&
    message.attachmentIds.length === 0;

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
                    Turn {item.turn}
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

        {showLoadingDot && (
          <div className="text-muted-foreground">
            <StreamingCursor />
          </div>
        )}

        {message.status === 'error' && (
          <div className="rounded-md bg-destructive/10 px-2 py-1 text-xs text-destructive">
            {message.errorMessage || 'Something went wrong.'}
          </div>
        )}
      </div>
    </div>
  );
}
