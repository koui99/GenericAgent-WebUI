import { redirect } from 'next/navigation';

import { getServerT } from '@/lib/i18n/server';
import type { Session } from '@/types/session';

const BACKEND = process.env.BACKEND_URL || 'http://127.0.0.1:8000';

async function listSessions(): Promise<Session[]> {
  try {
    const res = await fetch(`${BACKEND}/api/sessions`, { cache: 'no-store' });
    if (!res.ok) return [];
    return (await res.json()) as Session[];
  } catch {
    return [];
  }
}

async function createSession(title: string): Promise<Session | null> {
  try {
    const res = await fetch(`${BACKEND}/api/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as Session;
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const { t } = getServerT();
  const sessions = await listSessions();

  if (sessions.length > 0) {
    redirect(`/chat/${sessions[0].id}`);
  }

  const created = await createSession(t('sidebar.new_chat_title'));
  if (created) {
    redirect(`/chat/${created.id}`);
  }

  const backendUrl = 'http://127.0.0.1:8000';
  const unreachable = t('home.unreachable', { url: backendUrl });
  const parts = unreachable.split(backendUrl);

  return (
    <main className="flex min-h-screen items-center justify-center p-8 grid-bg">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-primary animate-pulse-slow glow-dot" />
          <h1 className="font-mono text-lg font-bold uppercase tracking-widest text-primary glow-text">
            {t('app.name')}
          </h1>
        </div>
        <div className="hud-panel rounded-lg p-4 hud-corner">
          <p className="font-mono text-xs text-muted-foreground">
            {parts[0]}
            <code className="text-primary/80">{backendUrl}</code>
            {parts[1] ?? ''}
          </p>
        </div>
        <a
          href="/settings"
          className="inline-block rounded border border-primary/30 px-4 py-2 font-mono text-xs uppercase tracking-wider text-primary transition-all hover:border-primary/60 hover:bg-primary/10 glow-border"
        >
          {t('home.goto_settings')}
        </a>
      </div>
    </main>
  );
}
