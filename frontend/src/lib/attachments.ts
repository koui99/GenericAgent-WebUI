import { api } from '@/lib/api';
import type { CompressResult } from '@/lib/image-compress';

export interface UploadedAttachment {
  id: string;
  media_type: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
  url: string;
  session_id: string | null;
  created_at: string | null;
}

export async function uploadAttachment(
  compressed: CompressResult,
  sessionId: string | null
): Promise<UploadedAttachment> {
  return api.post<UploadedAttachment>('/api/attachments', {
    media_type: compressed.mediaType,
    data: compressed.base64,
    session_id: sessionId,
  });
}
