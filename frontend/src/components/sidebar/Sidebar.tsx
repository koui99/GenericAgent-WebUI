'use client';

import * as React from 'react';

import { Check, Pencil, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Session } from '@/types/session';

interface SessionItemProps {
  session: Session;
  active: boolean;
  onRename: (id: string, title: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

function SessionItem({ session, active, onRename, onDelete }: SessionItemProps) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(session.title);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commitRename = async () => {
    const value = draft.trim();
    if (!value || value === session.title) {
      setEditing(false);
      setDraft(session.title);
      return;
    }
    try {
      await onRename(session.id, value);
    } finally {
      setEditing(false);
    }
  };

  const cancelRename = () => {
    setDraft(session.title);
    setEditing(false);
  };

  if (editing) {
    return (
      <div
        className={cn(
          'flex items-center gap-1 rounded-md border border-primary/40 bg-muted px-2 py-1.5'
        )}
      >
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void commitRename();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              cancelRename();
            }
          }}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={commitRename}
          aria-label="Save rename"
        >
          <Check className="h-3 w-3" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={cancelRename}
          aria-label="Cancel rename"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group flex items-center gap-1 rounded-md px-1 py-1 transition-colors',
        active ? 'bg-muted' : 'hover:bg-muted/60'
      )}
    >
      <Link
        href={`/chat/${session.id}`}
        className="min-w-0 flex-1 truncate px-1.5 py-1 text-sm"
      >
        {session.title || 'Untitled'}
      </Link>
      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={() => setEditing(true)}
          aria-label="Rename session"
        >
          <Pencil className="h-3 w-3" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={() => {
            if (confirm(`Delete session "${session.title}"?`)) {
              void onDelete(session.id);
            }
          }}
          aria-label="Delete session"
        >
          <Trash2 className="h-3 w-3 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

interface SidebarProps {
  sessions: Session[];
  currentSessionId: string;
}

export function Sidebar({ sessions: initialSessions, currentSessionId }: SidebarProps) {
  const router = useRouter();
  const [sessions, setSessions] = React.useState<Session[]>(initialSessions);

  React.useEffect(() => {
    setSessions(initialSessions);
  }, [initialSessions]);

  const refresh = React.useCallback(async () => {
    try {
      const list = await api.get<Session[]>('/api/sessions');
      setSessions(list);
    } catch {}
  }, []);

  const createNew = async () => {
    try {
      const created = await api.post<Session>('/api/sessions', { title: 'New chat' });
      setSessions((prev) => [created, ...prev]);
      router.push(`/chat/${created.id}`);
    } catch (err) {
      alert(`Failed to create session: ${err instanceof Error ? err.message : err}`);
    }
  };

  const rename = async (id: string, title: string) => {
    const updated = await api.patch<Session>(`/api/sessions/${id}`, { title });
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, ...updated } : s)));
  };

  const remove = async (id: string) => {
    try {
      await api.delete(`/api/sessions/${id}`);
    } catch (err) {
      alert(`Failed to delete: ${err instanceof Error ? err.message : err}`);
      return;
    }
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (id === currentSessionId) {
      const remaining = sessions.filter((s) => s.id !== id);
      if (remaining.length > 0) {
        router.push(`/chat/${remaining[0].id}`);
      } else {
        router.push('/');
      }
    }
  };

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-border bg-bg">
      <div className="flex items-center justify-between px-3 py-3">
        <Link href="/" className="font-mono text-sm font-medium">
          GenericAgent
        </Link>
        <Button size="sm" variant="outline" onClick={createNew}>
          New
        </Button>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 pb-2">
        {sessions.length === 0 ? (
          <div className="px-2 py-6 text-center text-xs text-muted-foreground">
            No sessions yet
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {sessions.map((s) => (
              <SessionItem
                key={s.id}
                session={s}
                active={s.id === currentSessionId}
                onRename={rename}
                onDelete={remove}
              />
            ))}
          </div>
        )}
      </nav>
      <div className="flex items-center gap-1 border-t border-border px-2 py-2">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="flex-1 justify-start"
          onClick={() => void refresh()}
        >
          <Link href="/settings">Settings</Link>
        </Button>
        <ThemeToggle />
      </div>
    </aside>
  );
}
