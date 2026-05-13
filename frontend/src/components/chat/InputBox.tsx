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
  placeholder = 'Send a message...',
}: InputBoxProps) {
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
    <div className="border-t border-border bg-bg px-4 py-4">
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
                className="group relative h-16 w-16 overflow-hidden rounded-md border border-border bg-muted"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={att.previewUrl}
                  alt={att.name}
                  className="h-full w-full object-cover"
                />
                {(att.status === 'compressing' || att.status === 'uploading') && (
                  <div className="absolute inset-0 flex items-center justify-center bg-bg/60">
                    <Loader2 className="h-4 w-4 animate-spin text-fg" />
                  </div>
                )}
                {att.status === 'error' && (
                  <div
                    className="absolute inset-0 flex items-center justify-center bg-destructive/30 text-[10px] text-destructive"
                    title={att.error || 'Error'}
                  >
                    err
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => remove(att.clientId)}
                  aria-label="Remove attachment"
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
            'flex items-end gap-2 rounded-xl border border-border bg-bg p-2 transition-colors focus-within:border-fg/40',
            dragOver && 'border-primary bg-primary/5'
          )}
        >
          <Button
            size="icon"
            variant="ghost"
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isStreaming}
            aria-label="Attach image"
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
            placeholder={placeholder}
            rows={1}
            disabled={disabled}
            className="min-h-0 flex-1 border-0 bg-transparent p-2 shadow-none focus-visible:ring-0"
          />
          {isStreaming ? (
            <Button
              size="icon"
              variant="subtle"
              onClick={onStop}
              aria-label="Stop generating"
            >
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              size="icon"
              onClick={submit}
              disabled={!canSend}
              aria-label="Send message"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="mt-2 text-center text-xs text-muted-foreground">
          {busy
            ? 'Preparing attachments...'
            : dragOver
              ? 'Drop images to attach'
              : 'Enter to send · Shift+Enter for newline · paste or drop images'}
        </div>
      </div>
    </div>
  );
}
