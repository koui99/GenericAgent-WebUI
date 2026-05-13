'use client';

import * as React from 'react';

import { Check, Pencil, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { LanguageToggle } from '@/components/layout/LanguageToggle';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useT } from '@/lib/i18n/provider';
import { cn } from '@/lib/utils';
import type { Session } from '@/types/session';

interface SessionItemProps {
  session: Session;
  active: boolean;
  onRename: (id: string, title: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

function SessionItem({ session, active, onRename, onDelete }: SessionItemProps) {
  const { t } = useT();
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
      <div className="flex items-center gap-1 rounded border border-primary/40 bg-surface/60 px-2 py-1.5">
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
          className="min-w-0 flex-1 bg-transparent font-mono text-xs outline-none"
        />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-5 w-5"
          onClick={commitRename}
          aria-label={t('sidebar.rename_save')}
        >
          <Check className="h-3 w-3 text-primary" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-5 w-5"
          onClick={cancelRename}
          aria-label={t('sidebar.rename_cancel')}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group relative flex items-center rounded transition-all duration-200',
        active
          ? 'border border-primary/30 bg-primary/10 glow-border'
          : 'border border-transparent hover:border-primary/15 hover:bg-primary/5'
      )}
    >
      {active && (
        <div className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-r bg-primary glow-dot" />
      )}
      <Link
        href={`/chat/${session.id}`}
        className="min-w-0 flex-1 truncate px-2.5 py-1.5 font-mono text-xs"
      >
        {session.title || t('sidebar.untitled')}
      </Link>
      <div className="flex shrink-0 items-center gap-0.5 pr-1 opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-5 w-5"
          onClick={() => setEditing(true)}
          aria-label={t('sidebar.rename_action')}
        >
          <Pencil className="h-2.5 w-2.5" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-5 w-5"
          onClick={() => {
            if (confirm(t('sidebar.delete_confirm', { title: session.title }))) {
              void onDelete(session.id);
            }
          }}
          aria-label={t('sidebar.delete_action')}
        >
          <Trash2 className="h-2.5 w-2.5 text-destructive" />
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
  const { t } = useT();
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
      const created = await api.post<Session>('/api/sessions', {
        title: t('sidebar.new_chat_title'),
      });
      setSessions((prev) => [created, ...prev]);
      router.push(`/chat/${created.id}`);
    } catch (err) {
      alert(t('sidebar.create_failed', { error: err instanceof Error ? err.message : String(err) }));
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
      alert(t('sidebar.delete_failed', { error: err instanceof Error ? err.message : String(err) }));
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
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-border/40 bg-sidebar-bg/90 scanline">
      <div className="flex items-center justify-between border-b border-border/30 px-3 py-3">
        <Link href="/" className="font-mono text-xs font-bold uppercase tracking-widest text-primary glow-text">
          GenericAgent
        </Link>
        <Button
          size="sm"
          variant="outline"
          onClick={createNew}
          className="h-6 rounded border-primary/30 px-2 font-mono text-[10px] uppercase tracking-wider text-primary transition-all hover:border-primary/50 hover:bg-primary/10"
        >
          {t('sidebar.new')}
        </Button>
      </div>

      <div className="terminal-header">
        <span>sessions</span>
        <span className="ml-auto tabular-nums">{sessions.length}</span>
      </div>

      <nav className="scrollbar-thin flex-1 overflow-y-auto px-2 py-2">
        {sessions.length === 0 ? (
          <div className="px-2 py-8 text-center font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            {t('sidebar.empty')}
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

      <div className="flex items-center gap-1 border-t border-border/30 px-2 py-2">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="flex-1 justify-start font-mono text-[10px] uppercase tracking-wider"
          onClick={() => void refresh()}
        >
          <Link href="/settings">{t('sidebar.settings')}</Link>
        </Button>
        <LanguageToggle />
        <ThemeToggle />
      </div>
    </aside>
  );
}
