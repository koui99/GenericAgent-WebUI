import type { UploadedAttachment } from '@/lib/attachments';

export interface PendingAttachment {
  clientId: string;
  previewUrl: string;
  name: string;
  status: 'compressing' | 'uploading' | 'ready' | 'error';
  uploaded: UploadedAttachment | null;
  error: string | null;
}
