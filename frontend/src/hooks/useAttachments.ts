'use client';

import * as React from 'react';

import { uploadAttachment } from '@/lib/attachments';
import { compressImage } from '@/lib/image-compress';
import type { PendingAttachment } from '@/types/attachment';

const MAX_ATTACHMENTS = 10;

function uid() {
  return (
    globalThis.crypto?.randomUUID?.() ?? `att-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

export function useAttachments(sessionId: string | null) {
  const [items, setItems] = React.useState<PendingAttachment[]>([]);
  const revokeRefs = React.useRef<string[]>([]);

  React.useEffect(() => {
    return () => {
      for (const url of revokeRefs.current) {
        try {
          URL.revokeObjectURL(url);
        } catch {}
      }
      revokeRefs.current = [];
    };
  }, []);

  const update = React.useCallback(
    (clientId: string, patch: Partial<PendingAttachment>) => {
      setItems((prev) => prev.map((a) => (a.clientId === clientId ? { ...a, ...patch } : a)));
    },
    []
  );

  const addFile = React.useCallback(
    async (file: File | Blob, name?: string) => {
      const clientId = uid();
      const previewUrl = URL.createObjectURL(file);
      revokeRefs.current.push(previewUrl);

      setItems((prev) => {
        if (prev.length >= MAX_ATTACHMENTS) return prev;
        return [
          ...prev,
          {
            clientId,
            previewUrl,
            name: name || (file instanceof File ? file.name : 'image'),
            status: 'compressing',
            uploaded: null,
            error: null,
          },
        ];
      });

      try {
        const compressed = await compressImage(file);
        update(clientId, { status: 'uploading' });
        const uploaded = await uploadAttachment(compressed, sessionId);
        update(clientId, { status: 'ready', uploaded });
      } catch (err) {
        update(clientId, {
          status: 'error',
          error: err instanceof Error ? err.message : String(err),
        });
      }
    },
    [sessionId, update]
  );

  const addFiles = React.useCallback(
    async (files: FileList | File[] | Blob[]) => {
      const arr = Array.from(files);
      for (const f of arr) {
        if (!f || !f.type || !f.type.startsWith('image/')) continue;
        await addFile(f as File);
      }
    },
    [addFile]
  );

  const remove = React.useCallback((clientId: string) => {
    setItems((prev) => {
      const target = prev.find((a) => a.clientId === clientId);
      if (target) {
        try {
          URL.revokeObjectURL(target.previewUrl);
        } catch {}
      }
      return prev.filter((a) => a.clientId !== clientId);
    });
  }, []);

  const clear = React.useCallback(() => {
    setItems((prev) => {
      for (const a of prev) {
        try {
          URL.revokeObjectURL(a.previewUrl);
        } catch {}
      }
      return [];
    });
  }, []);

  const readyIds = React.useMemo(
    () => items.filter((a) => a.status === 'ready' && a.uploaded).map((a) => a.uploaded!.id),
    [items]
  );

  const busy = items.some((a) => a.status === 'compressing' || a.status === 'uploading');

  return { items, addFile, addFiles, remove, clear, readyIds, busy };
}

export function extractImageFilesFromClipboard(e: React.ClipboardEvent): File[] {
  const out: File[] = [];
  const items = e.clipboardData?.items;
  if (!items) return out;
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (it.kind === 'file' && it.type.startsWith('image/')) {
      const f = it.getAsFile();
      if (f) out.push(f);
    }
  }
  return out;
}

export function extractImageFilesFromDrag(e: React.DragEvent): File[] {
  const out: File[] = [];
  const files = e.dataTransfer?.files;
  if (!files) return out;
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    if (f.type.startsWith('image/')) out.push(f);
  }
  return out;
}
