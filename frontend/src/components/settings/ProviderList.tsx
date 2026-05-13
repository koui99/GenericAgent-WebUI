'use client';

import * as React from 'react';

import { Pencil, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
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
  if (providers.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        No providers yet. Click <span className="font-medium text-fg">Add provider</span> to create
        your first one.
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
                aria-label="Active"
              />
              Active
            </label>
            <Button size="icon" variant="ghost" onClick={() => onEdit(p)} aria-label="Edit">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onDelete(p)}
              aria-label="Delete"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
