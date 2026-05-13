'use client';

import * as React from 'react';

import { Check, ChevronDown, ChevronRight, Loader2, Wrench, X } from 'lucide-react';

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
  const [expanded, setExpanded] = React.useState(false);
  const isRunning = call.status === 'running';
  const isError = call.status === 'error' || !call.ok;

  let indicator: React.ReactNode;
  if (isRunning) {
    indicator = <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />;
  } else if (isError) {
    indicator = <X className="h-3 w-3 text-destructive" />;
  } else {
    indicator = <Check className="h-3 w-3 text-emerald-500" />;
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
        'rounded-md border border-border bg-muted/30 text-xs',
        isError && 'border-destructive/30 bg-destructive/5'
      )}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left hover:bg-muted/50"
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
        )}
        <Wrench className="h-3 w-3 shrink-0 text-muted-foreground" />
        <span className="font-mono font-medium">{call.name}</span>
        <span className="truncate font-mono text-muted-foreground">
          {compactArgs(call.args)}
        </span>
        <span className="ml-auto flex shrink-0 items-center gap-1">
          {indicator}
        </span>
      </button>
      {expanded && (
        <div className="space-y-2 border-t border-border/60 px-2.5 py-2 font-mono">
          <div>
            <div className="mb-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
              args
            </div>
            <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-all rounded bg-bg p-1.5 text-[11px]">
              {argsJson}
            </pre>
          </div>
          {(call.preview || !isRunning) && (
            <div>
              <div className="mb-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                result
              </div>
              <pre
                className={cn(
                  'max-h-56 overflow-auto whitespace-pre-wrap break-all rounded bg-bg p-1.5 text-[11px]',
                  isError && 'text-destructive'
                )}
              >
                {isRunning ? 'running...' : call.preview || '(empty)'}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
