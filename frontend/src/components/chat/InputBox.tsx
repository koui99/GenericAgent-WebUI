'use client';

import * as React from 'react';

import { ArrowUp, Image as ImageIcon, Loader2, Square, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  extractImageFilesFromClipboard,
  extractImageFilesFromDrag,
  useAttachments,
} from '@/hooks/useAttachments';
import { useT } from '@/lib/i18n/provider';
import { cn } from '@/lib/utils';

interface InputBoxProps {
  sessionId: string;
  onSend: (text: string, attachmentIds: string[]) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export function InputBox({
  sessionId,
  onSend,
  onStop,
  isStreaming,
  disabled,
  placeholder,
}: InputBoxProps) {
  const { t } = useT();
  const effectivePlaceholder = placeholder ?? t('chat.placeholder');
  const [text, setText] = React.useState('');
  const [dragOver, setDragOver] = React.useState(false);
  const taRef = React.useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const { items, addFiles, remove, clear, readyIds, busy } = useAttachments(sessionId);

  const autoResize = React.useCallback(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
  }, []);

  React.useEffect(() => {
    autoResize();
  }, [text, autoResize]);

  const canSend = (text.trim().length > 0 || readyIds.length > 0) && !busy && !disabled;

  const submit = () => {
    if (!canSend) return;
    onSend(text.trim(), readyIds);
    setText('');
    clear();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (isStreaming) return;
      submit();
    }
  };

  const onPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const files = extractImageFilesFromClipboard(e);
    if (files.length > 0) {
      e.preventDefault();
      void addFiles(files);
    }
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const files = extractImageFilesFromDrag(e);
    if (files.length > 0) void addFiles(files);
  };

  const onFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      void addFiles(e.target.files);
    }
    e.target.value = '';
  };

  return (
    <div className="border-t border-border/30 bg-surface/40 px-4 py-4 glass">
      <div
        className="mx-auto w-full max-w-3xl"
        onDragEnter={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
          setDragOver(false);
        }}
        onDrop={onDrop}
      >
        {items.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {items.map((att) => (
              <div
                key={att.clientId}
                className="group relative h-16 w-16 overflow-hidden rounded border border-primary/20 bg-surface/60"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={att.previewUrl}
                  alt={att.name}
                  className="h-full w-full object-cover"
                />
                {(att.status === 'compressing' || att.status === 'uploading') && (
                  <div className="absolute inset-0 flex items-center justify-center bg-bg/60">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  </div>
                )}
                {att.status === 'error' && (
                  <div
                    className="absolute inset-0 flex items-center justify-center bg-destructive/20 font-mono text-[10px] text-destructive"
                    title={att.error || t('chat.attachment_error')}
                  >
                    {t('chat.attachment_error_short')}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => remove(att.clientId)}
                  aria-label={t('chat.remove_attachment')}
                  className="absolute right-0.5 top-0.5 rounded-full bg-bg/80 p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div
          className={cn(
            'flex items-end gap-2 rounded-lg border bg-surface/30 p-2.5 transition-all hud-corner',
            dragOver
              ? 'border-primary/60 bg-primary/5 glow-border-active'
              : 'border-border/40 glow-border focus-within:glow-border-active'
          )}
        >
          <Button
            size="icon"
            variant="ghost"
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isStreaming}
            aria-label={t('chat.attach')}
            className="text-muted-foreground hover:text-primary"
          >
            <ImageIcon className="h-4 w-4" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={onFilePick}
          />
          <Textarea
            ref={taRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            placeholder={effectivePlaceholder}
            rows={1}
            disabled={disabled}
            className="min-h-0 flex-1 border-0 bg-transparent p-2 shadow-none focus-visible:ring-0"
          />
          {isStreaming ? (
            <Button
              size="icon"
              variant="ghost"
              onClick={onStop}
              aria-label={t('chat.stop')}
              className="text-destructive hover:bg-destructive/10"
            >
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              size="icon"
              onClick={submit}
              disabled={!canSend}
              aria-label={t('chat.send')}
              className="bg-primary/20 text-primary hover:bg-primary/30 disabled:opacity-30"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="mt-2 text-center font-mono text-[10px] uppercase tracking-wider text-muted-foreground/60">
          {busy ? t('chat.preparing') : dragOver ? t('chat.drop_here') : t('chat.hint')}
        </div>
      </div>
    </div>
  );
}
