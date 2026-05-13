import * as React from 'react';

import { Sidebar } from '@/components/sidebar/Sidebar';
import type { Session } from '@/types/session';

interface ChatShellProps {
  sessions: Session[];
  currentSession: Session;
  children: React.ReactNode;
}

export function ChatShell({ sessions, currentSession, children }: ChatShellProps) {
  return (
    <div className="flex h-screen">
      <Sidebar sessions={sessions} currentSessionId={currentSession.id} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center border-b border-border px-4">
          <span className="truncate text-sm font-medium">{currentSession.title}</span>
        </header>
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}
