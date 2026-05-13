'use client';

import * as React from 'react';

import { Switch } from '@/components/ui/switch';
import { api } from '@/lib/api';
import type { ToolItem } from '@/types/tool';

export function ToolToggleList() {
  const [tools, setTools] = React.useState<ToolItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await api.get<ToolItem[]>('/api/tools');
        if (!cancelled) setTools(list);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = async (name: string, enabled: boolean) => {
    setTools((prev) =>
      prev.map((t) => (t.name === name ? { ...t, enabled } : t))
    );
    setPending((prev) => new Set(prev).add(name));
    try {
      const updated = await api.patch<ToolItem>(
        `/api/tools/${encodeURIComponent(name)}`,
        { enabled }
      );
      setTools((prev) => prev.map((t) => (t.name === name ? updated : t)));
    } catch (err) {
      setTools((prev) =>
        prev.map((t) => (t.name === name ? { ...t, enabled: !enabled } : t))
      );
      alert(`Failed to toggle ${name}: ${err instanceof Error ? err.message : err}`);
    } finally {
      setPending((prev) => {
        const next = new Set(prev);
        next.delete(name);
        return next;
      });
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
        Loading tools...
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        {error}
      </div>
    );
  }
  if (tools.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        No tools exposed by GenericAgent.
      </div>
    );
  }

  return (
    <div className="divide-y divide-border rounded-lg border border-border">
      {tools.map((t) => (
        <div key={t.name} className="flex items-start gap-4 px-4 py-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-sm font-medium">{t.name}</span>
            </div>
            {t.description && (
              <p className="mt-0.5 text-xs text-muted-foreground">{t.description}</p>
            )}
          </div>
          <Switch
            checked={t.enabled}
            disabled={pending.has(t.name)}
            onCheckedChange={(v) => toggle(t.name, v)}
            aria-label={`Toggle ${t.name}`}
          />
        </div>
      ))}
    </div>
  );
}
