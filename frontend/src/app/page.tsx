import { redirect } from 'next/navigation';

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

async function createSession(): Promise<Session | null> {
  try {
    const res = await fetch(`${BACKEND}/api/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'New chat' }),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as Session;
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const sessions = await listSessions();

  if (sessions.length > 0) {
    redirect(`/chat/${sessions[0].id}`);
  }

  const created = await createSession();
  if (created) {
    redirect(`/chat/${created.id}`);
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-md space-y-4 text-center">
        <h1 className="text-xl font-semibold tracking-tight">GenericAgent WebUI</h1>
        <p className="text-sm text-muted-foreground">
          Backend unreachable. Start the API at <code>http://127.0.0.1:8000</code>, then refresh.
        </p>
        <a
          href="/settings"
          className="inline-block rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
        >
          Go to Settings
        </a>
      </div>
    </main>
  );
}
