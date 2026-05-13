'use client';

import * as React from 'react';

import { Check, ChevronDown, ChevronRight, Loader2, Terminal, X } from 'lucide-react';

import { useT } from '@/lib/i18n/provider';
import { cn } from '@/lib/utils';
import type { UIToolCall } from '@/types/chat';

function compactArgs(args: Record<string, unknown>): string {
  const cleaned = Object.fromEntries(
    Object.entries(args).filter(([k]) => !k.startsWith('_'))
  );
  try {
    const s = JSON.stringify(cleaned, null, 0);
    return s.length > 80 ? s.slice(0, 80) + '…' : s;
  } catch {
    return '{}';
  }
}

export function ToolCallCard({ call }: { call: UIToolCall }) {
  const { t } = useT();
  const [expanded, setExpanded] = React.useState(false);
  const isRunning = call.status === 'running';
  const isError = call.status === 'error' || !call.ok;

  let indicator: React.ReactNode;
  if (isRunning) {
    indicator = <Loader2 className="h-3 w-3 animate-spin text-primary" />;
  } else if (isError) {
    indicator = <X className="h-3 w-3 text-destructive" />;
  } else {
    indicator = <Check className="h-3 w-3 text-emerald-400" />;
  }

  let argsJson = '{}';
  try {
    argsJson = JSON.stringify(
      Object.fromEntries(
        Object.entries(call.args).filter(([k]) => !k.startsWith('_'))
      ),
      null,
      2
    );
  } catch {}

  return (
    <div
      className={cn(
        'overflow-hidden rounded border text-xs',
        isError
          ? 'border-destructive/30 bg-destructive/5'
          : isRunning
            ? 'border-primary/30 bg-primary/5 breathing-glow'
            : 'border-border/40 bg-surface/40'
      )}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left transition-colors hover:bg-primary/5"
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
        )}
        <Terminal className="h-3 w-3 shrink-0 text-primary/70" />
        <span className="font-mono font-medium text-primary/90">{call.name}</span>
        <span className="truncate font-mono text-muted-foreground/70">
          {compactArgs(call.args)}
        </span>
        <span className="ml-auto flex shrink-0 items-center gap-1">
          {indicator}
        </span>
      </button>
      {expanded && (
        <div className="space-y-2 border-t border-border/30 px-2.5 py-2 font-mono">
          <div>
            <div className="terminal-header !border-0 !px-0 !py-0 mb-1">
              <span>{t('tool.args')}</span>
            </div>
            <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-all rounded border border-border/20 bg-bg/80 p-2 text-[11px] text-fg/80">
              {argsJson}
            </pre>
          </div>
          {(call.preview || !isRunning) && (
            <div>
              <div className="terminal-header !border-0 !px-0 !py-0 mb-1">
                <span>{t('tool.result')}</span>
              </div>
              <pre
                className={cn(
                  'max-h-56 overflow-auto whitespace-pre-wrap break-all rounded border border-border/20 bg-bg/80 p-2 text-[11px]',
                  isError ? 'text-destructive' : 'text-fg/80'
                )}
              >
                {isRunning ? t('tool.running') : call.preview || t('tool.empty')}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
