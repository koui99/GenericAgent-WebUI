'use client';

import * as React from 'react';

import { Pencil, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useT } from '@/lib/i18n/provider';
import type { Provider } from '@/types/provider';

interface ProviderListProps {
  providers: Provider[];
  onEdit: (p: Provider) => void;
  onDelete: (p: Provider) => void;
  onToggleActive: (p: Provider, isActive: boolean) => void;
}

function maskKey(key: string): string {
  if (!key) return '';
  if (key.length <= 8) return '••••';
  return `${key.slice(0, 4)}••••${key.slice(-4)}`;
}

export function ProviderList({ providers, onEdit, onDelete, onToggleActive }: ProviderListProps) {
  const { t } = useT();

  if (providers.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        {t('settings.providers_empty_prefix')}{' '}
        <span className="font-medium text-fg">{t('settings.add_provider')}</span>{' '}
        {t('settings.providers_empty_suffix')}
      </div>
    );
  }

  return (
    <div className="divide-y divide-border rounded-lg border border-border">
      {providers.map((p) => (
        <div key={p.id} className="flex items-center gap-4 px-4 py-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="truncate font-medium">{p.label || p.key_name}</span>
              <span className="font-mono text-xs text-muted-foreground">{p.key_name}</span>
            </div>
            <div className="mt-0.5 truncate text-xs text-muted-foreground">
              {p.provider} · {p.model} · <span className="font-mono">{maskKey(p.apikey)}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Switch
                checked={p.is_active}
                onCheckedChange={(v) => onToggleActive(p, v)}
                aria-label={t('settings.provider_active')}
              />
              {t('settings.provider_active')}
            </label>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onEdit(p)}
              aria-label={t('settings.provider_edit')}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onDelete(p)}
              aria-label={t('settings.provider_delete')}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
