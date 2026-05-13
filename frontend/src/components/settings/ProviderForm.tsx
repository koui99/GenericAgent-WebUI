'use client';

import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { Provider, ProviderCreate } from '@/types/provider';

export type ProviderFormValues = ProviderCreate;

const PROVIDER_PRESETS: Array<{
  value: string;
  label: string;
  api_base: string;
  model: string;
  api_mode: 'chat_completions' | 'anthropic';
}> = [
  {
    value: 'openai',
    label: 'OpenAI',
    api_base: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    api_mode: 'chat_completions',
  },
  {
    value: 'claude',
    label: 'Anthropic (Claude)',
    api_base: 'https://api.anthropic.com/v1',
    model: 'claude-sonnet-4-5-20250929',
    api_mode: 'anthropic',
  },
  {
    value: 'gemini',
    label: 'Google Gemini',
    api_base: 'https://generativelanguage.googleapis.com/v1beta/openai',
    model: 'gemini-2.0-flash',
    api_mode: 'chat_completions',
  },
  {
    value: 'kimi',
    label: 'Moonshot Kimi',
    api_base: 'https://api.moonshot.cn/v1',
    model: 'moonshot-v1-8k',
    api_mode: 'chat_completions',
  },
];

function emptyValues(): ProviderFormValues {
  return {
    key_name: '',
    label: '',
    apikey: '',
    api_base: 'https://api.openai.com/v1',
    provider: 'openai',
    model: 'gpt-4o-mini',
    stream: true,
    api_mode: 'chat_completions',
    temperature: 1.0,
    max_tokens: null,
    reasoning_effort: null,
    service_tier: null,
    connect_timeout: 15,
    read_timeout: 120,
    max_retries: 3,
    extra_params: {},
    supports_vision: false,
    enabled: true,
    is_active: true,
  };
}

function toValues(p: Provider): ProviderFormValues {
  const { id: _id, created_at: _c, updated_at: _u, ...rest } = p;
  void _id;
  void _c;
  void _u;
  return rest;
}

interface ProviderFormProps {
  initial?: Provider | null;
  onSubmit: (values: ProviderFormValues) => Promise<void>;
  onCancel: () => void;
}

export function ProviderForm({ initial, onSubmit, onCancel }: ProviderFormProps) {
  const [values, setValues] = React.useState<ProviderFormValues>(() =>
    initial ? toValues(initial) : emptyValues()
  );
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const update = <K extends keyof ProviderFormValues>(key: K, v: ProviderFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: v }));
  };

  const applyPreset = (preset: string) => {
    const match = PROVIDER_PRESETS.find((p) => p.value === preset);
    if (!match) return;
    setValues((prev) => ({
      ...prev,
      provider: match.value,
      api_base: match.api_base,
      model: match.model,
      api_mode: match.api_mode,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(values);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="key_name">Key name</Label>
          <Input
            id="key_name"
            value={values.key_name}
            onChange={(e) => update('key_name', e.target.value)}
            placeholder="gpt4o"
            disabled={!!initial}
            required
          />
          <p className="text-xs text-muted-foreground">Unique id inside llmcore.mykeys</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="label">Display label</Label>
          <Input
            id="label"
            value={values.label}
            onChange={(e) => update('label', e.target.value)}
            placeholder="GPT-4o mini"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Provider</Label>
        <div className="flex flex-wrap gap-2">
          {PROVIDER_PRESETS.map((p) => (
            <Button
              key={p.value}
              type="button"
              size="sm"
              variant={values.provider === p.value ? 'default' : 'outline'}
              onClick={() => applyPreset(p.value)}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="apikey">API key</Label>
        <Input
          id="apikey"
          type="password"
          autoComplete="off"
          value={values.apikey}
          onChange={(e) => update('apikey', e.target.value)}
          placeholder="sk-..."
          required
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="api_base">API base</Label>
          <Input
            id="api_base"
            value={values.api_base}
            onChange={(e) => update('api_base', e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="model">Model</Label>
          <Input
            id="model"
            value={values.model}
            onChange={(e) => update('model', e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="api_mode">API mode</Label>
          <Input
            id="api_mode"
            value={values.api_mode}
            onChange={(e) => update('api_mode', e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="temperature">Temperature</Label>
          <Input
            id="temperature"
            type="number"
            step={0.1}
            min={0}
            max={2}
            value={values.temperature ?? ''}
            onChange={(e) =>
              update('temperature', e.target.value === '' ? null : Number(e.target.value))
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="max_tokens">Max tokens</Label>
          <Input
            id="max_tokens"
            type="number"
            min={1}
            value={values.max_tokens ?? ''}
            onChange={(e) =>
              update('max_tokens', e.target.value === '' ? null : Number(e.target.value))
            }
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-6 pt-2">
        <label className="flex items-center gap-2 text-sm">
          <Switch
            checked={values.stream}
            onCheckedChange={(v) => update('stream', v)}
          />
          Stream
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Switch
            checked={values.supports_vision}
            onCheckedChange={(v) => update('supports_vision', v)}
          />
          Vision
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Switch
            checked={values.is_active}
            onCheckedChange={(v) => update('is_active', v)}
          />
          Active
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Switch
            checked={values.enabled}
            onCheckedChange={(v) => update('enabled', v)}
          />
          Enabled
        </label>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving...' : initial ? 'Save changes' : 'Create'}
        </Button>
      </div>
    </form>
  );
}
