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
    <div className="flex h-screen bg-bg grid-bg">
      <Sidebar sessions={sessions} currentSessionId={currentSession.id} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-10 shrink-0 items-center border-b border-border/30 bg-surface/40 px-4 glass">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-slow glow-dot" />
            <span className="truncate font-mono text-xs font-medium tracking-wide text-fg/80">
              {currentSession.title}
            </span>
          </div>
        </header>
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}
