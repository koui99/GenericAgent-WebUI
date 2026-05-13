'use client';

import * as React from 'react';

import { ArrowLeft, Plus } from 'lucide-react';
import Link from 'next/link';

import { ProviderForm, type ProviderFormValues } from '@/components/settings/ProviderForm';
import { ProviderList } from '@/components/settings/ProviderList';
import { ToolToggleList } from '@/components/settings/ToolToggleList';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useProviderStore } from '@/store/provider-store';
import type { Provider } from '@/types/provider';

export default function SettingsPage() {
  const { providers, setProviders, upsertProvider, removeProvider } = useProviderStore();
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState<Provider | null | undefined>(undefined);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await api.get<Provider[]>('/api/providers');
        if (!cancelled) setProviders(list);
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setProviders]);

  const handleCreate = async (values: ProviderFormValues) => {
    const created = await api.post<Provider>('/api/providers', values);
    upsertProvider(created);
    setEditing(undefined);
  };

  const handleUpdate = async (id: string, values: ProviderFormValues) => {
    const { key_name: _k, ...patch } = values;
    void _k;
    const updated = await api.patch<Provider>(`/api/providers/${id}`, patch);
    upsertProvider(updated);
    setEditing(undefined);
  };

  const handleDelete = async (p: Provider) => {
    if (!confirm(`Delete provider "${p.label || p.key_name}"?`)) return;
    await api.delete(`/api/providers/${p.id}`);
    removeProvider(p.id);
  };

  const handleToggleActive = async (p: Provider, isActive: boolean) => {
    const updated = await api.patch<Provider>(`/api/providers/${p.id}`, { is_active: isActive });
    upsertProvider(updated);
  };

  return (
    <main className="min-h-screen bg-bg">
      <header className="flex h-14 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" aria-label="Back">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-sm font-semibold">Settings</h1>
        </div>
        <ThemeToggle />
      </header>

      <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-8">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Providers</h2>
              <p className="text-xs text-muted-foreground">
                API keys and model configs. Synced into llmcore on save.
              </p>
            </div>
            {editing === undefined && (
              <Button size="sm" onClick={() => setEditing(null)}>
                <Plus className="h-4 w-4" /> Add provider
              </Button>
            )}
          </div>

          {editing !== undefined ? (
            <div className="rounded-lg border border-border p-4">
              <h3 className="mb-4 text-sm font-medium">
                {editing ? `Edit ${editing.label || editing.key_name}` : 'New provider'}
              </h3>
              <ProviderForm
                initial={editing}
                onCancel={() => setEditing(undefined)}
                onSubmit={(v) => (editing ? handleUpdate(editing.id, v) : handleCreate(v))}
              />
            </div>
          ) : loading ? (
            <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
              Loading...
            </div>
          ) : loadError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              {loadError}
            </div>
          ) : (
            <ProviderList
              providers={providers}
              onEdit={(p) => setEditing(p)}
              onDelete={handleDelete}
              onToggleActive={handleToggleActive}
            />
          )}
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-base font-semibold">Tools</h2>
            <p className="text-xs text-muted-foreground">
              Enable or disable individual GenericAgent tools for this UI.
            </p>
          </div>
          <ToolToggleList />
        </section>
      </div>
    </main>
  );
}
