'use client';

import * as React from 'react';

import { ArrowLeft, Plus } from 'lucide-react';
import Link from 'next/link';

import { LanguageToggle } from '@/components/layout/LanguageToggle';
import { ProviderForm, type ProviderFormValues } from '@/components/settings/ProviderForm';
import { ProviderList } from '@/components/settings/ProviderList';
import { ToolToggleList } from '@/components/settings/ToolToggleList';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useT } from '@/lib/i18n/provider';
import { useProviderStore } from '@/store/provider-store';
import type { Provider } from '@/types/provider';

export default function SettingsPage() {
  const { t } = useT();
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
    if (!confirm(t('settings.provider_delete_confirm', { label: p.label || p.key_name }))) return;
    await api.delete(`/api/providers/${p.id}`);
    removeProvider(p.id);
  };

  const handleToggleActive = async (p: Provider, isActive: boolean) => {
    const updated = await api.patch<Provider>(`/api/providers/${p.id}`, { is_active: isActive });
    upsertProvider(updated);
  };

  return (
    <main className="min-h-screen bg-bg grid-bg">
      <header className="flex h-12 items-center justify-between border-b border-border/30 bg-surface/40 px-4 glass">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" aria-label={t('settings.back')} className="text-primary hover:bg-primary/10">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="font-mono text-xs font-bold uppercase tracking-widest text-fg/80">{t('settings.title')}</h1>
        </div>
        <div className="flex items-center gap-1">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-8">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-mono text-sm font-semibold uppercase tracking-wide">{t('settings.providers_heading')}</h2>
              <p className="text-xs text-muted-foreground">
                {t('settings.providers_description')}
              </p>
            </div>
            {editing === undefined && (
              <Button size="sm" onClick={() => setEditing(null)} className="border-primary/30 bg-primary/10 font-mono text-xs uppercase tracking-wider text-primary hover:bg-primary/20">
                <Plus className="h-4 w-4" /> {t('settings.add_provider')}
              </Button>
            )}
          </div>

          {editing !== undefined ? (
            <div className="hud-panel rounded-lg p-4 hud-corner">
              <h3 className="mb-4 font-mono text-xs font-medium uppercase tracking-wider text-primary/80">
                {editing
                  ? t('settings.edit_provider', { label: editing.label || editing.key_name })
                  : t('settings.new_provider')}
              </h3>
              <ProviderForm
                initial={editing}
                onCancel={() => setEditing(undefined)}
                onSubmit={(v) => (editing ? handleUpdate(editing.id, v) : handleCreate(v))}
              />
            </div>
          ) : loading ? (
            <div className="hud-panel rounded-lg p-4 font-mono text-xs text-muted-foreground">
              {t('settings.providers_loading')}
            </div>
          ) : loadError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 font-mono text-xs text-destructive">
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
            <h2 className="font-mono text-sm font-semibold uppercase tracking-wide">{t('settings.tools_heading')}</h2>
            <p className="text-xs text-muted-foreground">{t('settings.tools_description')}</p>
          </div>
          <ToolToggleList />
        </section>
      </div>
    </main>
  );
}
