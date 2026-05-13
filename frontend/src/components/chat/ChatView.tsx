'use client';

import * as React from 'react';

import { useChatStream } from '@/hooks/useChatStream';
import { useT } from '@/lib/i18n/provider';
import { useChatStore } from '@/store/chat-store';
import type { UIMessage } from '@/types/chat';

import { InputBox } from './InputBox';
import { MessageList } from './MessageList';

interface ChatViewProps {
  sessionId: string;
  initialMessages: UIMessage[];
  hasActiveProvider: boolean;
}

export function ChatView({ sessionId, initialMessages, hasActiveProvider }: ChatViewProps) {
  const { t } = useT();
  const { messages, setMessages, reset } = useChatStore();
  const { send, stop, isStreaming } = useChatStream(sessionId);

  React.useEffect(() => {
    reset();
    setMessages(initialMessages);
  }, [sessionId, initialMessages, reset, setMessages]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <MessageList messages={messages} />
      {!hasActiveProvider && messages.length === 0 && (
        <div className="border-t border-border bg-muted/30 px-4 py-3 text-center text-sm text-muted-foreground">
          {t('chat.no_provider_prefix')}{' '}
          <a className="underline underline-offset-4 hover:text-fg" href="/settings">
            {t('chat.no_provider_link')}
          </a>{' '}
          {t('chat.no_provider_suffix')}
        </div>
      )}
      <InputBox
        sessionId={sessionId}
        onSend={send}
        onStop={stop}
        isStreaming={isStreaming}
        disabled={!hasActiveProvider}
        placeholder={hasActiveProvider ? t('chat.placeholder') : t('chat.placeholder_no_provider')}
      />
    </div>
  );
}
